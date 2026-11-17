import type { RequestHandler } from './$types';
import { SESSION_COOKIE, digest } from '$lib/server/auth';
import { database } from '$lib/server/db';

export const prerender = false;

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		const sql = database();
		await sql`DELETE FROM sessions WHERE token_hash = ${digest(token)}`;
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return new Response(null, { status: 204 });
};
