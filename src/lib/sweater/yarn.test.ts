import { describe, expect, it } from 'vitest';
import { chart, FINE_TILE, STANDARD_TILE, tileFor } from './yarn';
import { estimate, patternText, writePattern } from './pattern';
import { buildGarment, shapeKey } from './garment';
import { baseDesign } from './testDesigns';

const fair = { ...baseDesign, pattern: 'Fair isle' };
const fingering = { ...fair, gauge: 28 };

describe('tileFor', () => {
	it('gives only Fair Isle on fine yarn the detailed chart', () => {
		expect(tileFor('Fair isle', 28)).toBe(FINE_TILE);
		expect(tileFor('Fair isle', 22)).toBe(STANDARD_TILE);
		expect(tileFor('Fair isle', 18)).toBe(STANDARD_TILE);
		expect(tileFor('Stripes', 28)).toBe(STANDARD_TILE);
		expect(tileFor('Solid', 28)).toBe(STANDARD_TILE);
	});

	it('fine chart divides by every rib repeat', () => {
		for (const rep of [2, 3, 4]) expect(FINE_TILE.st % rep).toBe(0);
	});
});

describe('fine chart', () => {
	const rows = Array.from({ length: FINE_TILE.rows }, (_, j) => Array.from({ length: FINE_TILE.st }, (_, i) => chart('Fair isle', i, j, undefined, FINE_TILE)));

	it('has both colours and a rounded heart (a notch at the top, a point at the bottom)', () => {
		const on = rows.flat().filter(Boolean).length;
		expect(on).toBeGreaterThan(0.15 * FINE_TILE.st * FINE_TILE.rows);
		expect(on).toBeLessThan(0.5 * FINE_TILE.st * FINE_TILE.rows);
		expect(rows[4].slice(1, 12).map(Number).join('')).toBe('01110001110');
		expect(rows[12].slice(1, 12).filter(Boolean)).toHaveLength(1);
	});

	it('keeps the standard chart unchanged', () => {
		expect(chart('Fair isle', 6, 5)).toBe(chart('Fair isle', 6, 5, undefined, STANDARD_TILE));
		expect(chart('Fair isle', 0, 0)).toBe(true);
	});
});

describe('pattern on fine yarn', () => {
	it('writes the 24 × 32 chart and a body in multiples of 24', () => {
		const p = writePattern(fingering);
		if (!p.ok) throw new Error(p.reason);
		expect(p.chart).toHaveLength(32);
		expect(p.chart![0]).toHaveLength(24);
		expect(p.counts.bodySts % 24).toBe(0);
		expect(patternText(p)).toContain('24-st, 32-');
	});

	it('keeps the 12 × 16 chart at worsted', () => {
		const p = writePattern(fair);
		if (!p.ok) throw new Error(p.reason);
		expect(p.chart).toHaveLength(16);
		expect(p.chart![0]).toHaveLength(12);
	});

	it('estimates contrast yarn from the chart in use', () => {
		expect(estimate(fingering).contrastYards).toBeGreaterThan(0);
	});
});

describe('mesh', () => {
	it('rebuilds when the chart size changes, not otherwise', () => {
		expect(shapeKey(fingering)).not.toBe(shapeKey({ ...fingering, pattern: 'Solid' }));
		expect(shapeKey(fair)).toBe(shapeKey({ ...fair, pattern: 'Solid' }));
		expect(shapeKey(fingering)).toBe(shapeKey({ ...fingering, color: '#123456' }));
	});

	it('builds', () => {
		expect(buildGarment(fingering)).toBeTruthy();
	});
});
