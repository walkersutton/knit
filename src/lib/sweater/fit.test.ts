import { describe, expect, it } from 'vitest';
import { LIMITS, standardBody, validCustom } from './fit';
import { buildGarment, measure } from './garment';
import { signature } from './progress';
import { estimate, writePattern } from './pattern';
import { baseDesign } from './testDesigns';

const custom = (c: Partial<NonNullable<(typeof baseDesign)['custom']>>, rest = {}) => ({ ...baseDesign, size: 'Custom', custom: { chest: 96, length: 56, arm: 44, ...c }, ...rest });

describe('custom fit', () => {
	it('scales every measurement with the size, so tracing L or XL is not just a wider M', () => {
		const sizes = ['XS', 'S', 'M', 'L', 'XL'].map((s) => standardBody('Adult', s));
		for (const key of ['chest', 'length', 'arm'] as const) for (let i = 1; i < sizes.length; i++) expect(sizes[i][key]).toBeGreaterThan(sizes[i - 1][key]);
		expect(standardBody('Adult', 'M')).toEqual({ chest: 96, length: 56, arm: 44 });
	});

	it('starts from the standard size, so switching to custom changes nothing yet', () => {
		const m = measure(baseDesign);
		const c = measure(custom({ ...standardBody('Adult', 'M') }));
		expect(c.chest).toBeCloseTo(m.chest, 0);
		expect(c.L).toBeCloseTo(m.L, 0);
		// The arm is within a couple of cm of the standard full sleeve.
		expect(Math.abs(c.sleeveBody + c.cuffLen - (m.sleeveBody + m.cuffLen))).toBeLessThan(4);
	});

	it('writes the finished chest as body plus ease', () => {
		for (const [fit, ease] of [['Fitted', -8], ['Relaxed', 4], ['Oversized', 24]] as const) {
			expect(measure(custom({ chest: 100 }, { fit })).chest).toBeCloseTo(100 + ease, 5);
		}
	});

	it('follows each measurement', () => {
		const base = measure(custom({}));
		expect(measure(custom({ chest: 110 })).chest).toBeGreaterThan(base.chest);
		expect(measure(custom({ length: 70 })).L).toBe(70);
		expect(measure(custom({ arm: 55 })).sleeveBody).toBeGreaterThan(base.sleeveBody + 9);
		// A short sleeve covers part of the arm, and the cuff is part of it.
		const short = measure(custom({ arm: 50 }, { sleeveLength: 'Short' }));
		expect(short.sleeveBody + short.cuffLen).toBeCloseTo(7.5, 1);
	});

	it('changes the pattern, the yarn and the title', () => {
		const small = writePattern(custom({ chest: 80 }));
		const big = writePattern(custom({ chest: 130 }));
		if (!small.ok || !big.ok) throw new Error('should write');
		expect(big.counts.bodySts).toBeGreaterThan(small.counts.bodySts);
		expect(big.title).toMatch(/custom fit/);
		expect(estimate(custom({ chest: 130 })).yards).toBeGreaterThan(estimate(custom({ chest: 80 })).yards);
	});

	it('ignores the stored measurements while a standard size is chosen', () => {
		const a = { ...baseDesign, custom: { chest: 60, length: 40, arm: 30 } };
		expect(measure(a).chest).toBe(measure(baseDesign).chest);
		expect(signature(a)).toBe(signature(baseDesign));
		expect(signature(custom({ chest: 100 }))).not.toBe(signature(custom({ chest: 101 })));
	});

	it('only trusts saved measurements that are whole and in range', () => {
		expect(validCustom(null)).toBe(true);
		expect(validCustom({ chest: 96, length: 56, arm: 44 })).toBe(true);
		expect(validCustom({ chest: 96, length: 56 })).toBe(false);
		expect(validCustom({ chest: 4000, length: 56, arm: 44 })).toBe(false);
		expect(validCustom({ chest: NaN, length: 56, arm: 44 })).toBe(false);
		expect(validCustom('x')).toBe(false);
	});

	it('builds a sound 3D model at the smallest and largest measurements', () => {
		for (const body of [{ chest: LIMITS.chest.min, length: LIMITS.length.min, arm: LIMITS.arm.min }, { chest: LIMITS.chest.max, length: LIMITS.length.max, arm: LIMITS.arm.max }]) {
			const g = buildGarment(custom(body));
			expect(g.fabric.attributes.position.count).toBeGreaterThan(0);
			expect(Array.from(g.fabric.attributes.position.array).every(Number.isFinite)).toBe(true);
		}
	});
});
