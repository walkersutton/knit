import { describe, expect, it } from 'vitest';
import { writePattern, patternText } from './pattern';
import { baseDesign, randomDesigns, singleVariations } from './testDesigns';

const RIB_REP: Record<string, number> = { '1×1': 2, '2×2': 4, '2×1': 3, Twisted: 2, Stockinette: 1 };
const designs = [...singleVariations(), ...randomDesigns(600, 7)];

describe('writePattern', () => {
	it('only writes raglan patterns with sleeves for now', () => {
		expect(writePattern({ ...baseDesign, construction: 'Set-in' }).ok).toBe(false);
		expect(writePattern({ ...baseDesign, garment: 'Slipover' }).ok).toBe(false);
		expect(writePattern(baseDesign).ok).toBe(true);
	});

	it('is sensible for an adult M worsted sweater', () => {
		const p = writePattern(baseDesign);
		if (!p.ok) throw new Error(p.reason);
		const c = p.counts;
		// 18 sts / 4 in, 100 cm chest, ~49 cm neck: in line with published top-down raglans.
		expect(c.castOn).toBeGreaterThan(75);
		expect(c.castOn).toBeLessThan(100);
		expect(c.bodySts).toBe(176);
		expect(c.upperSts).toBeGreaterThan(58);
		expect(c.upperSts).toBeLessThan(70);
		expect(c.cuffSts).toBeGreaterThan(30);
		expect(c.cuffSts).toBeLessThan(44);
	});

	it.each(designs.map((d, i) => [i, d] as const))('design %i adds up', (_i, d) => {
		const p = writePattern(d);
		if (!p.ok) {
			expect(d.construction === 'Set-in' || d.garment === 'Slipover').toBe(true);
			return;
		}
		const c = p.counts;
		const text = patternText(p);
		expect(text).not.toMatch(/NaN|undefined|Infinity|\*\*-|\*\*0\*\* st/);

		// Every count is a positive whole number.
		for (const [key, v] of Object.entries(c)) {
			expect(Number.isInteger(v), key).toBe(true);
			expect(v, key).toBeGreaterThanOrEqual(0);
		}
		// Yoke: increases fit in the rows available, and the totals after the divide add up.
		expect(c.incRows).toBeLessThanOrEqual(c.incSlots);
		expect(c.yokeRows).toBeGreaterThanOrEqual(c.yokeRowsPlanned);
		expect(c.underarm % 2).toBe(0);
		expect(c.bodySts).toBe(c.front + c.back + 2 * c.underarm);
		expect(c.upperSts).toBe(c.sleeve + c.underarm);
		if (d.garment === 'Cardigan') expect(c.front).toBe(c.back - c.band);
		else expect(c.front).toBe(c.back);
		// Ribbed edges land on a whole number of rib repeats.
		if (d.hemFinish === 'Ribbed' && d.garment !== 'Cardigan') expect(c.bodySts % RIB_REP[d.bodyRib]).toBe(0);
		if (d.cuffFinish === 'Ribbed') expect(c.cuffSts % RIB_REP[d.sleeveRib]).toBe(0);
		if (d.pattern === 'Fair isle' && d.garment !== 'Cardigan') expect(c.bodySts % 12).toBe(0);
		// Proportions stay garment-like.
		// Short sleeves can run straight; longer ones taper.
		if (d.sleeveLength === 'Short') expect(c.cuffSts).toBeLessThanOrEqual(c.upperSts);
		else expect(c.cuffSts).toBeLessThan(c.upperSts);
		expect(c.cuffSts).toBeGreaterThan(c.upperSts * 0.35);
		expect(c.castOn).toBeLessThan(c.bodySts);
	});
});
