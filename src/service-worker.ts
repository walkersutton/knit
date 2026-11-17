/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Keeps the whole app on the device, so a knitter who loses their connection mid-pattern can
 * reload or reopen the page and carry on. Pattern generation stays in the browser; optional account
 * syncing uses the network when it is available.
 */
import { build, files, prerendered, version } from '$service-worker';

const sw = globalThis.self as unknown as ServiceWorkerGlobalScope;

const CACHE = `knit-it-${version}`;
/** Static files only crawlers and link previews ask for. */
const SKIP = ['/og.png', '/robots.txt', '/sitemap.xml', '/llms.txt'];
const ASSETS = new Set([...build, ...files.filter((f) => !SKIP.includes(f))]);
const PAGES = new Set(prerendered);
/** How long a page waits on a weak connection before the saved copy is shown instead. */
const PATIENCE = 3000;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS, ...PAGES]))
			// Take over straight away, so the saved copy always matches the newest version seen.
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
	if (ASSETS.has(path)) event.respondWith(asset(request, path));
	else if (PAGES.has(path)) event.respondWith(page(request, path));
});

/** Built files never change under the same name: the saved copy is always right. */
async function asset(request: Request, path: string) {
	return (await caches.match(path, { cacheName: CACHE })) ?? fetch(request);
}

/** Pages come fresh from the network when it answers in time, and from the saved copy when it does not. */
async function page(request: Request, path: string) {
	const saved = await caches.match(path, { cacheName: CACHE });
	if (!saved) return fetch(request);
	const fresh = fetch(request).then((response) => (response.ok ? response : saved));
	const timeout = new Promise<Response>((resolve) => setTimeout(() => resolve(saved.clone()), PATIENCE));
	return Promise.race([fresh, timeout]).catch(() => saved);
}
