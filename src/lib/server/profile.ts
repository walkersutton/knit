import { database } from './db';
import { cleanPhoto } from './members';
import { readBio, type Bio } from './bio';
import { SEED_USER } from './seed';
import type { SharedChart } from './charts';
import type { SharedPattern } from './patterns';

export type Profile = {
	username: string;
	/** knit's own house account (see seed.ts): a server account with no Ravelry person behind it. */
	house: boolean;
	photo: string | null;
	joinedAt: string;
	bio: Bio | null;
	charts: SharedChart[];
	patterns: SharedPattern[];
	likedCharts: SharedChart[];
	likedPatterns: SharedPattern[];
};

/** Everything shown on a page is capped; a knitter can share at most MAX_SHARED of each, and likes are cut at the same size. */
const CAP = 100;

const chart = (r: Record<string, any>): SharedChart => ({ id: r.id, name: r.name, motif: r.motif, color: r.color, contrast: r.contrast, author: r.author, authorPhoto: cleanPhoto(r.author_photo), createdAt: r.created_at });
const pattern = (r: Record<string, any>): SharedPattern => ({ id: r.id, slug: r.slug, name: r.name, design: r.design, author: r.author, authorPhoto: cleanPhoto(r.author_photo), createdAt: r.created_at });

/** A knitter's public page: who they are on Ravelry, what they have shared, and what they have liked. Null if there is no such knitter. */
export async function getProfile(username: string): Promise<Profile | null> {
	if (!username || username.length > 100) return null;
	const sql = database();
	const users = await sql`
		SELECT id, ravelry_user_id, ravelry_username AS username, photo_url AS photo, created_at, bio
		FROM users WHERE lower(ravelry_username) = lower(${username}) LIMIT 1
	`;
	const user = users[0];
	if (!user) return null;
	const [charts, patterns, likedCharts, likedPatterns] = await Promise.all([
		sql`
			SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
			FROM shared_charts c JOIN users u ON u.id = c.user_id
			WHERE c.user_id = ${user.id} ORDER BY c.created_at DESC LIMIT ${CAP}
		`,
		sql`
			SELECT p.id, p.slug, p.name, p.design, p.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
			FROM shared_patterns p JOIN users u ON u.id = p.user_id
			WHERE p.user_id = ${user.id} ORDER BY p.created_at DESC LIMIT ${CAP}
		`,
		sql`
			SELECT c.id, c.name, c.motif, c.color, c.contrast, c.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
			FROM chart_likes l JOIN shared_charts c ON c.id = l.chart_id JOIN users u ON u.id = c.user_id
			WHERE l.user_id = ${user.id} ORDER BY l.created_at DESC LIMIT ${CAP}
		`,
		sql`
			SELECT p.id, p.slug, p.name, p.design, p.created_at, u.ravelry_username AS author, u.photo_url AS author_photo
			FROM pattern_likes l JOIN shared_patterns p ON p.id = l.pattern_id JOIN users u ON u.id = p.user_id
			WHERE l.user_id = ${user.id} ORDER BY l.created_at DESC LIMIT ${CAP}
		`
	]);
	return {
		username: String(user.username),
		house: user.ravelry_user_id === SEED_USER.ravelryUserId,
		photo: cleanPhoto(user.photo),
		joinedAt: user.created_at,
		bio: readBio(user.bio),
		charts: charts.map(chart),
		patterns: patterns.map(pattern),
		likedCharts: likedCharts.map(chart),
		likedPatterns: likedPatterns.map(pattern)
	};
}
