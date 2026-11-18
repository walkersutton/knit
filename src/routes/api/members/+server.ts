import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listMembers } from '$lib/server/members';

export const prerender = false;

/** The knitters who have signed up with Ravelry, for the circles on the home page. Public and cached for a few minutes. */
export const GET: RequestHandler = async () => {
	const body = await listMembers().catch(() => ({ members: [], total: 0 }));
	return json(body, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } });
};
