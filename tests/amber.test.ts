import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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
	page.getByRole('main').getByRole('button', { name: new RegExp(`^${title}\\W+Open details$`) });

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
	// The same browser, emptied: as if the file were opened on a phone with a list of its own.
	await page.evaluate(() => indexedDB.deleteDatabase('amber'));
	await page.reload();
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
