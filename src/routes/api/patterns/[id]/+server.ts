import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { isId, unsharePattern } from '$lib/server/patterns';

export const prerender = false;

/** Take a pattern you shared back out of the catalogue. */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to manage your shared patterns.');
	if (!isId(params.id) || !(await unsharePattern(account.id, params.id))) error(404, 'You have not shared that pattern.');
	return json({ ok: true });
};
