import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { database } from '$lib/server/db';

/** Accept feedback from any visitor. No auth required. */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body.message !== 'string' || body.message.trim().length < 10) {
		error(400, 'Please write at least 10 characters.');
	}
	const name = (body.name ?? '').toString().slice(0, 200);
	const email = (body.email ?? '').toString().slice(0, 300);
	const message = body.message.trim();
	if (message.length < 10) error(400, 'Please write at least 10 characters.');
	if (message.length > 5000) error(400, 'Message is too long.');

	await database()`
		INSERT INTO feedback (name, email, message)
		VALUES (${name}, ${email}, ${message})
	`;
	return json({ ok: true });
};
