import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { featured } from '$lib/server/likes';

export const prerender = false;

/** The community favourites for the home page: the most-liked chart and pattern. Public and cached for a few minutes. */
export const GET: RequestHandler = async () => {
	const body = await featured().catch(() => ({ chart: null, pattern: null }));
	return json(body, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } });
};
