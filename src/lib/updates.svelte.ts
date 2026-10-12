// Updates to Amber itself. The service worker installs a new version in the background and keeps
// it waiting; this notices, offers it, and switches to it only when someone presses Update, so a
// list being edited never changes code under it. Without a service worker (in development, or a
// browser without them), updating is a reload.

class Updates {
	/** A new version is installed and waiting. */
	ready = $state(false);

	private registration: ServiceWorkerRegistration | undefined;
	private updating = false;

	watch() {
		if (!('serviceWorker' in navigator)) return;
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (this.updating) location.reload();
		});
		void navigator.serviceWorker.ready.then((registration) => {
			this.registration = registration;
			this.offer(registration.waiting);
			registration.addEventListener('updatefound', () => {
				const installing = registration.installing;
				installing?.addEventListener('statechange', () => {
					if (installing.state === 'installed') this.offer(installing);
				});
			});
		});
		// An installed Amber can stay open for days: look again whenever it comes back into view.
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') this.check();
		});
	}

	private offer(worker: ServiceWorker | null) {
		// The very first install has nothing to replace; only a version waiting behind one counts.
		if (worker && navigator.serviceWorker.controller) this.ready = true;
	}

	check() {
		this.registration?.update().catch(() => {
			// Offline, most likely. The next look will do.
		});
	}

	apply() {
		const waiting = this.registration?.waiting;
		if (!waiting) return location.reload();
		this.updating = true;
		waiting.postMessage('update');
	}
}

export const updates = new Updates();
