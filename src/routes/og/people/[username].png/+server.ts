import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProfile } from '$lib/server/profile';
import { personCard } from '$lib/server/og';

export const prerender = false;

/** The preview image shown when a knitter's page is linked. */
export const GET: RequestHandler = async ({ params }) => {
	const profile = await getProfile(params.username).catch(() => error(503, 'Not available right now.'));
	if (!profile) error(404, 'No such knitter.');
	const n = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
	return personCard(profile.username, `${n(profile.patterns.length, 'shared pattern')} · ${n(profile.charts.length, 'shared chart')}`);
};
