import { database } from './db';
import { cleanImage, designKey } from './patterns';
import type { Featured } from './likes';
import type { Design } from '$lib/sweater/garment';
import { chartDesign } from '$lib/sweater/library';

/** Bump when the 3D viewer's look changes, so the stored pictures are drawn again. */
export const RENDER_LOOK = 1;

/** The key a design's stored 3D picture is kept under. */
export const renderKey = (design: Design) => `${RENDER_LOOK}:${designKey(design)}`;

export type FeaturedKind = 'chart' | 'pattern';

/** The sweater each favourite is shown on: a pattern as it was shared, a chart on the default sweater. */
export function featuredDesigns(picks: Featured): Partial<Record<FeaturedKind, Design>> {
	const out: Partial<Record<FeaturedKind, Design>> = {};
	if (picks.pattern) out.pattern = picks.pattern.design;
	if (picks.chart) out.chart = chartDesign(picks.chart.motif, picks.chart.color, picks.chart.contrast);
	return out;
}

/** The stored 3D pictures of the favourites, as base64 JPEG; null where none has been drawn yet. */
export async function featuredPictures(picks: Featured): Promise<Record<FeaturedKind, string | null>> {
	const designs = featuredDesigns(picks);
	const keys = Object.fromEntries(Object.entries(designs).map(([kind, d]) => [kind, renderKey(d)])) as Partial<Record<FeaturedKind, string>>;
	const wanted = Object.values(keys);
	const out: Record<FeaturedKind, string | null> = { chart: null, pattern: null };
	if (!wanted.length) return out;
	const rows = await database()`SELECT key, image FROM renders WHERE key = ANY(${wanted})`;
	const byKey = new Map(rows.map((r) => [r.key as string, cleanImage(r.image)]));
	for (const kind of ['chart', 'pattern'] as const) if (keys[kind]) out[kind] = byKey.get(keys[kind]!) ?? null;
	return out;
}

/** Keep a picture a browser drew. The first one kept for a design stays; later ones are ignored. */
export async function saveRender(key: string, image: string) {
	await database()`INSERT INTO renders (key, image) VALUES (${key}, ${image}) ON CONFLICT (key) DO NOTHING`;
}
