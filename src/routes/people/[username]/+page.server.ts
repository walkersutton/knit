import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfile } from '$lib/server/profile';

// Shared work and likes change, so this page is built per request rather than ahead of time.
export const prerender = false;

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const profile = await getProfile(params.username).catch(() => error(503, 'Knitter pages are not available right now.'));
	if (!profile) error(404, 'No knitter by that name has joined knit.');
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	return { profile };
};
