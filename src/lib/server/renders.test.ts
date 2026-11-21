import { describe, expect, it, vi } from 'vitest';

// The module talks to the database only inside its queries; keys and designs are pure.
vi.mock('./db', () => ({ database: () => { throw new Error('no database in tests'); } }));
// The real module reads the encrypted secrets; only its hash is needed here.
vi.mock('./auth', async () => {
	const { createHash } = await import('node:crypto');
	return { digest: (v: string) => createHash('sha256').update(v).digest('hex') };
});

import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import { starterMotif } from '$lib/sweater/motifs';
import type { Featured } from './likes';
import { featuredDesign, RENDER_LOOK, renderKey } from './renders';

const chart = { id: 'c', name: 'Chart', motif: starterMotif(), color: DEFAULT_DESIGN.color, contrast: DEFAULT_DESIGN.contrast, author: 'a', authorPhoto: null, createdAt: '', likes: 1 };
const pattern = { id: 'p', slug: 'pattern', name: 'Pattern', design: { ...DEFAULT_DESIGN }, author: 'a', authorPhoto: null, createdAt: '', likes: 2 };

describe('renderKey', () => {
	it('does not depend on the order of the design’s fields', () => {
		const reversed = Object.fromEntries(Object.entries(DEFAULT_DESIGN).reverse()) as typeof DEFAULT_DESIGN;
		expect(renderKey(reversed)).toBe(renderKey(DEFAULT_DESIGN));
	});
	it('changes with the design and carries the viewer’s look version', () => {
		expect(renderKey({ ...DEFAULT_DESIGN, color: DEFAULT_DESIGN.contrast })).not.toBe(renderKey(DEFAULT_DESIGN));
		expect(renderKey(DEFAULT_DESIGN).startsWith(`${RENDER_LOOK}:`)).toBe(true);
	});
});

describe('featuredDesign', () => {
	const picks: Featured = { patterns: [pattern], charts: [chart], centerpieces: [] };
	it('finds a featured pattern’s design by id', () => {
		expect(featuredDesign(picks, 'p')).toEqual(pattern.design);
	});
	it('has nothing for a chart or a pattern that is not featured', () => {
		expect(featuredDesign(picks, 'c')).toBeUndefined();
		expect(featuredDesign(picks, 'nope')).toBeUndefined();
	});
});
