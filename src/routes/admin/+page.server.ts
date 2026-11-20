import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { database } from '$lib/server/db';
import { env } from '$lib/server/env';
import { isOwner, signInUrl } from '$lib/server/owner';

// Feedback inbox for the site's owner, who signs in on walkersutton.com (see $lib/server/owner).

export const prerender = false;

export const load: PageServerLoad = async ({ cookies, url, setHeaders }) => {
	if (!(await isOwner(cookies))) {
		redirect(303, signInUrl(new URL(url.pathname + url.search, env.PUBLIC_ORIGIN || url.origin).href));
	}
	setHeaders({ 'cache-control': 'private, no-store' });
	const rows = await database()`
		SELECT id, name, email, message, read, created_at
		FROM feedback
		ORDER BY created_at DESC
	`;
	return {
		feedback: rows.map((r) => ({
			id: r.id as string,
			name: r.name as string,
			email: r.email as string,
			message: r.message as string,
			read: r.read as boolean,
			createdAt: new Date(r.created_at).toISOString()
		}))
	};
};

/** The submission a form action names, once the owner is confirmed. */
async function target(cookies: Parameters<typeof isOwner>[0], request: Request) {
	if (!(await isOwner(cookies))) error(404, 'Not found');
	const id = String((await request.formData()).get('id') ?? '');
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	return id;
}

export const actions: Actions = {
	read: async ({ cookies, request }) => {
		const id = await target(cookies, request);
		if (!id) return fail(400);
		await database()`UPDATE feedback SET read = true WHERE id = ${id}`;
	},
	unread: async ({ cookies, request }) => {
		const id = await target(cookies, request);
		if (!id) return fail(400);
		await database()`UPDATE feedback SET read = false WHERE id = ${id}`;
	},
	delete: async ({ cookies, request }) => {
		const id = await target(cookies, request);
		if (!id) return fail(400);
		await database()`DELETE FROM feedback WHERE id = ${id}`;
	}
};
