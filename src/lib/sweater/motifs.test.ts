import { describe, expect, it } from 'vitest';
import { paint } from './chartEdit';
import { blankMotif, chart, chartFit, contrastShare, FINE_TILE, longestFloat, PATTERNS, resizeMotif, starterMotif, STANDARD_TILE, tileFor, tileOf, tileOfMotif, TILE_ROWS, TILE_ST, validMotif } from './motifs';
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

describe('fine custom charts', () => {
	const fine = starterMotif(FINE_TILE);

	it('is its own size, whatever the yarn', () => {
		expect(validMotif(fine)).toBe(true);
		expect(fine).toHaveLength(FINE_TILE.st * FINE_TILE.rows);
		expect(tileOfMotif(fine)).toBe(FINE_TILE);
		expect(tileOfMotif(starterMotif())).toBe(STANDARD_TILE);
		expect(tileFor('Custom', 18, fine)).toBe(FINE_TILE);
		expect(tileFor('Custom', 28, starterMotif())).toBe(STANDARD_TILE);
		expect(tileOf('Custom', fine)).toHaveLength(FINE_TILE.rows);
		expect(validMotif('1'.repeat(100))).toBe(false);
	});

	it('draws the same picture as the standard starter', () => {
		expect(contrastShare('Custom', fine)).toBeCloseTo(contrastShare('Custom', starterMotif()));
		expect(resizeMotif(starterMotif(), FINE_TILE)).toBe(fine);
	});

	it('resizes without losing a picture that fits the coarse grid', () => {
		const std = starterMotif();
		expect(resizeMotif(resizeMotif(std, FINE_TILE), STANDARD_TILE)).toBe(std);
		expect(resizeMotif(std, STANDARD_TILE)).toBe(std);
		// A lone fine stitch is lost going coarser; two of four cells keep the stitch.
		const lone = paint(blankMotif(FINE_TILE), [[0, 0]], true);
		expect(contrastShare('Custom', resizeMotif(lone, STANDARD_TILE))).toBe(0);
		expect(chart('Custom', 0, 0, resizeMotif(paint(lone, [[1, 0]], true), STANDARD_TILE))).toBe(true);
	});

	it('repeats over its own tile edges and counts floats on 24 stitches', () => {
		const m = '1'.repeat(8) + '0'.repeat(16) + '0'.repeat(24 * 31);
		expect(chart('Custom', 0, 0, m)).toBe(chart('Custom', 24, 32, m));
		expect(longestFloat('Custom', m)).toBe(16);
	});

	it('writes a pattern with the fine chart, on any yarn', () => {
		for (const gauge of [18, 28]) {
			const p = writePattern({ ...baseDesign, gauge, pattern: 'Custom', motif: fine });
			expect(p.ok).toBe(true);
			if (p.ok) {
				expect(p.chart).toHaveLength(FINE_TILE.rows);
				expect(p.chart![0]).toHaveLength(FINE_TILE.st);
			}
		}
	});
});

describe('chart and yarn fit', () => {
	const fine = starterMotif(FINE_TILE);
	it('flags a chart drawn for different yarn', () => {
		expect(chartFit(fine, 18)).toBe('too-fine');
		expect(chartFit(fine, 22)).toBe('too-fine');
		expect(chartFit(fine, 28)).toBeUndefined();
		expect(chartFit(starterMotif(), 28)).toBe('too-coarse');
		expect(chartFit(starterMotif(), 22)).toBeUndefined();
		expect(chartFit('', 28)).toBeUndefined();
	});
});
