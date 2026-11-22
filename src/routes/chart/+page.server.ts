import type { PageServerLoad } from './$types';
import { listChartFacets, listSharedCharts } from '$lib/server/charts';
import { buildFacets, isPaletteColour, parseSort, type FacetSpec } from '$lib/sweater/browse';

// Shared charts come and go, so this page is built per request rather than ahead of time.
export const prerender = false;

const SIZES = ['standard', 'fine', 'centerpiece'];
const FACETS: FacetSpec[] = [
	{ key: 'size', label: 'Size', order: SIZES, words: { standard: 'Standard · 12 × 16', fine: 'Fine · 24 × 32', centerpiece: 'Centerpieces' } },
	{ key: 'colour', label: 'Colour', swatch: true }
];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const size = SIZES.find((s) => s === url.searchParams.get('size')) ?? '';
	const colour = isPaletteColour(url.searchParams.get('colour') ?? '') ? url.searchParams.get('colour')! : '';
	const sort = parseSort(url.searchParams.get('sort'));
	const page = Math.min(Math.max(Math.floor(Number(url.searchParams.get('page'))) || 0, 0), 1000);
	const values = { size, colour };
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	try {
		const [list, rows] = await Promise.all([listSharedCharts(size, colour, sort, page), listChartFacets()]);
		return { values, sort, page, facets: buildFacets(rows, FACETS, values), unavailable: false, ...list };
	} catch {
		return { values, sort, page, facets: buildFacets([], FACETS, values), unavailable: true, charts: [], more: false };
	}
};
