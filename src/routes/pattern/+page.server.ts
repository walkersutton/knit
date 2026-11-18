import type { PageServerLoad } from './$types';
import { listShared } from '$lib/server/patterns';

// Shared patterns come and go, so this page is built per request rather than ahead of time.
export const prerender = false;

const GARMENTS = ['Sweater', 'T-shirt', 'Slipover', 'Cardigan'];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const garment = GARMENTS.find((g) => g === url.searchParams.get('type')) ?? '';
	const page = Math.min(Math.max(Math.floor(Number(url.searchParams.get('page'))) || 0, 0), 1000);
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	try {
		return { q, garment, page, garments: GARMENTS, unavailable: false, ...(await listShared(q, garment, page)) };
	} catch {
		return { q, garment, page, garments: GARMENTS, unavailable: true, patterns: [], more: false };
	}
};
