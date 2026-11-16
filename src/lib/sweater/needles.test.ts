import { describe, expect, it } from 'vitest';
import { measure } from './garment';
import { cleanNeedles, mainSizes, needleLabel, needlesOf, pickNeedles, stitchGauge } from './needles';
import { yarnWeights } from './options';
import { estimate, writePattern } from './pattern';
import { baseDesign } from './testDesigns';

const worsted = 18;

describe('pickNeedles', () => {
	it('keeps the standard needles when the knitter owns none, or none that suit the yarn', () => {
		expect(pickNeedles(worsted, [])).toEqual({ needle: 0, ribNeedle: 0 });
		expect(pickNeedles(worsted, [2.5, 7])).toEqual({ needle: 0, ribNeedle: 0 });
		expect(needlesOf({ gauge: worsted, needle: 0, ribNeedle: 0 })).toEqual({ main: 5, rib: 4 });
	});

	it('treats owning the standard needles as no change', () => {
		expect(pickNeedles(worsted, [4, 5])).toEqual({ needle: 0, ribNeedle: 0 });
	});

	it('uses the owned main needle closest to the standard one', () => {
		expect(pickNeedles(worsted, [4.5]).needle).toBe(4.5);
		expect(pickNeedles(worsted, [4.5, 5, 5.5]).needle).toBe(0);
		// 4 mm is too thin for worsted, so it is not used for the fabric.
		expect(pickNeedles(worsted, [4, 5.5]).needle).toBe(5.5);
	});

	it('uses an owned ribbing needle that is thinner than the main one', () => {
		expect(pickNeedles(worsted, [4.5, 5])).toEqual({ needle: 0, ribNeedle: 4.5 });
		expect(pickNeedles(worsted, [3.5, 4.5, 5])).toEqual({ needle: 0, ribNeedle: 3.5 });
		// Nothing thinner than the main needle is owned: suggest the usual two sizes down.
		expect(needlesOf({ gauge: worsted, ...pickNeedles(worsted, [4.5]) })).toEqual({ main: 4.5, rib: 3.5 });
		// Far too thin to rib a worsted sweater.
		expect(pickNeedles(worsted, [2.5, 5]).ribNeedle).toBe(0);
	});

	it('offers every yarn weight its standard needle and a size either side', () => {
		for (const w of yarnWeights) {
			const sizes = mainSizes(w.gauge);
			expect(sizes).toContain(w.needle);
			expect(sizes[0]).toBeLessThan(w.needle);
			expect(sizes.at(-1)).toBeGreaterThan(w.needle);
			for (const mm of sizes) {
				const { rib } = needlesOf({ gauge: w.gauge, ...pickNeedles(w.gauge, [mm]) });
				expect(rib).toBeLessThan(mm);
				expect(needleLabel(rib)).toMatch(/^US /);
			}
		}
	});
});

describe('stitchGauge', () => {
	it('is the yarn weight’s gauge on the standard needle', () => {
		for (const w of yarnWeights) expect(stitchGauge({ gauge: w.gauge, needle: 0 })).toBe(w.gauge);
		expect(stitchGauge({ gauge: worsted, needle: 5 })).toBe(18);
	});

	it('is tighter on a thinner needle and looser on a thicker one', () => {
		expect(stitchGauge({ gauge: worsted, needle: 4.5 })).toBe(20);
		expect(stitchGauge({ gauge: worsted, needle: 5.5 })).toBe(16);
	});
});

describe('a design on a needle the knitter owns', () => {
	const thin = { ...baseDesign, ...pickNeedles(worsted, [3.75, 4.5]) };

	it('keeps its size and changes its stitch counts', () => {
		expect(measure(thin).chest).toBe(measure(baseDesign).chest);
		const a = writePattern(baseDesign);
		const b = writePattern(thin);
		if (!a.ok || !b.ok) throw new Error('no pattern');
		expect(b.counts.bodySts).toBeGreaterThan(a.counts.bodySts);
		expect(b.gauge).toMatch(/^20 sts/);
		expect(Object.fromEntries(b.materials)['Main needle']).toMatch(/^US 7 \(4\.5 mm\)/);
		expect(Object.fromEntries(b.materials)['Smaller needle']).toMatch(/^US 5 \(3\.75 mm\)/);
	});

	it('takes more yarn when knitted tighter', () => {
		expect(estimate(thin).yards).toBeGreaterThan(estimate(baseDesign).yards);
	});
});

describe('cleanNeedles', () => {
	it('keeps only known sizes, in order', () => {
		expect(cleanNeedles([5, 'x', 4, 4, 99])).toEqual([4, 5]);
		expect(cleanNeedles('5')).toEqual([]);
	});
});
