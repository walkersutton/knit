import { database } from './db';
import { cleanImage, designKey } from './patterns';
import type { Featured } from './likes';
import type { Design } from '$lib/sweater/garment';

/**
 * Bump when the 3D viewer's look or the stored picture's framing changes, so the stored pictures are drawn again.
 * 2: cropped to the garment and square, for the home page's pattern shelf.
 */
export const RENDER_LOOK = 2;

/** The key a design's stored 3D picture is kept under. */
export const renderKey = (design: Design) => `${RENDER_LOOK}:${designKey(design)}`;

/** The design of a featured pattern, or undefined if that pattern is not featured. */
export const featuredDesign = (picks: Featured, id: string): Design | undefined => picks.patterns.find((p) => p.id === id)?.design;

/** The stored 3D pictures of the featured patterns, by pattern id, as base64 JPEG; null where none has been drawn yet. */
export async function featuredPictures(picks: Featured): Promise<Record<string, string | null>> {
	const keys = new Map(picks.patterns.map((p) => [p.id, renderKey(p.design)]));
	const out: Record<string, string | null> = Object.fromEntries(picks.patterns.map((p) => [p.id, null]));
	if (!keys.size) return out;
	const rows = await database()`SELECT key, image FROM renders WHERE key = ANY(${[...keys.values()]})`;
	const byKey = new Map(rows.map((r) => [r.key as string, cleanImage(r.image)]));
	for (const [id, key] of keys) out[id] = byKey.get(key) ?? null;
	return out;
}

/** Keep a picture a browser drew. The first one kept for a design stays; later ones are ignored. */
export async function saveRender(key: string, image: string) {
	await database()`INSERT INTO renders (key, image) VALUES (${key}, ${image}) ON CONFLICT (key) DO NOTHING`;
}
