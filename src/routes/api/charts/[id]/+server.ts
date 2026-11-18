import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { isId, unshareChart } from '$lib/server/charts';

export const prerender = false;

/** Take a chart you shared back out of the library. */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to manage your shared charts.');
	if (!isId(params.id) || !(await unshareChart(account.id, params.id))) error(404, 'You have not shared that chart.');
	return json({ ok: true });
};
