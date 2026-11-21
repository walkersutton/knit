import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { featured } from '$lib/server/likes';
import { cleanImage } from '$lib/server/patterns';
import { featuredDesign, featuredPictures, renderKey, saveRender } from '$lib/server/renders';

export const prerender = false;

/**
 * The community favourites for the home page: the most-liked patterns, charts and centerpieces, with each pattern's
 * stored 3D picture (base64 JPEG, by pattern id) once a browser has drawn one. Public and cached for a few minutes.
 */
export const GET: RequestHandler = async () => {
	const picks = await featured().catch(() => ({ patterns: [], charts: [], centerpieces: [] }));
	const pictures = await featuredPictures(picks).catch(() => ({}));
	return json({ ...picks, pictures }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } });
};

/** Keep the 3D picture a visitor's browser drew of a featured pattern that had none. Only current favourites are taken. */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const id = body?.id;
	if (typeof id !== 'string') error(400, 'Which pattern is this?');
	const image = cleanImage(body.image);
	if (!image) error(400, 'That is not a picture.');
	const design = featuredDesign(await featured().catch(() => error(503, 'Not available right now.')), id);
	if (!design) error(409, 'That is no longer a favourite.');
	await saveRender(renderKey(design), image).catch(() => error(503, 'Not available right now.'));
	return new Response(null, { status: 204 });
};
