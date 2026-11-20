import { dev } from '$app/environment';

/** The feedback form's Turnstile widget. The sitekey is public; its secret lives server-side as TURNSTILE_SECRET. */
const PRODUCTION_SITEKEY = '0x4AAAAAAGJ1HsPG4-x7jBJx';
/** Cloudflare's always-passes test sitekey, for local development. */
const TEST_SITEKEY = '1x00000000000000000000AA';
export const SITEKEY = dev ? TEST_SITEKEY : PRODUCTION_SITEKEY;
export const ACTION = 'feedback';

type Turnstile = {
	render: (el: HTMLElement, options: Record<string, unknown>) => string;
	reset: (id: string) => void;
	remove: (id: string) => void;
};
declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

let loading: Promise<Turnstile> | undefined;

/** Loads Cloudflare's script once, on first use, rather than on every page. */
export function loadTurnstile(): Promise<Turnstile> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	return (loading ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
		script.onerror = () => {
			loading = undefined;
			script.remove();
			reject(new Error('turnstile failed to load'));
		};
		document.head.appendChild(script);
	}));
}
