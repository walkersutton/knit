import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * For one-off server scripts run with vite-node (see scripts/seed.ts): the app's `$lib` code without SvelteKit, with
 * `$env/dynamic/private` read from the process environment (load it with `dotenvx run -f .env.local --`).
 */
export default defineConfig({
	root: fileURLToPath(new URL('..', import.meta.url)),
	// The app bundles the encrypted .env.production (see src/lib/server/env.ts), which Vite's dev server refuses by default.
	server: { fs: { deny: [] } },
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('../src/lib', import.meta.url)),
			'$env/dynamic/private': fileURLToPath(new URL('./env.ts', import.meta.url))
		}
	}
});
