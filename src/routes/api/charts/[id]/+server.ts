import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { cleanNotes, getSharedChart, isId, setChartNotes, unshareChart } from '$lib/server/charts';

export const prerender = false;

/** A shared chart's name, author and notes, for the 3D preview, and whether the one asking may edit the notes. */
export const GET: RequestHandler = async ({ cookies, params, setHeaders }) => {
	const shared = await getSharedChart(params.id).catch(() => error(503, 'Shared charts are not available right now.'));
	if (!shared) error(404, 'That chart is not shared.');
	const account = cookies.get('knit_session') ? await getAccount(cookies).catch(() => null) : null;
	setHeaders({ 'cache-control': 'private, no-store' });
	return json({ name: shared.name, author: shared.author, authorPhoto: shared.authorPhoto, notes: shared.notes, mine: account?.id === shared.userId });
};

/** Change the notes on a chart you shared. */
export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to edit your shared charts.');
	const body = await request.json().catch(() => null);
	if (typeof body?.notes !== 'string') error(400, 'Send the notes as text.');
	if (!isId(params.id) || !(await setChartNotes(account.id, params.id, cleanNotes(body.notes)))) error(404, 'You have not shared that chart.');
	return json({ ok: true });
};

/** Take a chart you shared back out of the library. */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to manage your shared charts.');
	if (!isId(params.id) || !(await unshareChart(account.id, params.id))) error(404, 'You have not shared that chart.');
	return json({ ok: true });
};
