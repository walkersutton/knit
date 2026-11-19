import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { cleanNotes, isId, setPatternNotes, unsharePattern } from '$lib/server/patterns';

export const prerender = false;

/** Change the notes on a pattern you shared. */
export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to edit your shared patterns.');
	const body = await request.json().catch(() => null);
	if (typeof body?.notes !== 'string') error(400, 'Send the notes as text.');
	if (!isId(params.id) || !(await setPatternNotes(account.id, params.id, cleanNotes(body.notes)))) error(404, 'You have not shared that pattern.');
	return json({ ok: true });
};

/** Take a pattern you shared back out of the catalogue. */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to manage your shared patterns.');
	if (!isId(params.id) || !(await unsharePattern(account.id, params.id))) error(404, 'You have not shared that pattern.');
	return json({ ok: true });
};
