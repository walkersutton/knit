import { env } from '$lib/server/env';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callbackUrl, cookieOptions, createSession, ravelryConfigured, SESSION_COOKIE } from '$lib/server/auth';
import { database } from '$lib/server/db';

export const prerender = false;

type OAuthCookie = { state: string; verifier: string };
type TokenResponse = { access_token?: string; error?: string };
type CurrentUserResponse = { user?: { id?: number | string; username?: string } };

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!ravelryConfigured()) error(503, 'Ravelry sign-in is not configured yet.');
	const saved = cookies.get('knit_ravelry_oauth');
	cookies.delete('knit_ravelry_oauth', { path: '/auth/ravelry/callback' });
	if (!saved || url.searchParams.has('error')) redirect(303, '/account?signin=cancelled');
	let oauth: OAuthCookie;
	try {
		oauth = JSON.parse(saved);
	} catch {
		error(400, 'Invalid sign-in attempt. Please try again.');
	}
	const code = url.searchParams.get('code');
	if (!code || url.searchParams.get('state') !== oauth.state) error(400, 'Ravelry sign-in could not be verified. Please try again.');
	const form = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: callbackUrl(url.origin),
		code_verifier: oauth.verifier
	});
	const credentials = Buffer.from(`${env.RAVELRY_CLIENT_ID}:${env.RAVELRY_CLIENT_SECRET}`).toString('base64');
	const tokenResponse = await fetch('https://www.ravelry.com/oauth2/token', {
		method: 'POST',
		headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
		body: form
	});
	const token = (await tokenResponse.json().catch(() => ({}))) as TokenResponse;
	if (!tokenResponse.ok || !token.access_token) error(502, 'Ravelry could not complete sign-in. Please try again.');
	const profileResponse = await fetch('https://api.ravelry.com/current_user.json', {
		headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' }
	});
	const profile = (await profileResponse.json().catch(() => ({}))) as CurrentUserResponse;
	const ravelryId = profile.user?.id;
	const username = profile.user?.username;
	if (!profileResponse.ok || (typeof ravelryId !== 'number' && typeof ravelryId !== 'string') || !username) {
		error(502, 'Ravelry did not return a usable account profile. Please try again.');
	}
	const sql = database();
	const users = await sql`
		INSERT INTO users (ravelry_user_id, ravelry_username)
		VALUES (${String(ravelryId)}, ${username})
		ON CONFLICT (ravelry_user_id) DO UPDATE SET ravelry_username = EXCLUDED.ravelry_username
		RETURNING id
	`;
	const session = await createSession(String(users[0].id));
	cookies.set(SESSION_COOKIE, session, cookieOptions(url.protocol === 'https:'));
	redirect(303, '/account?signin=success');
};
