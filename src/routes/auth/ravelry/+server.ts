import { env } from '$lib/server/env';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callbackUrl, pkceChallenge, randomToken, ravelryConfigured } from '$lib/server/auth';

export const prerender = false;

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!ravelryConfigured()) error(503, 'Ravelry sign-in is not configured yet.');
	const state = randomToken(24);
	const verifier = randomToken(48);
	cookies.set('knit_ravelry_oauth', JSON.stringify({ state, verifier }), {
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		path: '/auth/ravelry/callback',
		maxAge: 10 * 60
	});
	const authorize = new URL('https://auth.ravelry.com/oauth2/auth');
	authorize.search = new URLSearchParams({
		response_type: 'code',
		client_id: env.RAVELRY_CLIENT_ID!,
		redirect_uri: callbackUrl(url.origin),
		state,
		scope: 'offline_access',
		code_challenge: await pkceChallenge(verifier),
		code_challenge_method: 'S256'
	}).toString();
	redirect(302, authorize);
};
