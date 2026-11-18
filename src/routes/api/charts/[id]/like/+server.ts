import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { isId } from '$lib/server/charts';
import { likesOf, setLike } from '$lib/server/likes';

export const prerender = false;

async function change(cookies: Parameters<RequestHandler>[0]['cookies'], id: string, liked: boolean) {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in with Ravelry to like a chart.');
	if (!isId(id) || !(await setLike('chart', account.id, id, liked))) error(404, 'That chart is not shared.');
	return json(await likesOf('chart', id, account.id));
}

/** Like a shared chart. Liking twice is the same as liking once. */
export const PUT: RequestHandler = ({ cookies, params }) => change(cookies, params.id, true);

/** Take your like back. */
export const DELETE: RequestHandler = ({ cookies, params }) => change(cookies, params.id, false);
