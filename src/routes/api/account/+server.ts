import { env } from '$lib/server/env';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { database } from '$lib/server/db';

export const prerender = false;

export const GET: RequestHandler = async ({ cookies }) => {
	const account = await getAccount(cookies);
	if (!account) return json({ account: null, data: null, revision: 0, configured: Boolean(env.DATABASE_URL && env.RAVELRY_CLIENT_ID && env.RAVELRY_CLIENT_SECRET) });
	const sql = database();
	const rows = await sql`SELECT data, revision FROM account_data WHERE user_id = ${account.id} LIMIT 1`;
	return json({ account, data: rows[0]?.data ?? null, revision: rows[0]?.revision ?? 0 });
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in to sync your patterns.');
	const body = await request.json().catch(() => null);
	const data = body?.data;
	if (!data || typeof data !== 'object' || Array.isArray(data)) error(400, 'Invalid account data.');
	const revision = body?.revision;
	if (!Number.isInteger(revision) || revision < 0) error(400, 'Invalid account data revision.');
	const serialized = JSON.stringify(data);
	if (serialized.length > 1_000_000) error(413, 'Your saved patterns are too large to sync.');
	const sql = database();
	const rows = await sql`
		INSERT INTO account_data (user_id, data, revision, updated_at)
		SELECT ${account.id}, ${serialized}::jsonb, 1, now() WHERE ${revision} = 0
		ON CONFLICT (user_id) DO UPDATE
		SET data = EXCLUDED.data, revision = account_data.revision + 1, updated_at = now()
		WHERE account_data.revision = ${revision}
		RETURNING revision
	`;
	if (rows.length) return json({ ok: true, revision: rows[0].revision });
	const latest = await sql`SELECT data, revision FROM account_data WHERE user_id = ${account.id} LIMIT 1`;
	return json({ conflict: true, account, data: latest[0]?.data ?? null, revision: latest[0]?.revision ?? 0 }, { status: 409 });
};
