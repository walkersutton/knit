import { database } from './db';
import { cleanPhoto } from './members';
import { cleanNotes, isPaletteColor } from '$lib/sweater/library';
import type { Sort } from '$lib/sweater/browse';

export { cleanNotes };
import { tileOfMotif, validMotif } from '$lib/sweater/motifs';
import { parseCenterpiece } from '$lib/sweater/centerpiece';

export const PAGE_SIZE = 24;
/** What one knitter can have shared at once. */
export const MAX_SHARED = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedChart = { id: string; name: string; motif: string; color: string; contrast: string; author: string; authorPhoto: string | null; createdAt: string; notes?: string };
/** What a knitter sends to share a chart. `motif` is a repeating chart's cells, or a centerpiece's text ("20x11:…"). */
export type ChartInput = { motif: string; color: string; contrast: string };

export const isId = (value: string) => UUID.test(value);
/** What the library files a chart under: its repeat size, or 'centerpiece' for a picture worked once. */
export const sizeOf = (motif: string) => (parseCenterpiece(motif) ? 'centerpiece' : tileOfMotif(motif).fine ? 'fine' : 'standard');

/** A chart (or centerpiece) is only shared if it is a whole one the designer can draw, in colours its palette offers. */
export function shareable(value: unknown): value is ChartInput {
	const v = value as Record<string, unknown> | null;
	return !!v && (validMotif(v.motif) || parseCenterpiece(v.motif) !== null) && isPaletteColor(v.color) && isPaletteColor(v.contrast);
}

export const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : '');

/** Share a chart, or return the link it already has: sharing the same chart twice is the same chart. */
export async function shareChart(userId: string, name: string, chart: ChartInput, notes = ''): Promise<{ id: string } | 'limit'> {
	const sql = database();
	const existing = await sql`
		UPDATE shared_charts SET name = ${name}, notes = ${notes}
		WHERE user_id = ${userId} AND motif = ${chart.motif} AND color = ${chart.color} AND contrast = ${chart.contrast}
		RETURNING id
	`;
	if (existing.length) return { id: existing[0].id };
	const count = await sql`SELECT count(*)::int AS n FROM shared_charts WHERE user_id = ${userId}`;
	if (count[0].n >= MAX_SHARED) return 'limit';
	const rows = await sql`
		INSERT INTO shared_charts (user_id, name, motif, color, contrast, size, notes)
		VALUES (${userId}, ${name}, ${chart.motif}, ${chart.color}, ${chart.contrast}, ${sizeOf(chart.motif)}, ${notes})
		ON CONFLICT (user_id, motif, color, contrast) DO UPDATE SET name = EXCLUDED.name, notes = EXCLUDED.notes
		RETURNING id
	`;
	return { id: rows[0].id };
}

/** Change the notes on a chart you shared. Returns whether the caller owned it. */
export async function setChartNotes(userId: string, id: string, notes: string) {
	const rows = await database()`UPDATE shared_charts SET notes = ${notes} WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

/** Remove a chart from the library. Returns whether the caller owned it. */
export async function unshareChart(userId: string, id: string) {
	const rows = await database()`DELETE FROM shared_charts WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

const toChart = (row: Record<string, any>): SharedChart => ({ id: row.id, name: row.name, motif: row.motif, color: row.color, contrast: row.contrast, author: row.author, authorPhoto: cleanPhoto(row.author_photo), createdAt: row.created_at, notes: cleanNotes(row.notes) });

export async function getSharedChart(id: string): Promise<(SharedChart & { userId: string }) | null> {
	if (!isId(id)) return null;
	const rows = await database()`
		SELECT c.id, c.name, c.motif, c.color, c.contrast, c.notes, c.created_at, c.user_id, u.ravelry_username AS author, u.photo_url AS author_photo
		FROM shared_charts c JOIN users u ON u.id = c.user_id
		WHERE c.id = ${id} LIMIT 1
	`;
	return rows[0] ? { ...toChart(rows[0]), userId: rows[0].user_id } : null;
}

export type ListedChart = SharedChart & { likes: number };

/** The library, newest first or most liked first, optionally narrowed to one size and one main colour. */
export async function listSharedCharts(size: string, colour: string, sort: Sort, page: number) {
	const rows = await database()`
		SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, l.n AS likes, u.ravelry_username AS author, u.photo_url AS author_photo
		FROM shared_charts c
		JOIN users u ON u.id = c.user_id
		LEFT JOIN LATERAL (SELECT count(*)::int AS n FROM chart_likes WHERE chart_id = c.id) l ON true
		WHERE (${size} = '' OR c.size = ${size}) AND (${colour} = '' OR c.color = ${colour})
		ORDER BY (CASE WHEN ${sort} = 'loved' THEN l.n ELSE 0 END) DESC, c.created_at DESC
		LIMIT ${PAGE_SIZE + 1} OFFSET ${page * PAGE_SIZE}
	`;
	return { charts: rows.slice(0, PAGE_SIZE).map((row): ListedChart => ({ ...toChart(row), likes: row.likes })), more: rows.length > PAGE_SIZE };
}

/** What the filter rail needs from every shared chart: its size and main colour. */
export async function listChartFacets(): Promise<Record<string, string>[]> {
	const rows = await database()`SELECT size, color FROM shared_charts`;
	return rows.map((row) => ({ size: row.size, colour: row.color }));
}
