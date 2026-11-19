import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { featured } from '$lib/server/likes';
import { cleanImage } from '$lib/server/patterns';
import { featuredDesigns, featuredPictures, renderKey, saveRender } from '$lib/server/renders';

export const prerender = false;

/**
 * The community favourites for the home page: the most-liked chart and pattern, each with its stored 3D picture
 * (base64 JPEG) once a browser has drawn one. Public and cached for a few minutes.
 */
export const GET: RequestHandler = async () => {
	const picks = await featured().catch(() => ({ chart: null, pattern: null }));
	const pictures = await featuredPictures(picks).catch(() => ({ chart: null, pattern: null }));
	return json({ ...picks, pictures }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } });
};

/** Keep the 3D picture a visitor's browser drew of a favourite that had none. Only the current favourites are taken. */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const kind = body?.kind;
	if (kind !== 'chart' && kind !== 'pattern') error(400, 'Which favourite is this?');
	const image = cleanImage(body.image);
	if (!image) error(400, 'That is not a picture.');
	const design = featuredDesigns(await featured().catch(() => error(503, 'Not available right now.')))[kind as 'chart' | 'pattern'];
	if (!design) error(409, 'That is no longer a favourite.');
	await saveRender(renderKey(design), image).catch(() => error(503, 'Not available right now.'));
	return new Response(null, { status: 204 });
};
