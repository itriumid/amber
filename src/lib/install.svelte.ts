// Installing Amber to the home screen or the dock. Chromium browsers offer their own prompt, which
// is kept and shown when asked for. Safari has none, so it gets steps instead, and a way to bring
// the list along: an installed Amber on Apple devices keeps its own storage, apart from Safari's.

interface InstallPrompt extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Way = 'prompt' | 'apple-phone' | 'apple-computer';

class Install {
	/** Running as an installed application, not in a browser tab. */
	installed = $state(false);
	/** On an Apple device, where an installed Amber has storage of its own. */
	apple = $state(false);
	/** Safari's own way to install, where there's one: steps rather than a prompt. */
	private safari = $state<'apple-phone' | 'apple-computer'>();
	private prompt = $state.raw<InstallPrompt>();

	watch() {
		const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
		this.installed = matchMedia('(display-mode: standalone)').matches || standalone === true;
		const agent = navigator.userAgent;
		const mac = /Macintosh/.test(agent);
		// iPadOS says it's a Mac; touch gives it away.
		const phone = /iPhone|iPad|iPod/.test(agent) || (mac && navigator.maxTouchPoints > 1);
		this.apple = phone || mac;
		if (phone) this.safari = 'apple-phone';
		else if (mac && /Version\/[\d.]+ Safari/.test(agent)) this.safari = 'apple-computer';
		addEventListener('beforeinstallprompt', (event) => {
			event.preventDefault();
			this.prompt = event as InstallPrompt;
		});
		addEventListener('appinstalled', () => {
			this.prompt = undefined;
		});
	}

	/** How Amber can be installed here, if it can and isn't already. */
	get offered(): Way | undefined {
		if (this.installed) return undefined;
		return this.prompt ? 'prompt' : this.safari;
	}

	async ask() {
		const prompt = this.prompt;
		if (!prompt) return;
		await prompt.prompt();
		await prompt.userChoice;
		this.prompt = undefined;
	}
}

export const install = new Install();
