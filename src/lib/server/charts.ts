import { database } from './db';
import { isPaletteColor } from '$lib/sweater/library';
import { tileOfMotif, validMotif } from '$lib/sweater/motifs';

export const PAGE_SIZE = 24;
/** What one knitter can have shared at once. */
export const MAX_SHARED = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedChart = { id: string; name: string; motif: string; color: string; contrast: string; author: string; createdAt: string };
/** What a knitter sends to share a chart. */
export type ChartInput = { motif: string; color: string; contrast: string };

export const isId = (value: string) => UUID.test(value);
export const sizeOf = (motif: string) => (tileOfMotif(motif).fine ? 'fine' : 'standard');

/** A chart is only shared if it is a whole one the designer can draw, in colours its palette offers. */
export function shareable(value: unknown): value is ChartInput {
	const v = value as Record<string, unknown> | null;
	return !!v && validMotif(v.motif) && isPaletteColor(v.color) && isPaletteColor(v.contrast);
}

export const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : '');

/** Share a chart, or return the link it already has: sharing the same chart twice is the same chart. */
export async function shareChart(userId: string, name: string, chart: ChartInput): Promise<{ id: string } | 'limit'> {
	const sql = database();
	const existing = await sql`
		UPDATE shared_charts SET name = ${name}
		WHERE user_id = ${userId} AND motif = ${chart.motif} AND color = ${chart.color} AND contrast = ${chart.contrast}
		RETURNING id
	`;
	if (existing.length) return { id: existing[0].id };
	const count = await sql`SELECT count(*)::int AS n FROM shared_charts WHERE user_id = ${userId}`;
	if (count[0].n >= MAX_SHARED) return 'limit';
	const rows = await sql`
		INSERT INTO shared_charts (user_id, name, motif, color, contrast, size)
		VALUES (${userId}, ${name}, ${chart.motif}, ${chart.color}, ${chart.contrast}, ${sizeOf(chart.motif)})
		ON CONFLICT (user_id, motif, color, contrast) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`;
	return { id: rows[0].id };
}

/** Remove a chart from the library. Returns whether the caller owned it. */
export async function unshareChart(userId: string, id: string) {
	const rows = await database()`DELETE FROM shared_charts WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
	return rows.length > 0;
}

const toChart = (row: Record<string, any>): SharedChart => ({ id: row.id, name: row.name, motif: row.motif, color: row.color, contrast: row.contrast, author: row.author, createdAt: row.created_at });

export async function getSharedChart(id: string): Promise<(SharedChart & { userId: string }) | null> {
	if (!isId(id)) return null;
	const rows = await database()`
		SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, c.user_id, u.ravelry_username AS author
		FROM shared_charts c JOIN users u ON u.id = c.user_id
		WHERE c.id = ${id} LIMIT 1
	`;
	return rows[0] ? { ...toChart(rows[0]), userId: rows[0].user_id } : null;
}

/** The library, newest first, optionally filtered by size and by words in the name or the author. */
export async function listSharedCharts(query: string, size: string, page: number) {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
	const rows = await database()`
		SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, u.ravelry_username AS author
		FROM shared_charts c JOIN users u ON u.id = c.user_id
		WHERE (${size} = '' OR c.size = ${size})
			AND NOT EXISTS (
				SELECT 1 FROM unnest(${words}::text[]) AS w
				WHERE position(w IN lower(c.name || ' ' || u.ravelry_username)) = 0
			)
		ORDER BY c.created_at DESC
		LIMIT ${PAGE_SIZE + 1} OFFSET ${page * PAGE_SIZE}
	`;
	return { charts: rows.slice(0, PAGE_SIZE).map(toChart), more: rows.length > PAGE_SIZE };
}
