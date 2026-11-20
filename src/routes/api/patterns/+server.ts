import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '$lib/server/auth';
import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import { cleanImage, cleanName, cleanNotes, setImage, shareable, sharePattern } from '$lib/server/patterns';

export const prerender = false;

/** Share a design: it gets a public page at /pattern/<slug> (made from its name) and a place in the catalogue. */
export const POST: RequestHandler = async ({ cookies, request }) => {
	const account = await getAccount(cookies);
	if (!account) error(401, 'Sign in with Ravelry to share a pattern.');
	const body = await request.json().catch(() => null);
	// Older clients and hand-made links may predate the accessory fields: fill them before checking.
	const design = body?.design && typeof body.design === 'object' ? { ...DEFAULT_DESIGN, ...(body.design as Record<string, unknown>) } : null;
	if (!shareable(design)) error(400, 'That design cannot be shared.');
	const shared = await sharePattern(account.id, cleanName(body.name) || 'My pattern', design, cleanNotes(body.notes));
	if (shared === 'limit') error(409, 'You have shared as many patterns as you can. Remove one to share another.');
	const image = cleanImage(body.image);
	if (image) await setImage(account.id, shared.id, image);
	return json({ id: shared.id, slug: shared.slug });
};
