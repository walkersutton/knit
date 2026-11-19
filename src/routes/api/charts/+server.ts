import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { cleanName, cleanNotes, shareable, shareChart } from '$lib/server/charts';

export const prerender = false;

/** Share a chart: it gets a public page at /chart/<id> and a place in the chart library. */
export const POST: RequestHandler = async ({ cookies, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in with Ravelry to share a chart.');
	const body = await request.json().catch(() => null);
	if (!shareable(body)) error(400, 'That chart cannot be shared.');
	const shared = await shareChart(account.id, cleanName((body as { name?: unknown }).name) || 'My chart', body, cleanNotes((body as { notes?: unknown }).notes));
	if (shared === 'limit') error(409, 'You have shared as many charts as you can. Remove one to share another.');
	return json({ id: shared.id });
};
