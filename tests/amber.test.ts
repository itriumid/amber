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

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page.getByLabel('New task')).toBeEnabled();
});

test('adds tasks with tags, and keeps them after a reload', async ({ page }) => {
	const problems = watchProblems(page);
	await addTask(page, 'Buy oat milk #errands #weekend');
	await addTask(page, 'Call the bank');
	await expect(task(page, 'Buy oat milk')).toBeVisible();
	await expect(page.getByRole('main').getByText('#errands')).toBeVisible();
	await page.reload();
	await expect(task(page, 'Call the bank')).toBeVisible();
	const sidebar = await lists(page);
	await expect(sidebar.getByRole('button', { name: /^#weekend/ })).toBeVisible();
	expect(problems).toEqual([]);
});

test('ticks a task done, tucks it away, and undoes it', async ({ page }) => {
	await addTask(page, 'Water the plants');
	await page.getByRole('checkbox', { name: 'Mark done: Water the plants' }).check();
	await expect(page.getByText('Done (1)')).toBeVisible();
	await expect(page.getByRole('status')).toContainText('Done: Water the plants');
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

test('has no accessibility problems axe can find, with a list and with a dialog open', async ({
	page
}) => {
	await addTask(page, 'A task #with-tag');
	await page.getByRole('checkbox', { name: 'Mark done: A task' }).check();
	await addTask(page, 'Another task');
	const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
	const listResults = await new AxeBuilder({ page }).withTags(wcag).analyze();
	expect(
		listResults.violations.map(
			(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`
		)
	).toEqual([]);
	await task(page, 'Another task').click();
	await expect(page.getByRole('dialog', { name: 'Task details' })).toBeVisible();
	const dialogResults = await new AxeBuilder({ page }).withTags(wcag).analyze();
	expect(
		dialogResults.violations.map(
			(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`
		)
	).toEqual([]);
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
