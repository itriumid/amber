// The theme, set before the page is drawn so it never flashes the other one: the one chosen in
// Amber (Light or Dark), or the device's. The device's is pinned too, so when the device switches,
// the page can fade to the new one (settings.svelte.ts) instead of the stylesheet changing at once.
// An external file: the Content-Security-Policy allows no inline script.
let theme = null;
try {
	theme = localStorage.getItem('amber-theme');
} catch {
	// Storage blocked: the device's setting holds.
}
if (theme !== 'light' && theme !== 'dark')
	theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
// The browser's own bar takes the page's color.
for (const meta of document.querySelectorAll('meta[name="theme-color"]'))
	meta.setAttribute('content', theme === 'light' ? '#FAFAFA' : '#2B2B2B');
