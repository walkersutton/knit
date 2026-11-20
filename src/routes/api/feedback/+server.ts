import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { database } from '$lib/server/db';
import { env } from '$lib/server/env';
import { hostnamesFrom, TEST_SECRET, verifyTurnstile } from '$lib/server/turnstile';

/** Accept feedback from any visitor who passes Cloudflare Turnstile. No sign-in required. */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body.message !== 'string' || body.message.trim().length < 10) {
		error(400, 'Please write at least 10 characters.');
	}

	const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
	const email = typeof body.email === 'string' ? body.email.trim().slice(0, 300) : '';
	const message = body.message.trim();
	if (message.length > 5000) error(400, 'Message is too long.');

	// Locally, without a real secret, Cloudflare's test keys stand in. In production a missing secret turns everyone away.
	const testing = dev && !env.TURNSTILE_SECRET;
	const human = await verifyTurnstile(body.turnstile, {
		secret: env.TURNSTILE_SECRET || (testing ? TEST_SECRET : ''),
		action: 'feedback',
		hostnames: testing ? null : hostnamesFrom(env.TURNSTILE_HOSTNAMES, env.PUBLIC_ORIGIN),
		ip: getClientAddress()
	});
	if (!human) error(403, "We couldn't check you're not a bot. Please try again.");

	await database()`
		INSERT INTO feedback (name, email, message)
		VALUES (${name}, ${email}, ${message})
	`;
	return json({ ok: true });
};
