import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chartCard, patternCard, personCard, siteCard } from './og';
import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import { starterMotif } from '$lib/sweater/motifs';

const OUT = process.env.OG_OUT;
async function png(response: Response, name: string) {
	const body = new Uint8Array(await response.arrayBuffer());
	if (OUT) writeFileSync(`${OUT}/${name}.png`, body);
	return body;
}

describe('preview images', () => {
	it('renders a pattern as a PNG', async () => {
		const response = await patternCard('Brick Striped Cardigan', 'Adult M · Raglan cardigan · Worsted', 'someone', { ...DEFAULT_DESIGN, pattern: 'Stripes' });
		expect(response.headers.get('content-type')).toBe('image/png');
		const body = await png(response, 'pattern');
		expect([...body.slice(1, 4)]).toEqual([80, 78, 71]);
	});
	it('renders a chart as a PNG', async () => {
		const response = await chartCard('Diamonds', '12 × 16 two-colour chart', 'someone', starterMotif(), '#faf3dc', '#c8543e');
		expect([...(await png(response, 'chart')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
	it('renders the site-wide image', async () => {
		expect([...(await png(await siteCard(), 'site')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
	it('renders a knitter as a PNG, even with a very long name', async () => {
		const response = await personCard('a'.repeat(90), '3 shared patterns · 1 shared chart');
		expect([...(await png(response, 'person')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
});
