import { database } from './db';
import { cleanPhoto } from './members';
import { digest } from './auth';
import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import { cleanNotes } from '$lib/sweater/library';

export { cleanNotes };
import type { Design } from '$lib/sweater/garment';
import { validMotif } from '$lib/sweater/motifs';
import { writePattern } from '$lib/sweater/pattern';
import { validDesign } from '$lib/sweater/progress';

export const PAGE_SIZE = 24;
/** What one knitter can have shared at once. */
export const MAX_SHARED = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedPattern = { id: string; slug: string; name: string; design: Design; author: string; authorPhoto: string | null; createdAt: string; notes?: string };

export const isId = (value: string) => UUID.test(value);

/** Paths under /pattern/ that are pages of their own, so no pattern can take them. */
const RESERVED = new Set(['view']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isSlug = (value: string) => value.length <= 60 && SLUG.test(value);

/** The URL form of a pattern's name: "Cosy Fair Isle!" becomes "cosy-fair-isle". Accents are dropped; a name with no letters or digits becomes "pattern". */
export function slugify(name: string) {
	const slug = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, 50)
		.replace(/^-+|-+$/g, '');
	return slug || 'pattern';
}

/** The first of base, base-2, base-3… that is not in taken and not reserved. */
export function nextSlug(base: string, taken: Iterable<string>) {
	const used = new Set(taken);
	const free = (s: string) => !used.has(s) && !RESERVED.has(s);
	if (free(base)) return base;
	for (let n = 2; ; n++) if (free(`${base}-${n}`)) return `${base}-${n}`;
}

type Sql = ReturnType<typeof database>;

/** A slug for a new pattern called name that no other pattern has. */
async function freeSlug(sql: Sql, name: string) {
	const base = slugify(name);
	// The base is only letters, digits and hyphens, so it has no LIKE wildcards in it.
	const rows = await sql`SELECT slug FROM shared_patterns WHERE slug = ${base} OR slug LIKE ${base + '-%'}`;
	return nextSlug(base, rows.map((r) => String(r.slug)));
}

const slugClash = (e: unknown) => (e as { code?: string; constraint?: string })?.code === '23505' && String((e as { constraint?: string }).constraint ?? '').includes('slug');

/** A design is only shared if it is a whole one the designer offers and a pattern can be written for it. */
export function shareable(value: unknown): value is Design {
	if (!validDesign(value, DEFAULT_DESIGN)) return false;
	if (value.motif !== '' && !validMotif(value.motif)) return false;
	return writePattern(value).ok;
}

export const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 60) : '');

/** A hash of a design. Keys are sorted so it does not depend on the order the browser wrote the fields in. */
export const designKey = (design: Design) => digest(JSON.stringify(Object.fromEntries(Object.entries(design).sort(([a], [b]) => (a < b ? -1 : 1)))));

/** Share a design, or return the link it already has: sharing the same design twice is the same pattern. Its URL comes from the name it is first shared under and stays put if it is renamed, so links keep working. */
export async function sharePattern(userId: string, name: string, design: Design, notes = ''): Promise<{ id: string; slug: string } | 'limit'> {
	const sql = database();
	const key = designKey(design);
	const existing = await sql`UPDATE shared_patterns SET name = ${name}, notes = ${notes} WHERE user_id = ${userId} AND design_key = ${key} RETURNING id, slug`;
	if (existing.length) return { id: existing[0].id, slug: existing[0].slug };
	const count = await sql`SELECT count(*)::int AS n FROM shared_patterns WHERE user_id = ${userId}`;
	if (count[0].n >= MAX_SHARED) return 'limit';
	// Two knitters may pick the same name at once. The loser of that race looks again and takes the next free number, so naming never fails.
	for (;;) {
		const slug = await freeSlug(sql, name);
		try {
			const rows = await sql`
				INSERT INTO shared_patterns (user_id, name, design, design_key, garment, notes, slug)
				VALUES (${userId}, ${name}, ${JSON.stringify(design)}::jsonb, ${key}, ${design.garment}, ${notes}, ${slug})
				ON CONFLICT (user_id, design_key) DO UPDATE SET name = EXCLUDED.name, notes = EXCLUDED.notes
				RETURNING id, slug
			`;
			return { id: rows[0].id, slug: rows[0].slug };
		} catch (e) {
			if (!slugClash(e)) throw e;
		}
	}
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

/** Change the notes on a pattern you shared. Returns whether the caller owned it. */
export async function setPatternNotes(userId: string, id: string, notes: string) {
	const rows = await database()`UPDATE shared_patterns SET notes = ${notes} WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

/** Remove a pattern from the catalogue. Returns whether the caller owned it. */
export async function unsharePattern(userId: string, id: string) {
	const rows = await database()`DELETE FROM shared_patterns WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

export const toPattern = (row: Record<string, any>): SharedPattern => ({ id: row.id, slug: row.slug, name: row.name, design: { ...DEFAULT_DESIGN, ...row.design }, author: row.author, authorPhoto: cleanPhoto(row.author_photo), createdAt: row.created_at, notes: cleanNotes(row.notes) });

/** A shared pattern by the name in its URL. */
export async function getShared(slug: string): Promise<(SharedPattern & { userId: string }) | null> {
	if (!isSlug(slug)) return null;
	const rows = await database()`
		SELECT p.id, p.slug, p.name, p.design, p.notes, p.created_at, p.user_id, u.ravelry_username AS author, u.photo_url AS author_photo
		FROM shared_patterns p JOIN users u ON u.id = p.user_id
		WHERE p.slug = ${slug} LIMIT 1
	`;
	return rows[0] ? { ...toPattern(rows[0]), userId: rows[0].user_id } : null;
}

/** The catalogue, newest first, optionally filtered by words in the name, the garment or the author. */
export async function listShared(query: string, garment: string, page: number) {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
	const rows = await database()`
		SELECT p.id, p.slug, p.name, p.design, p.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
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
