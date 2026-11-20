import type { PageServerLoad } from './$types';
import { database } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const sql = database();
	const rows = await sql`
		SELECT id, name, email, message, read, created_at
		FROM feedback
		ORDER BY created_at DESC
	`;
	return {
		feedback: rows.map((r: Record<string, any>) => ({
			id: r.id,
			name: r.name,
			email: r.email,
			message: r.message,
			read: r.read,
			createdAt: r.created_at
		}))
	};
};
