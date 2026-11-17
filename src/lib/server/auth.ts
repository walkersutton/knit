import { createHash, randomBytes, webcrypto } from 'node:crypto';
import { env } from './env';
import type { Cookies } from '@sveltejs/kit';
import { database } from './db';

export const SESSION_COOKIE = 'knit_session';
const SESSION_DAYS = 30;
const CALLBACK_PATH = '/auth/ravelry/callback';

export function callbackUrl(origin: string) {
	return new URL(CALLBACK_PATH, env.PUBLIC_ORIGIN || origin).toString();
}

export function ravelryConfigured() {
	return Boolean(env.RAVELRY_CLIENT_ID && env.RAVELRY_CLIENT_SECRET);
}

export function randomToken(bytes = 32) {
	return randomBytes(bytes).toString('base64url');
}

export function digest(value: string) {
	return createHash('sha256').update(value).digest('hex');
}

export async function pkceChallenge(verifier: string) {
	const encoded = new TextEncoder().encode(verifier);
	const hash = await webcrypto.subtle.digest('SHA-256', encoded);
	return Buffer.from(hash).toString('base64url');
}

export function cookieOptions(secure: boolean) {
	return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

export async function getAccount(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const sql = database();
	const rows = await sql`
		SELECT users.id, users.ravelry_username AS username
		FROM sessions
		JOIN users ON users.id = sessions.user_id
		WHERE sessions.token_hash = ${digest(token)} AND sessions.expires_at > now()
		LIMIT 1
	`;
	return (rows[0] as { id: string; username: string } | undefined) ?? null;
}

export async function createSession(userId: string) {
	const token = randomToken();
	const sql = database();
	await sql`
		INSERT INTO sessions (token_hash, user_id, expires_at)
		VALUES (${digest(token)}, ${userId}, now() + (${SESSION_DAYS} * interval '1 day'))
	`;
	return token;
}
