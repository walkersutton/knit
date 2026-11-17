import { env } from './env';
import { neon } from '@neondatabase/serverless';

/** Run a parameterized query against the app's Neon Postgres database. */
export function database() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
	return neon(env.DATABASE_URL);
}
