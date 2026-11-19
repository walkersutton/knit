import { database } from './db';
import { cleanPhoto } from './members';
import { digest } from './auth';
import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import type { Design } from '$lib/sweater/garment';
import { validMotif } from '$lib/sweater/motifs';
import { writePattern } from '$lib/sweater/pattern';
import { validDesign } from '$lib/sweater/progress';

export const PAGE_SIZE = 24;
/** What one knitter can have shared at once. */
export const MAX_SHARED = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedPattern = { id: string; name: string; design: Design; author: string; authorPhoto: string | null; createdAt: string };

export const isId = (value: string) => UUID.test(value);

/** A design is only shared if it is a whole one the designer offers and a pattern can be written for it. */
export function shareable(value: unknown): value is Design {
	if (!validDesign(value, DEFAULT_DESIGN)) return false;
	if (value.motif !== '' && !validMotif(value.motif)) return false;
	return writePattern(value).ok;
}

export const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 60) : '');

/** Share a design, or return the link it already has: sharing the same design twice is the same pattern. */
export async function sharePattern(userId: string, name: string, design: Design): Promise<{ id: string } | 'limit'> {
	const sql = database();
	// Keys are sorted so the hash does not depend on the order the browser wrote the fields in.
	const key = digest(JSON.stringify(Object.fromEntries(Object.entries(design).sort(([a], [b]) => (a < b ? -1 : 1)))));
	const existing = await sql`UPDATE shared_patterns SET name = ${name} WHERE user_id = ${userId} AND design_key = ${key} RETURNING id`;
	if (existing.length) return { id: existing[0].id };
	const count = await sql`SELECT count(*)::int AS n FROM shared_patterns WHERE user_id = ${userId}`;
	if (count[0].n >= MAX_SHARED) return 'limit';
	const rows = await sql`
		INSERT INTO shared_patterns (user_id, name, design, design_key, garment)
		VALUES (${userId}, ${name}, ${JSON.stringify(design)}::jsonb, ${key}, ${design.garment})
		ON CONFLICT (user_id, design_key) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`;
	return { id: rows[0].id };
}

/** The biggest preview image kept, as base64 text (about 450 KB of JPEG; a real one is nearer 60 KB). */
const MAX_IMAGE = 600_000;
const JPEG_SIGNATURE = '/9j/';

/** A preview image is only kept if it is a JPEG of a sensible size. The browser always makes it 660 × 750. */
export function cleanImage(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > MAX_IMAGE || !value.startsWith(JPEG_SIGNATURE) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
	return value;
}

/** Keep the 3D picture the author's browser took. It is a nicety, so a failure (such as the column not existing yet) never stops a share. */
export async function setImage(userId: string, id: string, image: string) {
	try {
		await database()`UPDATE shared_patterns SET og_image = ${image} WHERE id = ${id} AND user_id = ${userId}`;
	} catch {
		// Sharing still worked; the preview falls back to the drawn sweater.
	}
}

/** The stored preview picture as base64 JPEG, if there is one. */
export async function getImage(id: string): Promise<string | null> {
	if (!isId(id)) return null;
	try {
		const rows = await database()`SELECT og_image FROM shared_patterns WHERE id = ${id} LIMIT 1`;
		return cleanImage(rows[0]?.og_image);
	} catch {
		return null;
	}
}

/** Remove a pattern from the catalogue. Returns whether the caller owned it. */
export async function unsharePattern(userId: string, id: string) {
	const rows = await database()`DELETE FROM shared_patterns WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

const toPattern = (row: Record<string, any>): SharedPattern => ({ id: row.id, name: row.name, design: row.design, author: row.author, authorPhoto: cleanPhoto(row.author_photo), createdAt: row.created_at });

export async function getShared(id: string): Promise<(SharedPattern & { userId: string }) | null> {
	if (!isId(id)) return null;
	const rows = await database()`
		SELECT p.id, p.name, p.design, p.created_at, p.user_id, u.ravelry_username AS author, u.photo_url AS author_photo
		FROM shared_patterns p JOIN users u ON u.id = p.user_id
		WHERE p.id = ${id} LIMIT 1
	`;
	return rows[0] ? { ...toPattern(rows[0]), userId: rows[0].user_id } : null;
}

/** The catalogue, newest first, optionally filtered by words in the name, the garment or the author. */
export async function listShared(query: string, garment: string, page: number) {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
	const rows = await database()`
		SELECT p.id, p.name, p.design, p.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
		FROM shared_patterns p JOIN users u ON u.id = p.user_id
		WHERE (${garment} = '' OR p.garment = ${garment})
			AND NOT EXISTS (
				SELECT 1 FROM unnest(${words}::text[]) AS w
				WHERE position(w IN lower(p.name || ' ' || p.garment || ' ' || u.ravelry_username)) = 0
			)
		ORDER BY p.created_at DESC
		LIMIT ${PAGE_SIZE + 1} OFFSET ${page * PAGE_SIZE}
	`;
	return { patterns: rows.slice(0, PAGE_SIZE).map(toPattern), more: rows.length > PAGE_SIZE };
}
