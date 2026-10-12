import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the built site, the way visitors get it.
export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'phone', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		// CI has just built the site in an earlier step.
		command: `${process.env.CI ? '' : 'pnpm build && '}pnpm preview --port 4173 --strictPort`,
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
