import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			// Links like /design#d=… and /patterns#motif=… carry a design in the hash, not an anchor on the page.
			handleMissingId: ({ id, message }) => {
				if (/^(d|motif)=/.test(id)) return;
				throw new Error(message);
			}
		}
	}
};

export default config;
