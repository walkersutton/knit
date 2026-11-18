import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { cleanName, shareable, sharePattern } from '$lib/server/patterns';

export const prerender = false;

/** Share a design: it gets a public page at /pattern/<id> and a place in the catalogue. */
export const POST: RequestHandler = async ({ cookies, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in with Ravelry to share a pattern.');
	const body = await request.json().catch(() => null);
	if (!shareable(body?.design)) error(400, 'That design cannot be shared.');
	const shared = await sharePattern(account.id, cleanName(body.name) || 'My sweater', body.design);
	if (shared === 'limit') error(409, 'You have shared as many patterns as you can. Remove one to share another.');
	return json({ id: shared.id });
};
