import { database } from './db';

/** How many circles the home page shows; the rest are counted. */
export const MEMBER_LIMIT = 48;

export type Member = { username: string; photo: string | null };

/** A photo is only passed on if it is an https URL, so a bad value can never become a script or a tracking pixel over plain http. */
export function cleanPhoto(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 500) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
}

/** The best small picture Ravelry gives for a knitter: the circles are never larger than the small one. */
export function profilePhoto(user?: { small_photo_url?: unknown; tiny_photo_url?: unknown; photo_url?: unknown }) {
	return cleanPhoto(user?.small_photo_url) ?? cleanPhoto(user?.tiny_photo_url) ?? cleanPhoto(user?.photo_url);
}

/** The knitters who have signed up, newest first, and how many there are in all. */
export async function listMembers(): Promise<{ members: Member[]; total: number }> {
	const sql = database();
	const [rows, count] = await Promise.all([
		sql`SELECT ravelry_username AS username, photo_url AS photo FROM users ORDER BY created_at DESC LIMIT ${MEMBER_LIMIT}`,
		sql`SELECT count(*)::int AS n FROM users`
	]);
	return {
		members: rows.map((r) => ({ username: String(r.username), photo: cleanPhoto(r.photo) })),
		total: count[0].n
	};
}
