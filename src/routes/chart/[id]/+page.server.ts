import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAccount } from '$lib/server/auth';
import { getSharedChart } from '$lib/server/charts';

export const prerender = false;

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	const shared = await getSharedChart(params.id).catch(() => error(503, 'Shared charts are not available right now.'));
	if (!shared) error(404, 'That chart is not shared, or its author has taken it down.');
	// Whether it is yours depends on who is looking, so only the anonymous copy may be cached.
	const account = cookies.get('knit_session') ? await getAccount(cookies).catch(() => null) : null;
	setHeaders({ 'cache-control': account ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	const { userId, ...chart } = shared;
	return { chart, mine: account?.id === userId };
};
