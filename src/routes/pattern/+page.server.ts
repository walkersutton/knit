import type { PageServerLoad } from './$types';
import { listPatternFacets, listShared } from '$lib/server/patterns';
import { buildFacets, isPaletteColour, parseSort, type FacetSpec } from '$lib/sweater/browse';
import { GARMENTS } from '$lib/sweater/library';
import { PATTERNS } from '$lib/sweater/motifs';

// Shared patterns come and go, so this page is built per request rather than ahead of time.
export const prerender = false;

const WEARERS = ['Adult', 'Junior', 'Kid', 'Baby'];
const FACETS: FacetSpec[] = [
	{ key: 'garment', label: 'Garment', order: GARMENTS },
	{ key: 'fits', label: 'Made for', order: WEARERS },
	{ key: 'pattern', label: 'Pattern', order: PATTERNS },
	{ key: 'colour', label: 'Colour', swatch: true }
];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const get = (name: string) => url.searchParams.get(name) ?? '';
	const values = {
		garment: GARMENTS.find((g) => g === get('garment')) ?? '',
		fits: WEARERS.find((w) => w === get('fits')) ?? '',
		pattern: PATTERNS.find((p) => p === get('pattern')) ?? '',
		colour: isPaletteColour(get('colour')) ? get('colour') : ''
	};
	const sort = parseSort(get('sort'));
	const page = Math.min(Math.max(Math.floor(Number(get('page'))) || 0, 0), 1000);
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	try {
		const [list, rows] = await Promise.all([listShared(values, sort, page), listPatternFacets()]);
		return { values, sort, page, facets: buildFacets(rows, FACETS, values), unavailable: false, ...list };
	} catch {
		return { values, sort, page, facets: buildFacets([], FACETS, values), unavailable: true, patterns: [], more: false };
	}
};
