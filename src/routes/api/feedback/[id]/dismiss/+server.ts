import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { database } from '$lib/server/db';

/** Permanently delete a feedback item. */
export const POST: RequestHandler = async ({ params }) => {
	await database()`
		DELETE FROM feedback WHERE id = ${params.id}
	`;
	return json({ ok: true });
};
