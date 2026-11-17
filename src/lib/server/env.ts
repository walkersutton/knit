import { env as platformEnv } from '$env/dynamic/private';
import { parse } from '@dotenvx/dotenvx';
import encrypted from '../../../.env.production?raw';

/**
 * Server config. Platform variables (DATABASE_URL, injected by the Neon integration) win;
 * everything else comes from the dotenvx-encrypted .env.production, which is bundled with
 * the server and decrypted with DOTENV_PRIVATE_KEY_PRODUCTION (the only secret set on Vercel).
 */
function load(): Record<string, string | undefined> {
	const privateKey = platformEnv.DOTENV_PRIVATE_KEY_PRODUCTION;
	if (!privateKey) return { ...platformEnv };
	const decrypted = parse(encrypted, { privateKey, processEnv: {} });
	const stuck = Object.keys(decrypted).filter((k) => decrypted[k]?.startsWith('encrypted:'));
	if (stuck.length) throw new Error(`DOTENV_PRIVATE_KEY_PRODUCTION could not decrypt: ${stuck.join(', ')}`);
	return { ...decrypted, ...platformEnv };
}

let cached: Record<string, string | undefined> | undefined;

export const env = new Proxy({} as Record<string, string | undefined>, {
	get: (_, key: string) => (cached ??= load())[key]
});
