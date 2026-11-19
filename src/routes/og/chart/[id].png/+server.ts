import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSharedChart } from '$lib/server/charts';
import { chartCard } from '$lib/server/og';
import { chartSize, isCenterpieceChart } from '$lib/sweater/library';

export const prerender = false;

/** The preview image shown when a shared chart's link is posted somewhere. */
export const GET: RequestHandler = async ({ params }) => {
	const chart = await getSharedChart(params.id).catch(() => error(503, 'Not available right now.'));
	if (!chart) error(404, 'No such chart.');
	const detail = isCenterpieceChart(chart.motif) ? `${chartSize(chart.motif).replace(' centerpiece', '')} picture, worked once on the front` : `${chartSize(chart.motif)} two-colour chart`;
	return chartCard(chart.name, detail, chart.author, chart.motif, chart.color, chart.contrast);
};
