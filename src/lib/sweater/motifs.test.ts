import { describe, expect, it } from 'vitest';
import { blankMotif, chart, contrastShare, longestFloat, PATTERNS, starterMotif, tileOf, TILE_ROWS, TILE_ST, validMotif } from './motifs';
import { estimate, isColourwork, writePattern } from './pattern';
import { baseDesign } from './testDesigns';

describe('motifs', () => {
	it.each(PATTERNS.filter((p) => isColourwork(p) && p !== 'Custom'))('%s is a real two-colour chart', (name) => {
		const share = contrastShare(name);
		expect(share).toBeGreaterThan(0.05);
		expect(share).toBeLessThan(0.7);
		expect(tileOf(name)).toHaveLength(TILE_ROWS);
		if (name !== 'Fair isle') expect(longestFloat(name)).toBeLessThanOrEqual(6);
	});

	it('repeats over the tile edges', () => {
		expect(chart('Checks', 0, 0)).toBe(chart('Checks', TILE_ST, TILE_ROWS));
		expect(chart('Checks', 0, 0)).toBe(true);
		expect(chart('Checks', 2, 0)).toBe(false);
	});

	it('keeps Fair Isle as it was', () => {
		expect(chart('Fair isle', 0, 0)).toBe(true);
		expect(chart('Fair isle', 0, 5)).toBe(true);
		expect(chart('Fair isle', 6, 12)).toBe(false);
	});

	it('reads a custom chart and ignores a broken one', () => {
		const m = '1' + '0'.repeat(TILE_ST * TILE_ROWS - 1);
		expect(validMotif(m)).toBe(true);
		expect(chart('Custom', 0, 0, m)).toBe(true);
		expect(chart('Custom', 1, 0, m)).toBe(false);
		expect(chart('Custom', 0, 0, 'nope')).toBe(false);
		expect(validMotif(starterMotif())).toBe(true);
	});

	it('measures floats, including round the edge', () => {
		const row = '1'.repeat(8) + '0'.repeat(4);
		expect(longestFloat('Custom', row + '0'.repeat(TILE_ST * (TILE_ROWS - 1)))).toBe(8);
		expect(longestFloat('Custom', blankMotif())).toBe(0);
	});

	it('writes a chart pattern for every motif, and estimates two colours', () => {
		for (const pattern of PATTERNS.filter((p) => p !== 'Solid' && p !== 'Stripes')) {
			const d = { ...baseDesign, pattern, motif: pattern === 'Custom' ? starterMotif() : '' };
			const p = writePattern(d);
			expect(p.ok).toBe(true);
			if (p.ok) {
				expect(p.chart).toHaveLength(TILE_ROWS);
				expect(p.sections.some((s) => s.id === 'colour')).toBe(true);
			}
			expect(estimate(d).contrastYards).toBeGreaterThan(0);
		}
	});
});
