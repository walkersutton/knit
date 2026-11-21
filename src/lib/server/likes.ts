import { database } from './db';
import { cleanPhoto } from './members';
import type { SharedChart } from './charts';
import type { SharedPattern } from './patterns';

export type Kind = 'chart' | 'pattern';

/** Like or unlike a shared item. Returns false if the item does not exist. */
export async function setLike(kind: Kind, userId: string, id: string, liked: boolean) {
	const sql = database();
	if (kind === 'chart') {
		if (!liked) {
			await sql`DELETE FROM chart_likes WHERE user_id = ${userId} AND chart_id = ${id}`;
			return true;
		}
		await sql`INSERT INTO chart_likes (user_id, chart_id) SELECT ${userId}, id FROM shared_charts WHERE id = ${id} ON CONFLICT DO NOTHING`;
		return (await sql`SELECT 1 FROM shared_charts WHERE id = ${id}`).length > 0;
	}
	if (!liked) {
		await sql`DELETE FROM pattern_likes WHERE user_id = ${userId} AND pattern_id = ${id}`;
		return true;
	}
	await sql`INSERT INTO pattern_likes (user_id, pattern_id) SELECT ${userId}, id FROM shared_patterns WHERE id = ${id} ON CONFLICT DO NOTHING`;
	return (await sql`SELECT 1 FROM shared_patterns WHERE id = ${id}`).length > 0;
}

/** How many knitters like an item, and whether this one does. */
export async function likesOf(kind: Kind, id: string, userId?: string) {
	const sql = database();
	const who = userId ?? null;
	const rows =
		kind === 'chart'
			? await sql`SELECT count(*)::int AS n, coalesce(bool_or(user_id = ${who}), false) AS mine FROM chart_likes WHERE chart_id = ${id}`
			: await sql`SELECT count(*)::int AS n, coalesce(bool_or(user_id = ${who}), false) AS mine FROM pattern_likes WHERE pattern_id = ${id}`;
	return { likes: rows[0].n as number, liked: rows[0].mine as boolean };
}

export type FeaturedChart = SharedChart & { likes: number };
export type FeaturedPattern = SharedPattern & { likes: number };
export type Featured = { patterns: FeaturedPattern[]; charts: FeaturedChart[]; centerpieces: FeaturedChart[] };

/** How many of each kind the home page shows. */
export const FEATURED_COUNT = 5;

/**
 * The most-liked patterns, charts and centerpieces, the newest winning a tie. Nothing is featured until someone has
 * liked it. A centerpiece is a chart whose motif carries its size ("20x11:…"); a repeat is only 0s and 1s.
 */
export async function featured(): Promise<Featured> {
	const sql = database();
	const charts = (centerpiece: boolean) => sql`
		SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, u.ravelry_username AS author, u.photo_url AS author_photo, count(l.user_id)::int AS likes
		FROM shared_charts c JOIN users u ON u.id = c.user_id JOIN chart_likes l ON l.chart_id = c.id
		WHERE (position(':' in c.motif) > 0) = ${centerpiece}
		GROUP BY c.id, u.ravelry_username, u.photo_url
		ORDER BY likes DESC, c.created_at DESC LIMIT ${FEATURED_COUNT}
	`;
	const [patterns, repeats, centerpieces] = await Promise.all([
		sql`
			SELECT p.id, p.slug, p.name, p.design, p.created_at, u.ravelry_username AS author, u.photo_url AS author_photo, count(l.user_id)::int AS likes
			FROM shared_patterns p JOIN users u ON u.id = p.user_id JOIN pattern_likes l ON l.pattern_id = p.id
			GROUP BY p.id, u.ravelry_username, u.photo_url
			ORDER BY likes DESC, p.created_at DESC LIMIT ${FEATURED_COUNT}
		`,
		charts(false),
		charts(true)
	]);
	const chart = (c: Record<string, any>): FeaturedChart => ({ id: c.id, name: c.name, motif: c.motif, color: c.color, contrast: c.contrast, author: c.author, authorPhoto: cleanPhoto(c.author_photo), createdAt: c.created_at, likes: c.likes });
	return {
		patterns: patterns.map((p) => ({ id: p.id, slug: p.slug, name: p.name, design: p.design, author: p.author, authorPhoto: cleanPhoto(p.author_photo), createdAt: p.created_at, likes: p.likes })),
		charts: repeats.map(chart),
		centerpieces: centerpieces.map(chart)
	};
}
