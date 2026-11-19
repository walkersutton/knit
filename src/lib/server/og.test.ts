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

// A small JPEG, standing in for the picture a browser takes of the 3D model.
const PHOTO = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAmACEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6Yoor46pYLBfWub3rWt0FWreytofYtFfHVfYtGNwX1Xl96979Ao1va30CiiiuE3CvjqvsWvmv/hWfi7/oE/8AkzD/APF17OU1YU+fnkltv8zkxUXK1kcdX2LXzX/wrPxd/wBAn/yZh/8Ai6+lKM2qwqcnJJPfb5BhYuN7oKKKK8Y6wooooAKKKKACiiigD//Z';

describe('preview images', () => {
	it('uses the captured 3D picture when there is one', async () => {
		const response = await patternCard('Photo', 'detail', 'someone', DEFAULT_DESIGN, PHOTO);
		expect([...(await png(response, 'photo')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
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
	it('renders a centerpiece as a PNG', async () => {
		const heart = '5x4:0101011111011100010' + '0';
		const response = await chartCard('Heart', '5 × 4 picture, worked once on the front', 'someone', heart, '#465e9d', '#faf3dc');
		expect([...(await png(response, 'centerpiece')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
	it('renders the site-wide image', async () => {
		expect([...(await png(await siteCard(), 'site')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
	it('renders a knitter as a PNG, even with a very long name', async () => {
		const response = await personCard('a'.repeat(90), '3 shared patterns · 1 shared chart');
		expect([...(await png(response, 'person')).slice(1, 4)]).toEqual([80, 78, 71]);
	});
});
