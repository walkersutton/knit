import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { database } from '$lib/server/db';

/** Mark a feedback item as read. */
export const POST: RequestHandler = async ({ params }) => {
	await database()`
		UPDATE feedback SET read = true WHERE id = ${params.id}
	`;
	return json({ ok: true });
};
