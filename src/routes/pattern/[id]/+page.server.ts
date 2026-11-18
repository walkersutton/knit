import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAccount } from '$lib/server/auth';
import { likesOf } from '$lib/server/likes';
import { getShared } from '$lib/server/patterns';

export const prerender = false;

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	const shared = await getShared(params.id).catch(() => error(503, 'Shared patterns are not available right now.'));
	if (!shared) error(404, 'That pattern is not shared, or its author has taken it down.');
	// Whether it is yours depends on who is looking, so only the anonymous copy may be cached.
	const account = cookies.get('knit_session') ? await getAccount(cookies).catch(() => null) : null;
	setHeaders({ 'cache-control': account ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	const { userId, ...pattern } = shared;
	const { likes, liked } = await likesOf('pattern', shared.id, account?.id).catch(() => ({ likes: 0, liked: false }));
	return { pattern, mine: account?.id === userId, signedIn: !!account, likes, liked };
};
