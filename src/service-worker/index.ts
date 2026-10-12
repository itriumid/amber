/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Keeps this version of Amber on the device, so it opens with no connection at all. Everything it
// needs is stored when it installs, and served from there first: the page, its scripts and
// styles, the fonts and icons. Lists aren't here; they're in IndexedDB, and never touch this.
//
// A new version installs alongside and waits. It takes over only when the page asks (someone
// pressed Update) or when no tab has Amber open, so the code never changes under a list being
// edited.

import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE = `amber-${version}`;
// The manifest's paths are relative to where Amber is served; requests are matched by full path.
const at = (path: string) => new URL(path, self.registration.scope).pathname;
const PAGE = at('');
const KEPT = [...immutable, ...assets, ...prerendered].map((file) => at(file.path));

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(KEPT)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
	);
});

self.addEventListener('message', (event) => {
	if (event.data === 'update') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Opening Amber, with or without a list in the link: the page this version came with.
	const kept = request.mode === 'navigate' && url.pathname === PAGE ? PAGE : url.pathname;
	if (!KEPT.includes(kept)) return;
	event.respondWith(
		caches
			.open(CACHE)
			.then((cache) => cache.match(kept))
			.then((response) => response ?? fetch(request))
	);
});
