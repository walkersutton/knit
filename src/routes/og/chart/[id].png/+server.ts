import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSharedChart } from '$lib/server/charts';
import { chartCard } from '$lib/server/og';
import { tileOfMotif } from '$lib/sweater/motifs';

export const prerender = false;

/** The preview image shown when a shared chart's link is posted somewhere. */
export const GET: RequestHandler = async ({ params }) => {
	const chart = await getSharedChart(params.id).catch(() => error(503, 'Not available right now.'));
	if (!chart) error(404, 'No such chart.');
	const tile = tileOfMotif(chart.motif);
	return chartCard(chart.name, `${tile.st} × ${tile.rows} two-colour chart`, chart.author, chart.motif, chart.color, chart.contrast);
};
