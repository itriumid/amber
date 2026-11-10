import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { server } from '../sync/testing';

// Every problem the browser reports: script errors, and anything the security policy blocked.
function watchProblems(page: Page) {
	const problems: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(message.text());
	});
	page.on('pageerror', (error) => problems.push(error.message));
	return problems;
}

/**
 * The rules of WCAG 2.2 AA that axe breaks, by name. It waits for rows to finish sliding first:
 * axe measures targets as they are, mid-animation too.
 */
async function axeViolations(page: Page) {
	await page.waitForFunction(() => document.getAnimations().length === 0);
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	return results.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`
	);
}

test.afterEach(() => {
	expect(problems).toEqual([]);
});

async function addTask(page: Page, text: string) {
	await page.getByLabel('New task').fill(text);
	await page.getByLabel('New task').press('Enter');
}

/** A task's title, which opens its details. */
const task = (page: Page, title: string) =>
	page.getByRole('main').getByRole('button', { name: title, exact: true });

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768;

/** The sidebar: always there on a wide screen, behind "Show lists" on a phone. */
async function lists(page: Page) {
	if (isPhone(page)) await page.getByRole('button', { name: 'Show lists' }).click();
	return page.getByRole('navigation', { name: 'Lists' }).last();
}

// Every test fails on a script error or anything the security policy blocked, not only the ones
// that look for it.
let problems: string[] = [];
test.beforeEach(async ({ page }) => {
	problems = watchProblems(page);
	await page.goto('/');
	await expect(page.getByLabel('New task')).toBeEnabled();
});

test('adds tasks with tags, and keeps them after a reload', async ({ page }) => {
	await addTask(page, 'Buy oat milk #errands #weekend');
	await addTask(page, 'Call the bank');
	await expect(task(page, 'Buy oat milk')).toBeVisible();
	await expect(page.getByRole('main').getByText('#errands')).toBeVisible();
	await page.reload();
	await expect(task(page, 'Call the bank')).toBeVisible();
	const sidebar = await lists(page);
	await expect(sidebar.getByRole('button', { name: /^#weekend/ })).toBeVisible();
});

test('ticks a task done, tucks it away, and undoes it', async ({ page }) => {
	await addTask(page, 'Water the plants');
	await page.getByRole('checkbox', { name: 'Mark done: Water the plants' }).check();
	await expect(page.getByText('Done (1)')).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'Undo' })).toContainText(
		'Done: Water the plants'
	);
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(page.getByText('Undone: “Done: Water the plants”')).toBeVisible();
	await expect(page.getByText('Done (1)')).toHaveCount(0);
	await expect(
		page.getByRole('checkbox', { name: 'Mark done: Water the plants' })
	).not.toBeChecked();
});

test('moves a task with Alt and the arrow keys', async ({ page }) => {
	for (const title of ['First', 'Second', 'Third']) await addTask(page, title);
	await page.getByRole('checkbox', { name: 'Mark done: Third' }).focus();
	await page.keyboard.press('Alt+ArrowUp');
	await page.keyboard.press('Alt+ArrowUp');
	const titles = page.getByRole('main').locator('li button.block');
	await expect(titles).toHaveText([/Third/, /First/, /Second/]);
});

test('keeps done tasks in view, with their date, in a bucket-list category', async ({ page }) => {
	const sidebar = await lists(page);
	await sidebar.getByLabel('New category').fill('Bucket list');
	await sidebar.getByLabel('New category').press('Enter');
	await expect(page.getByRole('heading', { level: 1, name: 'Bucket list' })).toBeVisible();
	await page.getByRole('button', { name: 'Edit Bucket list' }).first().click();
	await page.getByRole('checkbox', { name: /Keep done tasks in view/ }).check();
	// The radio itself is visually hidden; people click its swatch.
	await page.locator('label', { has: page.getByRole('radio', { name: 'Teal' }) }).click();
	await expect(page.getByRole('radio', { name: 'Teal' })).toBeChecked();
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
	await addTask(page, 'See the northern lights');
	await page.getByRole('checkbox', { name: 'Mark done: See the northern lights' }).check();
	await expect(page.getByText(/^Done \w+ \d+, \d{4}$|^Done \d+ \w+ \d{4}$/)).toBeVisible();
	await expect(page.getByText('Done (1)')).toHaveCount(0);
});

test('adds steps to a task, and turns one into a task', async ({ page }) => {
	await addTask(page, 'Paint the bedroom');
	await task(page, 'Paint the bedroom').click();
	const details = page.getByRole('dialog', { name: 'Task details' });
	await details.getByLabel('New step').fill('Buy paint');
	await details.getByLabel('New step').press('Enter');
	await details.getByLabel('New step').fill('Move the bed');
	await details.getByLabel('New step').press('Enter');
	await details.getByRole('button', { name: 'Make a task of: Buy paint' }).click();
	await details.getByRole('button', { name: 'Close' }).click();
	await expect(task(page, 'Buy paint')).toBeVisible();
	await expect(page.getByText('0/1')).toBeVisible();
});

test('deletes a category but keeps its tasks', async ({ page }) => {
	const sidebar = await lists(page);
	await sidebar.getByLabel('New category').fill('Home');
	await sidebar.getByLabel('New category').press('Enter');
	await addTask(page, 'Fix the tap');
	await page.getByRole('button', { name: 'Edit Home' }).first().click();
	await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'All tasks' })).toBeVisible();
	await expect(task(page, 'Fix the tap')).toBeVisible();
});

test('has no accessibility problems axe can find, in a list, a search and a dialog', async ({
	page
}) => {
	await addTask(page, 'A task #with-tag');
	await page.getByRole('checkbox', { name: 'Mark done: A task' }).check();
	await addTask(page, 'Another task');
	expect(await axeViolations(page)).toEqual([]);
	await page.getByRole('searchbox', { name: 'Search tasks' }).fill('task');
	expect(await axeViolations(page)).toEqual([]);
	await page.getByRole('searchbox', { name: 'Search tasks' }).fill('');
	await task(page, 'Another task').click();
	await expect(page.getByRole('dialog', { name: 'Task details' })).toBeVisible();
	expect(await axeViolations(page)).toEqual([]);
});

/** Fields under 16px, which Safari on iOS zooms the page into when they're focused. */
const smallFields = (page: Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('input, textarea, select')]
			.filter((element) => element.checkVisibility() && !element.matches('.sr-only'))
			.filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16)
			.map((element) => element.id || element.outerHTML.slice(0, 80))
	);

test('keeps every field 16px or larger on a touch screen, so nothing zooms in', async ({
	page
}) => {
	test.skip(!isPhone(page), 'Only touch screens zoom.');
	expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe(
		'manipulation'
	);
	expect(await smallFields(page)).toEqual([]);
	await addTask(page, 'Pack for the trip');
	await task(page, 'Pack for the trip').click();
	await page.getByLabel('New step').fill('Passport');
	await page.getByLabel('New step').press('Enter');
	expect(await smallFields(page)).toEqual([]);
});

test('focuses quick add with N, and undoes with the keyboard', async ({ page }) => {
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('n');
	await expect(page.getByLabel('New task')).toBeFocused();
	await page.keyboard.type('Keyboard task');
	await page.keyboard.press('Enter');
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('ControlOrMeta+z');
	await expect(task(page, 'Keyboard task')).toHaveCount(0);
});

test('searches words, tags and status, and marks what it found', async ({ page }) => {
	await addTask(page, 'Try the new Café #weekend');
	await addTask(page, 'Call the bank');
	await page.getByRole('checkbox', { name: 'Mark done: Call the bank' }).check();
	await addTask(page, 'Paint the bedroom #weekend');

	const search = page.getByRole('searchbox', { name: 'Search tasks' });
	await search.fill('cafe');
	await expect(page.getByRole('status').filter({ hasText: 'found' })).toHaveText('1 task found');
	await expect(task(page, 'Try the new Café')).toBeVisible();
	await expect(page.getByRole('main').locator('mark')).toHaveText('Café');
	await expect(page.getByLabel('New task')).toHaveCount(0);

	await search.fill('#weekend');
	await expect(page.getByRole('status').filter({ hasText: 'found' })).toHaveText('2 tasks found');

	await search.fill('the');
	await page
		.locator('label', { hasText: 'Done' })
		.filter({ has: page.getByRole('radio') })
		.click();
	await expect(page.getByRole('radio', { name: 'Done' })).toBeChecked();
	await expect(task(page, 'Call the bank')).toBeVisible();
	await expect(task(page, 'Paint the bedroom')).toHaveCount(0);

	await search.fill('nothing like this');
	await expect(page.getByText('No done tasks match “nothing like this”.')).toBeVisible();

	await page.getByRole('button', { name: 'Clear search' }).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await search.fill('again');
	await search.press('Escape');
	await expect(search).toHaveValue('');
	await expect(page.getByLabel('New task')).toBeVisible();
});

test('offers matches outside the current place', async ({ page }) => {
	await addTask(page, 'Renew passport');
	const sidebar = await lists(page);
	await sidebar.getByLabel('New category').fill('Home');
	await sidebar.getByLabel('New category').press('Enter');
	await addTask(page, 'Renew the lease');
	await page.getByRole('searchbox', { name: 'Search tasks' }).fill('renew');
	await expect(page.getByRole('status').filter({ hasText: 'found' })).toHaveText('1 task found');
	await page.getByRole('button', { name: '1 more in all tasks' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'All tasks' })).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'found' })).toHaveText('2 tasks found');
});

test('focuses search with the slash key', async ({ page }) => {
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('/');
	await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toBeFocused();
});

/** The "Back up and move" sheet, from the sidebar. */
async function backup(page: Page) {
	const sidebar = await lists(page);
	await sidebar.page().getByRole('button', { name: 'Back up and move' }).last().click();
	return page.getByRole('dialog', { name: 'Back up and move' });
}

test('moves a list to another device with a file, and the move can be undone', async ({
	page,
	browser
}) => {
	await addTask(page, 'Climb Rinjani #travel');
	await addTask(page, 'Renew passport');
	const sheet = await backup(page);
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		sheet.getByRole('button', { name: 'Download a file' }).click()
	]);
	expect(download.suggestedFilename()).toMatch(/^amber-\d{4}-\d{2}-\d{2}\.json$/);
	const file = await download.path();

	const other = await (await browser.newContext()).newPage();
	const otherProblems = watchProblems(other);
	await other.goto('/');
	await expect(other.getByLabel('New task')).toBeEnabled();
	await addTask(other, 'Already here');
	const otherSheet = await backup(other);
	await otherSheet.getByLabel('Open a file').setInputFiles(file);
	const bringIn = other.getByRole('dialog', { name: 'Bring in a list' });
	await expect(bringIn.getByText('Adds 2 tasks and 1 tag.')).toBeVisible();
	await bringIn.getByRole('button', { name: 'Bring it in' }).click();
	await expect(task(other, 'Climb Rinjani')).toBeVisible();
	await expect(task(other, 'Already here')).toBeVisible();

	await other.getByRole('button', { name: 'Undo' }).click();
	await expect(task(other, 'Climb Rinjani')).toHaveCount(0);
	await expect(task(other, 'Already here')).toBeVisible();
	expect(otherProblems).toEqual([]);
	await other.context().close();
});

test('moves a list with a link locked by a passphrase', async ({ page, browser }) => {
	await addTask(page, 'Secret plan');
	const sheet = await backup(page);
	await sheet.getByLabel(/Passphrase/).fill('kopi susu');
	await sheet.getByRole('button', { name: 'Make a link' }).click();
	const link = await sheet.getByLabel('Link to the list').inputValue();
	expect(link).toContain('#locked=');
	expect(link).not.toContain('Secret');

	const other = await (await browser.newContext()).newPage();
	const otherProblems = watchProblems(other);
	await other.goto(link);
	const bringIn = other.getByRole('dialog', { name: 'Bring in a list' });
	await expect(bringIn.getByText('This list is locked with a passphrase.')).toBeVisible();
	expect(new URL(other.url()).hash).toBe('');
	await bringIn.getByLabel('Passphrase').fill('kopi');
	await bringIn.getByRole('button', { name: 'Unlock' }).click();
	await expect(bringIn.getByRole('alert')).toContainText("doesn't open it");
	await bringIn.getByLabel('Passphrase').fill('kopi susu');
	await bringIn.getByRole('button', { name: 'Unlock' }).click();
	await expect(bringIn.getByText('Adds 1 task.')).toBeVisible();
	await bringIn.getByRole('button', { name: 'Bring it in' }).click();
	await expect(task(other, 'Secret plan')).toBeVisible();
	expect(otherProblems).toEqual([]);
	await other.context().close();
});

test('puts back a copy kept before bringing in a list', async ({ page }) => {
	await addTask(page, 'Mine');
	const file = JSON.stringify({ amber: 1, format: 1, exportedAt: '', records: [] });
	// An empty list changes nothing, so it's said, and nothing is kept or merged.
	let sheet = await backup(page);
	await sheet.getByLabel('Open a file').setInputFiles({
		name: 'empty.json',
		mimeType: 'application/json',
		buffer: Buffer.from(file)
	});
	const bringIn = page.getByRole('dialog', { name: 'Bring in a list' });
	await expect(bringIn.getByText('You already have everything in it.')).toBeVisible();
	await bringIn.getByRole('button', { name: 'Close' }).last().click();

	// A real one: a list from another device.
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		(await backup(page)).getByRole('button', { name: 'Download a file' }).click()
	]);
	const mine = await download.path();
	await page
		.getByRole('dialog', { name: 'Back up and move' })
		.getByRole('button', { name: 'Close' })
		.click();
	// The same browser, emptied: as if the file were opened on a phone with a list of its own. It's
	// emptied from a page of the site without Amber on it: an open Amber writes its list back.
	await page.goto('/robots.txt');
	await page.evaluate(
		() =>
			new Promise((resolve, reject) => {
				const deleting = indexedDB.deleteDatabase('amber');
				deleting.onsuccess = resolve;
				deleting.onerror = () => reject(deleting.error);
			})
	);
	await page.goto('/');
	await addTask(page, 'From the phone');
	sheet = await backup(page);
	await sheet.getByLabel('Open a file').setInputFiles(mine);
	await bringIn.getByRole('button', { name: 'Bring it in' }).click();
	await expect(task(page, 'Mine')).toBeVisible();

	sheet = await backup(page);
	await expect(sheet.getByText('Before bringing in a list · 1 task')).toBeVisible();
	await sheet
		.getByRole('button', { name: /Put back the copy/ })
		.first()
		.click();
	await expect(sheet.getByText('Deletes 1 task.')).toBeVisible();
	await sheet.getByRole('button', { name: 'Put it back' }).click();
	await expect(task(page, 'Mine')).toHaveCount(0);
	await expect(task(page, 'From the phone')).toBeVisible();
});

test('has no accessibility problems axe can find in the backup sheet', async ({ page }) => {
	await addTask(page, 'A task');
	await backup(page);
	expect(await axeViolations(page)).toEqual([]);
});

test('opens and keeps working with no connection, once it has been opened', async ({
	page,
	context
}) => {
	await page.evaluate(() => navigator.serviceWorker.ready);
	// The first visit installs the worker; from the next one, it serves Amber.
	await page.reload();
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByLabel('New task')).toBeEnabled();
	await addTask(page, 'Written offline');
	await page.reload();
	await expect(task(page, 'Written offline')).toBeVisible();
	await context.setOffline(false);
});

test('brings in a list from a pasted link', async ({ page, browser }) => {
	await addTask(page, 'From Safari');
	let sheet = await backup(page);
	await sheet.getByRole('button', { name: 'Make a link' }).click();
	const link = await sheet.getByLabel('Link to the list').inputValue();

	const other = await (await browser.newContext()).newPage();
	const otherProblems = watchProblems(other);
	await other.goto('/');
	await expect(other.getByLabel('New task')).toBeEnabled();
	sheet = await backup(other);
	await sheet.getByLabel('Or paste a link').fill('not a link');
	await sheet.getByRole('button', { name: 'Open', exact: true }).click();
	await expect(sheet.getByRole('alert')).toHaveText("That isn't a link to a list from Amber.");
	await sheet.getByLabel('Or paste a link').fill(`Here it is: ${link} `);
	await sheet.getByRole('button', { name: 'Open', exact: true }).click();
	const bringIn = other.getByRole('dialog', { name: 'Bring in a list' });
	await bringIn.getByRole('button', { name: 'Bring it in' }).click();
	await expect(task(other, 'From Safari')).toBeVisible();
	expect(otherProblems).toEqual([]);
	await other.context().close();
});

test('shows how to install in Safari on an iPhone, and how to bring the list along', async ({
	browser
}) => {
	const phone = await (
		await browser.newContext({
			userAgent:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
			viewport: { width: 390, height: 844 },
			hasTouch: true,
			isMobile: true
		})
	).newPage();
	await phone.goto('/');
	await expect(phone.getByLabel('New task')).toBeEnabled();
	await phone.getByRole('button', { name: 'Show lists' }).click();
	await phone.getByRole('button', { name: 'Install Amber' }).click();
	const steps = phone.getByRole('dialog', { name: 'Install Amber' });
	await expect(steps.getByText('Add to Home Screen')).toBeVisible();
	await steps.getByRole('button', { name: 'Back up and move' }).click();
	await expect(phone.getByRole('dialog', { name: 'Back up and move' })).toBeVisible();
	await phone.context().close();
});

test('keeps focus nearby when a ticked task moves away, and after deleting one', async ({
	page
}) => {
	for (const title of ['First', 'Second', 'Third']) await addTask(page, title);
	const second = page.getByRole('checkbox', { name: 'Mark done: Second' });
	await second.focus();
	await page.keyboard.press('Space');
	// Second tucks away into Done; focus lands on the task that took its place.
	await expect(page.getByRole('checkbox', { name: 'Mark done: Third' })).toBeFocused();

	// Unticked from Done, the task comes back into the list, and focus goes with it.
	await page.getByText('Done (1)').click();
	await page.getByRole('checkbox', { name: 'Mark not done: Second' }).focus();
	await page.keyboard.press('Space');
	await expect(page.getByRole('checkbox', { name: 'Mark done: Second' })).toBeFocused();

	// Deleting from the details: the title that opened them is gone, so focus goes to quick add.
	await task(page, 'First').focus();
	await page.keyboard.press('Enter');
	const details = page.getByRole('dialog', { name: 'Task details' });
	await details.getByRole('button', { name: 'Delete task' }).click();
	await expect(page.getByLabel('New task')).toBeFocused();
});

test('outlines the control in focus, but not the whole list when focus falls back to it', async ({
	page
}) => {
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus-visible')).toHaveCSS('outline-style', 'solid');
	// Where focus goes when there's no quick add to land on. After a key press, browsers show
	// focus moved by a script, so only the page's own rule keeps the line off.
	await page.evaluate(() => document.getElementById('main')?.focus());
	await expect(page.getByRole('main')).toBeFocused();
	await expect(page.getByRole('main')).toHaveCSS('outline-style', 'none');
});

test('names counts and steps the way they should be heard', async ({ page }) => {
	await addTask(page, 'Paint the bedroom');
	const sidebar = await lists(page);
	await expect(sidebar.getByRole('button', { name: 'All tasks 1 to do' })).toBeVisible();
	if (isPhone(page)) await page.keyboard.press('Escape');
	await task(page, 'Paint the bedroom').click();
	const details = page.getByRole('dialog', { name: 'Task details' });
	await details.getByLabel('New step').fill('Buy rollers');
	await details.getByLabel('New step').press('Enter');
	await details.getByRole('button', { name: 'Close' }).click();
	await expect(page.getByRole('main').getByText('0 of 1 steps done')).toBeAttached();
	await expect(task(page, 'Paint the bedroom')).toHaveAccessibleDescription(
		"Opens the task's details."
	);
});

test('moves nothing when reduced motion is asked for', async ({ browser }) => {
	const page = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
	await page.goto('/');
	await expect(page.getByLabel('New task')).toBeEnabled();
	const running = () =>
		page.evaluate(() =>
			document
				.getAnimations()
				.filter((animation) => {
					const timing = animation.effect?.getComputedTiming();
					return Number(timing?.duration ?? 0) > 0;
				})
				.map((animation) => (animation as CSSTransition).transitionProperty ?? animation.id)
		);
	await addTask(page, 'Calm task');
	expect(await running()).toEqual([]);
	// A click, not check(): without animation the row leaves at once, before check() can confirm.
	await page.getByRole('checkbox', { name: 'Mark done: Calm task' }).click();
	await expect(page.getByText('Done (1)')).toBeVisible();
	expect(await running()).toEqual([]);
	await page.getByText('Done (1)').click();
	expect(await running()).toEqual([]);
	await page.context().close();
});

/** Sync's mailboxes, kept in memory with the real rules, shared by every device in a test. */
async function mailboxes(...contexts: BrowserContext[]) {
	const answer = server();
	for (const context of contexts)
		await context.route('**/api/mailboxes/**', async (route) => {
			const request = route.request();
			const body = request.postDataBuffer();
			const response = await answer(
				new Request(request.url(), {
					method: request.method(),
					body: body ? new Uint8Array(body) : undefined
				})
			);
			await route.fulfill({
				status: response.status,
				headers: Object.fromEntries(response.headers),
				body: Buffer.from(await response.arrayBuffer())
			});
		});
}

async function syncSheet(page: Page) {
	const sidebar = await lists(page);
	await sidebar.page().getByRole('button', { name: 'Sync with another device' }).last().click();
	return page.getByRole('dialog', { name: 'Sync with another device' });
}

test('syncs two devices with a code, both ways', async ({ page, context, browser }) => {
	const phoneContext = await browser.newContext();
	await mailboxes(context, phoneContext);
	await addTask(page, 'Book the flights');
	const laptopSheet = await syncSheet(page);
	await laptopSheet.getByRole('button', { name: 'Get a code' }).click();
	const code = await laptopSheet
		.getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
		.textContent();
	expect(await axeViolations(page)).toEqual([]);

	const phone = await phoneContext.newPage();
	const phoneProblems = watchProblems(phone);
	await phone.goto('/');
	await expect(phone.getByLabel('New task')).toBeEnabled();
	await addTask(phone, 'Buy sunscreen');
	const phoneSheet = await syncSheet(phone);
	await phoneSheet.getByLabel('Code from the other device').fill('not a code');
	await phoneSheet.getByRole('button', { name: 'Sync' }).click();
	await expect(phoneSheet.getByRole('alert')).toContainText('16 letters and numbers');
	// Typed the way people do: lowercase, with spaces.
	await phoneSheet
		.getByLabel('Code from the other device')
		.fill(code!.toLowerCase().replace(/-/g, ' '));
	await phoneSheet.getByRole('button', { name: 'Sync' }).click();
	await expect(phoneSheet.getByText('Done. The other device finishes in a moment.')).toBeVisible();
	await expect(phoneSheet.getByText('On this device: Adds 1 task. You can undo it.')).toBeVisible();

	await expect(laptopSheet.getByText('Both devices have the same list now.')).toBeVisible();
	await expect(
		laptopSheet.getByText('On this device: Adds 1 task. You can undo it.')
	).toBeVisible();
	await laptopSheet.getByRole('button', { name: 'Close', exact: true }).last().click();
	await expect(task(page, 'Buy sunscreen')).toBeVisible();
	await phoneSheet.getByRole('button', { name: 'Close', exact: true }).last().click();
	await expect(task(phone, 'Book the flights')).toBeVisible();
	expect(phoneProblems).toEqual([]);
	await phoneContext.close();
});

test('joins a sync from a shared link, and a used code says so', async ({
	page,
	context,
	browser
}) => {
	// A share sheet that keeps what it was given, where the browser has none.
	await page.addInitScript(() => {
		const shared: ShareData[] = [];
		Object.assign(window, { shared });
		navigator.canShare = () => true;
		navigator.share = async (data) => void shared.push(data!);
	});
	await page.reload();
	const phoneContext = await browser.newContext();
	await mailboxes(context, phoneContext);
	await addTask(page, 'Renew the passport');
	const laptopSheet = await syncSheet(page);
	await laptopSheet.getByRole('button', { name: 'Get a code' }).click();
	const code = (await laptopSheet.getByText(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/).textContent())!;
	await laptopSheet.getByRole('button', { name: 'Share a link' }).click();
	const link = await page.evaluate(
		() => (window as unknown as { shared: ShareData[] }).shared[0]?.url
	);
	expect(link).toMatch(new RegExp(`/#sync=${code.replace(/-/g, '')}$`));

	const phone = await phoneContext.newPage();
	const phoneProblems = watchProblems(phone);
	await phone.goto(new URL(link!).pathname + new URL(link!).hash);
	const phoneSheet = phone.getByRole('dialog', { name: 'Sync with another device' });
	await expect(phoneSheet.getByText('Done. The other device finishes in a moment.')).toBeVisible();
	expect(new URL(phone.url()).hash).toBe('');
	await expect(laptopSheet.getByText('Both devices have the same list now.')).toBeVisible();
	await expect(laptopSheet.getByText('Nothing changed on this device.')).toBeVisible();

	await phone.goto(`/#sync=${code}`);
	await expect(phoneSheet.getByRole('alert')).toContainText("That code isn't open anymore.");
	// The mailbox answering 404 for a used code is expected; Chrome logs every 404 regardless.
	expect(phoneProblems).toEqual([
		'Failed to load resource: the server responded with a status of 404 (Not Found)'
	]);
	await phoneContext.close();
});

/** The message after an action, with Undo: the last live region on the page. */
const notice = (page: Page) => page.getByRole('status').last();

/** Renames a task in its details, the way someone would. */
async function rename(page: Page, from: string, to: string) {
	await task(page, from).click();
	const details = page.getByRole('dialog');
	await details.getByLabel('Task', { exact: true }).fill(to);
	await details.getByLabel('Task', { exact: true }).press('Tab');
	await page.keyboard.press('Escape');
	await expect(details).toHaveCount(0);
}

test('keeps changes made in two tabs, and shows each tab what the other did', async ({
	page,
	context
}) => {
	await addTask(page, 'Shared task');
	const other = await context.newPage();
	const otherProblems = watchProblems(other);
	await other.goto('/');
	await expect(task(other, 'Shared task')).toBeVisible();

	// A rename in one tab shows in the other, without a reload.
	await rename(page, 'Shared task', 'Renamed in the first tab');
	await expect(task(other, 'Renamed in the first tab')).toBeVisible();

	// A tab that's behind (here, storage changed under it) doesn't write over what it hasn't seen:
	// ticking the task keeps the newer title.
	await other.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('amber');
				open.onsuccess = () => {
					const transaction = open.result.transaction('records', 'readwrite');
					const store = transaction.objectStore('records');
					const cursor = store.openCursor();
					cursor.onsuccess = () => {
						const found = cursor.result;
						if (!found) return;
						const record = found.value;
						if (record.kind === 'task') {
							const [time, counter, device] = record.fields.title.stamp.split('.');
							const later = (parseInt(time, 36) + 1).toString(36).padStart(9, '0');
							record.fields.title = {
								value: 'Renamed behind its back',
								stamp: `${later}.${counter}.${device}`
							};
							found.update(record);
						}
						found.continue();
					};
					transaction.oncomplete = () => {
						open.result.close();
						resolve();
					};
					transaction.onerror = () => reject(transaction.error);
				};
				open.onerror = () => reject(open.error);
			})
	);
	await other.getByRole('checkbox', { name: 'Mark done: Renamed in the first tab' }).check();
	// The tab that saved takes in what storage held, and the first tab hears about both.
	for (const tab of [page, other]) {
		await expect(tab.getByText('Done (1)')).toBeVisible();
		await tab.getByText('Done (1)').click();
		await expect(task(tab, 'Renamed behind its back')).toBeVisible();
	}

	await page.reload();
	await page.getByText('Done (1)').click();
	await expect(task(page, 'Renamed behind its back')).toBeVisible();
	await expect(
		page.getByRole('checkbox', { name: 'Mark not done: Renamed behind its back' })
	).toBeChecked();
	expect(otherProblems).toEqual([]);
	await other.close();
});

test('writes the list back when the browser clears its storage while it is open', async ({
	page,
	context
}) => {
	await addTask(page, 'Before the clearing');
	await expect(notice(page)).toContainText('Task added');
	const session = await context.newCDPSession(page);
	await session.send('Storage.clearDataForOrigin', {
		origin: new URL(page.url()).origin,
		storageTypes: 'indexeddb'
	});
	await addTask(page, 'After the clearing');
	await expect(task(page, 'After the clearing')).toBeVisible();
	await expect(notice(page)).toContainText('Task added');
	await expect(page.getByRole('alert')).toHaveCount(0);

	await page.reload();
	await expect(task(page, 'Before the clearing')).toBeVisible();
	await expect(task(page, 'After the clearing')).toBeVisible();
});

test('says plainly when the list can’t be saved, and offers a copy instead', async ({
	page,
	context
}) => {
	await addTask(page, 'Before the clearing');
	await expect(notice(page)).toContainText('Task added');
	await notice(page).getByRole('button', { name: 'Dismiss' }).click();
	await expect(notice(page)).toBeEmpty();
	// Storage goes, and this browser won't open it again.
	await page.evaluate(() => {
		IDBFactory.prototype.open = () => {
			throw new DOMException('Opening is turned off for this test.', 'UnknownError');
		};
	});
	const session = await context.newCDPSession(page);
	await session.send('Storage.clearDataForOrigin', {
		origin: new URL(page.url()).origin,
		storageTypes: 'indexeddb'
	});
	await addTask(page, 'After the clearing');
	await expect(task(page, 'After the clearing')).toBeVisible();
	await expect(page.getByRole('alert')).toHaveText(
		"This browser stopped letting Amber save your list, so your latest changes aren't kept here. Download a copy to keep them safe."
	);
	// Nothing claims it was saved.
	await expect(notice(page)).toBeEmpty();

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download a copy' }).click()
	]);
	const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
	const titles = file.records
		.filter((record: { kind: string }) => record.kind === 'task')
		.map((record: { fields: { title: { value: string } } }) => record.fields.title.value);
	expect(titles.sort()).toEqual(['After the clearing', 'Before the clearing']);
});

test('lists the keyboard shortcuts, and turns the single-key ones off', async ({ page }) => {
	const quickAdd = page.getByLabel('New task');
	const search = page.getByRole('searchbox', { name: 'Search tasks' });
	await expect(quickAdd).toHaveAttribute('aria-keyshortcuts', 'N');
	await expect(search).toHaveAttribute('aria-keyshortcuts', '/');

	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('?');
	const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
	await expect(sheet.getByText('Move a task up or down')).toBeVisible();
	await expect(sheet.getByText('Alt with the up or down arrow')).toBeAttached();
	expect(await axeViolations(page)).toEqual([]);
	await sheet.getByRole('checkbox', { name: 'Single-key shortcuts' }).uncheck();
	await sheet.getByRole('button', { name: 'Close' }).click();
	await expect(quickAdd).not.toHaveAttribute('aria-keyshortcuts');

	// Off stays off after a reload, and none of the single keys does anything.
	await page.reload();
	await expect(quickAdd).toBeEnabled();
	await expect(quickAdd).not.toHaveAttribute('aria-keyshortcuts');
	await expect(search).not.toHaveAttribute('aria-keyshortcuts');
	await page.getByRole('heading', { level: 1 }).click();
	for (const key of ['n', 'N', '/', '?']) await page.keyboard.press(key);
	await expect(quickAdd).not.toBeFocused();
	await expect(search).not.toBeFocused();
	await expect(sheet).toHaveCount(0);

	// The sheet is in the sidebar too, where they're turned back on.
	const sidebar = await lists(page);
	await sidebar.page().getByRole('button', { name: 'Keyboard shortcuts' }).last().click();
	const setting = sheet.getByRole('checkbox', { name: 'Single-key shortcuts' });
	await expect(setting).not.toBeChecked();
	await setting.check();
	await sheet.getByRole('button', { name: 'Close' }).click();
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('n');
	await expect(quickAdd).toBeFocused();
});

test('keeps a search when N is pressed, and says how to add a task', async ({ page }) => {
	await addTask(page, 'Find the charger');
	const search = page.getByRole('searchbox', { name: 'Search tasks' });
	await search.fill('charger');
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('n');
	await expect(search).toHaveValue('charger');
	await expect(search).toBeFocused();
	await expect(notice(page)).toContainText('Clear the search to add a task');
	await expect(task(page, 'Find the charger')).toBeVisible();
});

test('says plainly when storage won’t open, without the browser’s own words', async ({
	browser
}) => {
	const context = await browser.newContext();
	await context.addInitScript(() => {
		IDBFactory.prototype.open = () => {
			throw new DOMException('Opening is turned off for this test.', 'UnknownError');
		};
	});
	const other = await context.newPage();
	const otherProblems = watchProblems(other);
	await other.goto('/');
	await expect(other.getByRole('alert')).toHaveText(
		"Amber couldn't open its storage in this browser, so your list can't be shown or saved. Reload to try again, or check that this site is allowed to keep data."
	);
	expect(otherProblems).toEqual([]);
	await context.close();
});

/** What this browser noted about downloading copies, as stored. */
const storedNote = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<{ since: number; downloadedAt: number | null } | undefined>((resolve, reject) => {
				const opening = indexedDB.open('amber');
				opening.onerror = () => reject(opening.error);
				opening.onsuccess = () => {
					const database = opening.result;
					const reading = database
						.transaction('details', 'readonly')
						.objectStore('details')
						.get('backups');
					reading.onsuccess = () => {
						database.close();
						resolve(reading.result);
					};
					reading.onerror = () => reject(reading.error);
				};
			})
	);

/** Notes the last download, or the first visit, as 31 days ago: long enough for a reminder. */
async function longAgo(page: Page, downloaded: boolean) {
	await expect.poll(() => storedNote(page)).toBeTruthy();
	await page.evaluate(
		(downloaded) =>
			new Promise<void>((resolve, reject) => {
				const opening = indexedDB.open('amber');
				opening.onerror = () => reject(opening.error);
				opening.onsuccess = () => {
					const database = opening.result;
					const writing = database.transaction('details', 'readwrite');
					const since = Date.now() - 31 * 24 * 60 * 60 * 1000;
					writing
						.objectStore('details')
						.put({ downloadedAt: downloaded ? since : null, since, tasks: 1 }, 'backups');
					writing.oncomplete = () => {
						database.close();
						resolve();
					};
					writing.onerror = () => reject(writing.error);
				};
			}),
		downloaded
	);
	await page.reload();
	await expect(page.getByLabel('New task')).toBeEnabled();
}

test('says the copies on this device go with its data, and when a copy was last downloaded', async ({
	page
}) => {
	await addTask(page, 'Keep me');
	let sheet = await backup(page);
	await expect(sheet.getByText(/If its data is cleared, they go too/)).toBeVisible();
	await expect(sheet.getByText('Not downloaded from this browser yet.')).toBeVisible();
	await Promise.all([
		page.waitForEvent('download'),
		sheet.getByRole('button', { name: 'Download a file' }).click()
	]);
	await expect(sheet.getByText(/^Last downloaded /)).toBeVisible();
	await page.reload();
	await expect(page.getByLabel('New task')).toBeEnabled();
	sheet = await backup(page);
	await expect(sheet.getByText(/^Last downloaded /)).toBeVisible();
});

test('reminds now and then to download a copy, and can be put off', async ({ page }) => {
	await addTask(page, 'An old task');
	// A new list isn't reminded about.
	await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0);

	await longAgo(page, false);
	const never = page.getByText("You haven't downloaded a copy of your list yet.", {
		exact: false
	});
	await expect(never).toBeVisible();
	expect(await axeViolations(page)).toEqual([]);
	await page.getByRole('button', { name: 'Not now' }).click();
	await expect(never).toHaveCount(0);
	await expect(page.getByLabel('New task')).toBeFocused();
	await expect
		.poll(async () => (await storedNote(page))?.since)
		.toBeGreaterThan(Date.now() - 60_000);
	await page.reload();
	await expect(task(page, 'An old task')).toBeVisible();
	await expect(never).toHaveCount(0);

	await longAgo(page, true);
	const since = page.getByText(/^Your last downloaded copy is from /);
	await expect(since).toBeVisible();
	await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download a copy' }).click()
	]);
	await expect(since).toHaveCount(0);
	await expect
		.poll(async () => (await storedNote(page))?.downloadedAt)
		.toBeGreaterThan(Date.now() - 60_000);
});

/**
 * Every control in view (in the open dialog, if there is one): where a finger can hit it, which
 * counts the invisible layer that widens it on a touch screen, and the label around a checkbox or
 * radio. Links and buttons inside a sentence count too: the guidelines would excuse them, but a
 * finger needs the room just as much. Each control is also tapped at its center and near the
 * middle of each edge, by asking the browser what's there: anything else on top would show up.
 */
const targets = (page: Page) =>
	page.evaluate(() => {
		const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
		const scope: ParentNode = dialog ?? document;
		if (dialog) dialog.scrollTop = 0;
		else window.scrollTo({ top: 0, behavior: 'instant' });
		const hitBox = (
			element: Element
		): { left: number; top: number; right: number; bottom: number } => {
			const box = element.getBoundingClientRect();
			let { left, top, right, bottom } = box;
			const after = getComputedStyle(element, '::after');
			if (after.content !== 'none' && after.position === 'absolute') {
				const [width, height] = [parseFloat(after.width), parseFloat(after.height)];
				const [x, y] = [(left + right) / 2, (top + bottom) / 2];
				left = Math.min(left, x - width / 2);
				right = Math.max(right, x + width / 2);
				top = Math.min(top, y - height / 2);
				bottom = Math.max(bottom, y + height / 2);
			}
			// A button inside a field (Clear search) takes that end of it.
			if (element.matches('input')) {
				const inside = element.parentElement?.querySelector('button');
				if (inside) right = Math.min(right, hitBox(inside).left);
			}
			return { left, top, right, bottom };
		};
		const found = [
			...scope.querySelectorAll(
				'button, a[href], summary, select, textarea, input:not([type="checkbox"], [type="radio"], [type="file"], [type="hidden"]), label:has(input[type="checkbox"], input[type="radio"], input[type="file"])'
			)
		].filter(
			(element) =>
				(element as HTMLElement).checkVisibility() &&
				!element.matches('.sr-only') &&
				// Above the page until focused: the link that skips to the list.
				element.getBoundingClientRect().bottom > 0
		);
		const boxes = found.map(hitBox);
		return found.map((element, index) => {
			const name =
				element.getAttribute('aria-label') ??
				(element as HTMLInputElement).labels?.[0]?.textContent?.trim() ??
				element.querySelector('input')?.getAttribute('aria-label') ??
				element.textContent?.trim().replace(/\s+/g, ' ');
			// Instant: with smooth scrolling the page would still be moving when the points are read.
			element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
			const { left, top, right, bottom } = hitBox(element);
			const [x, y] = [(left + right) / 2, (top + bottom) / 2];
			const points: [number, number][] = [
				[x, y],
				[left + 2, y],
				[right - 2, y],
				[x, top + 2],
				[x, bottom - 2]
			];
			// What a finger lands on instead, for each point that misses, so a failure says why.
			const misses = points.flatMap(([pointX, pointY]) => {
				const hit = document.elementFromPoint(pointX, pointY);
				if (hit && element.contains(hit)) return [];
				const where = `${Math.round(pointX)},${Math.round(pointY)}`;
				if (!hit) return [`nothing at ${where}`];
				const label = hit.getAttribute('aria-label') ?? hit.textContent?.trim().slice(0, 30);
				return [`${hit.tagName.toLowerCase()} "${label}" at ${where}`];
			});
			return { name, missed: misses.length, misses, ...boxes[index] };
		});
	});

type Target = Awaited<ReturnType<typeof targets>>[number];

function expectRoomy(found: Target[]) {
	expect(found.length).toBeGreaterThan(0);
	for (const target of found) {
		expect(target.right - target.left, `${target.name}, wide`).toBeGreaterThanOrEqual(44);
		expect(target.bottom - target.top, `${target.name}, high`).toBeGreaterThanOrEqual(44);
		expect(target.misses, `${target.name}, covered or out of reach`).toEqual([]);
	}
	for (const [index, one] of found.entries())
		for (const other of found.slice(index + 1)) {
			const width = Math.min(one.right, other.right) - Math.max(one.left, other.left);
			const height = Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top);
			expect(width > 0.5 && height > 0.5, `${one.name} overlaps ${other.name}`).toBe(false);
		}
}

/**
 * Checks every control in view, after any sliding has finished, that these are among them, and that
 * none is pushed off the side.
 */
async function expectTargets(page: Page, names: string[]) {
	await page.waitForFunction(() => document.getAnimations().length === 0);
	// Nothing is pushed off the side, where it would need scrolling sideways to reach.
	const sideways = await page.evaluate(() => {
		const scope = document.querySelector('dialog[open]') ?? document.documentElement;
		return scope.scrollWidth - scope.clientWidth;
	});
	expect(sideways, 'scrolls sideways').toBeLessThanOrEqual(0);
	const found = await targets(page);
	expect(found.map((target) => target.name)).toEqual(expect.arrayContaining(names));
	expectRoomy(found);
}

test('gives every control a 44px target on a touch screen, without overlapping', async ({
	page
}) => {
	test.skip(!isPhone(page), 'Only touch screens need the larger targets.');
	await addTask(page, 'First');
	await addTask(page, 'Second');
	await addTask(page, 'Finished');
	await page.getByRole('checkbox', { name: 'Mark done: Finished' }).click();
	await expect(notice(page).getByRole('button', { name: 'Undo' })).toBeVisible();
	await expectTargets(page, [
		'Show lists',
		'Search tasks',
		'New task',
		'Mark done: First',
		'First',
		'Move up: Second',
		'Done (1)',
		'Undo',
		'Dismiss'
	]);
	await notice(page).getByRole('button', { name: 'Dismiss' }).click();

	// The lists, with a category and a tag to edit.
	await addTask(page, 'Tagged #weekend');
	await page.getByRole('button', { name: 'Show lists' }).click();
	const sheet = page.getByRole('dialog', { name: 'Lists' });
	await sheet.getByLabel('New category').fill('Home');
	await expectTargets(page, [
		'Close',
		'New category',
		'Edit #weekend',
		'Add category',
		'Back up and move',
		'Keyboard shortcuts'
	]);
	await sheet.getByLabel('New category').press('Enter');
	await page.getByRole('button', { name: 'Show lists' }).click();
	await expectTargets(page, ['Edit Home']);
	await sheet.getByRole('button', { name: 'Close' }).click();

	// A category, its editor, and a search that finds more elsewhere.
	await addTask(page, 'Home task');
	await expectTargets(page, ['Edit Home', 'Mark done: Home task']);
	await page.getByRole('button', { name: 'Edit Home' }).click();
	await expectTargets(page, ['Close', 'Teal', '– No color', 'Delete']);
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
	await page.getByRole('searchbox', { name: 'Search tasks' }).fill('second');
	await expectTargets(page, ['Clear search', 'Any', 'Done', '1 more in all tasks']);
	await page.getByRole('button', { name: 'Clear search' }).click();

	// A task's details, with a tag and a step.
	await task(page, 'Home task').click();
	const details = page.getByRole('dialog', { name: 'Task details' });
	await details.getByLabel('New step').fill('A step');
	await details.getByLabel('New step').press('Enter');
	await expectTargets(page, [
		'Done',
		'#weekend',
		'Mark done: A step',
		'Move up: A step',
		'Move down: A step',
		'Make a task of: A step',
		'Delete step: A step'
	]);
	await details.getByRole('button', { name: 'Close' }).click();

	// The other sheets.
	await expect(await backup(page)).toBeVisible();
	await expectTargets(page, ['Download a file', 'Make a link', 'Open a file']);
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('?');
	await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
	await expectTargets(page, ['Single-key shortcuts']);
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

	// A tap beside the circle, not on it, still ticks the box.
	await page.getByRole('searchbox', { name: 'Search tasks' }).fill('Home task');
	await page.waitForFunction(() => document.getAnimations().length === 0);
	const box = (await page.locator('main [data-task] label').first().boundingBox())!;
	await page.touchscreen.tap(box.x + 3, box.y + 3);
	await expect(page.getByRole('checkbox', { name: 'Mark not done: Home task' })).toBeChecked();
});

test('edges the pink Add button, and shows the row under the pointer, in light mode', async ({
	page
}) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await addTask(page, 'Hover over me');
	await page.getByLabel('New task').fill('Another');
	const add = page.getByRole('button', { name: 'Add', exact: true });
	expect(await add.evaluate((element) => getComputedStyle(element).borderTopColor)).toBe(
		'rgb(196, 100, 117)'
	);
	// Touch screens have no pointer to hover with.
	if (isPhone(page)) return;
	const row = page.locator('main [data-task]').first();
	const edge = () => row.evaluate((element) => getComputedStyle(element).borderTopColor);
	expect(await edge()).toBe('rgba(0, 0, 0, 0)');
	await row.hover();
	await expect.poll(edge).toBe('rgb(228, 228, 228)');
});

test('fades no shared button under reduced motion', async ({ browser }) => {
	const page = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
	await page.goto('/');
	await expect(page.getByLabel('New task')).toBeEnabled();
	const sheet = await backup(page);
	const button = sheet.getByRole('button', { name: 'Download a file' });
	// `transition-none` turns off which properties change, not how long a change would take.
	expect(await button.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe(
		'none'
	);
	await page.context().close();
});

/** How much of a checkbox's tick is drawn: its stroke offset (0 when whole) and its drawing's opacity. */
const tick = (page: Page, name: string) =>
	page.getByRole('checkbox', { name }).evaluate((box) => {
		const drawing = box.parentElement!.querySelector('svg')!;
		const path = drawing.querySelector('path')!;
		return {
			offset: getComputedStyle(path).strokeDashoffset,
			opacity: getComputedStyle(drawing).opacity
		};
	});

test('draws the tick when a box is checked, and hides it when not, in both themes', async ({
	page
}) => {
	await addTask(page, 'Tick me');
	// In the task's details the box stays put when ticked, instead of moving to Done.
	await task(page, 'Tick me').click();
	const box = page.getByRole('dialog', { name: 'Task details' }).getByRole('checkbox', {
		name: 'Done'
	});
	const drawn = () =>
		box.evaluate((input) => {
			const drawing = input.parentElement!.querySelector('svg')!;
			return {
				offset: getComputedStyle(drawing.querySelector('path')!).strokeDashoffset,
				opacity: getComputedStyle(drawing).opacity,
				// The tick is graphite on pink: a different color from the fill it sits on.
				differs: getComputedStyle(drawing).color !== getComputedStyle(input).backgroundColor
			};
		});
	for (const colorScheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme });
		await expect.poll(drawn).toMatchObject({ offset: '24px', opacity: '0' });
		await box.check();
		await expect.poll(drawn).toEqual({ offset: '0px', opacity: '1', differs: true });
		await box.uncheck();
	}
});

test('draws the tick at once under reduced motion', async ({ browser }) => {
	const page = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
	await page.goto('/');
	await expect(page.getByLabel('New task')).toBeEnabled();
	await addTask(page, 'Calm tick');
	await page.getByRole('checkbox', { name: 'Mark done: Calm tick' }).click();
	await page.getByText('Done (1)').click();
	// Read straight away: with no transition the tick is already whole.
	expect(await tick(page, 'Mark not done: Calm tick')).toEqual({ offset: '0px', opacity: '1' });
	await page.context().close();
});

/** Where the message with Undo is on screen: the pill itself, not the full-width region around it. */
const noticeBox = (page: Page) =>
	page.evaluate(() => {
		const pill = document.querySelector('[role="status"].fixed > div')!;
		const { top, bottom, left, right } = pill.getBoundingClientRect();
		return { top, bottom, left, right };
	});

type Box = Awaited<ReturnType<typeof noticeBox>>;
const intersects = (one: Box, other: Box) =>
	Math.min(one.right, other.right) > Math.max(one.left, other.left) &&
	Math.min(one.bottom, other.bottom) > Math.max(one.top, other.top);

/**
 * The reservation the message makes: the space it covers, the scroll padding that keeps focus clear
 * of it, the room added at the end, and the footer's padding, which that room adds to.
 */
const reservation = (page: Page) =>
	page.evaluate(() => ({
		property: document.documentElement.style.getPropertyValue('--notice-room'),
		footer: parseFloat(getComputedStyle(document.querySelector('footer')!).paddingBottom),
		padding: getComputedStyle(document.documentElement).scrollPaddingBottom,
		room: document
			.querySelector('[role="status"].fixed')!
			.previousElementSibling!.getBoundingClientRect().height
	}));

async function longList(page: Page) {
	for (let number = 1; number <= 30; number++) await addTask(page, `Errand ${number}`);
	await expect(task(page, 'Errand 30')).toBeVisible();
	await expect(notice(page).getByRole('button', { name: 'Undo' })).toBeVisible();
	await page.waitForFunction(() => document.getAnimations().length === 0);
}

test('keeps focus clear of the message with Undo, and makes room for it at the end', async ({
	page
}) => {
	await longList(page);
	// Keep the message from timing out while this runs.
	await notice(page).hover();
	const pill = await noticeBox(page);
	const room = await reservation(page);
	expect(parseFloat(room.property)).toBeGreaterThanOrEqual(pill.bottom - pill.top);
	expect(room.padding).toBe(room.property);
	// The footer's padding is room already: only what it lacks is added, never twice.
	expect(room.room).toBe(Math.max(0, parseFloat(room.property) - room.footer));

	// A row whose top is just above the message, so the one before it is fully in view.
	const rows = page.locator('main [data-task]');
	const index = await rows.evaluateAll(
		(found, top) => found.findIndex((row) => row.getBoundingClientRect().bottom > top),
		pill.top
	);
	expect(index).toBeGreaterThan(0);
	await rows.nth(index).evaluate((row, top) => {
		window.scrollBy({ top: row.getBoundingClientRect().top - (top - 2), behavior: 'instant' });
	}, pill.top);
	const before = rows.nth(index - 1);
	await before.getByRole('button', { name: /^Move down/ }).focus();
	expect(intersects(await rows.nth(index).boundingBox().then(toBox), pill)).toBe(true);
	await page.keyboard.press('Tab');
	await expect(rows.nth(index).getByRole('checkbox')).toBeFocused();
	await expect
		.poll(async () => intersects((await rows.nth(index).boundingBox().then(toBox))!, pill))
		.toBe(false);

	// At the end, the last row is fully above the message.
	await page.evaluate(() =>
		window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
	);
	const last = (await rows.last().boundingBox().then(toBox))!;
	expect(last.bottom).toBeLessThanOrEqual(pill.top);

	// Closing it there moves nothing; the room goes once it's scrolled out of sight.
	const scrolled = await page.evaluate(() => window.scrollY);
	await notice(page).getByRole('button', { name: 'Dismiss' }).click();
	await expect(notice(page)).toBeEmpty();
	expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await expect
		.poll(() => reservation(page))
		.toEqual(expect.objectContaining({ property: '', padding: '0px', room: 0 }));
});

test('gives the room back when the message goes, away from the end', async ({ page }) => {
	await longList(page);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	expect(parseFloat((await reservation(page)).property)).toBeGreaterThan(0);
	await notice(page).getByRole('button', { name: 'Dismiss' }).click();
	await expect
		.poll(() => reservation(page))
		.toEqual(expect.objectContaining({ property: '', padding: '0px', room: 0 }));
});

function toBox(box: { x: number; y: number; width: number; height: number } | null) {
	return box && { top: box.y, bottom: box.y + box.height, left: box.x, right: box.x + box.width };
}
