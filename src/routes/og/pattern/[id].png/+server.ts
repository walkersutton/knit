import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getImage, getShared } from '$lib/server/patterns';
import { patternCard } from '$lib/server/og';
import { designDetail } from '$lib/sweater/random';

export const prerender = false;

/** The preview image shown when a shared pattern's link is posted somewhere. */
export const GET: RequestHandler = async ({ params }) => {
	const shared = await getShared(params.id).catch(() => error(503, 'Not available right now.'));
	if (!shared) error(404, 'No such pattern.');
	return patternCard(shared.name, designDetail(shared.design), shared.author, shared.design, await getImage(shared.id));
};
