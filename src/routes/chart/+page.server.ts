import type { PageServerLoad } from './$types';
import { listSharedCharts } from '$lib/server/charts';

// Shared charts come and go, so this page is built per request rather than ahead of time.
export const prerender = false;

const SIZES = [
	{ value: 'standard', label: 'Standard (12 × 16)' },
	{ value: 'fine', label: 'Fine (24 × 32)' }
];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const size = SIZES.find((s) => s.value === url.searchParams.get('size'))?.value ?? '';
	const page = Math.min(Math.max(Math.floor(Number(url.searchParams.get('page'))) || 0, 0), 1000);
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	try {
		return { q, size, page, sizes: SIZES, unavailable: false, ...(await listSharedCharts(q, size, page)) };
	} catch {
		return { q, size, page, sizes: SIZES, unavailable: true, charts: [], more: false };
	}
};
