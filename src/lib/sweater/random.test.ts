import { PATTERNS } from './motifs';
import { describe, expect, it } from 'vitest';
import { buildGarment, measure } from './garment';
import { choices } from './testDesigns';
import { designDetail, designName, randomDesign, seeded } from './random';

const designs = Array.from({ length: 300 }, (_, i) => randomDesign(seeded(i + 1)));

describe('randomDesign', () => {
	it('is repeatable for a seed and varies between seeds', () => {
		expect(randomDesign(seeded(5))).toEqual(randomDesign(seeded(5)));
		expect(new Set(designs.map((d) => JSON.stringify(d))).size).toBeGreaterThan(290);
	});

	it('only picks options the designer offers', () => {
		for (const d of designs)
			for (const [key, values] of Object.entries(choices)) {
				const v = d[key as keyof typeof d];
				expect(values, `${key}=${String(v)}`).toContain(v);
			}
	});

	it('keeps the choices consistent with each other', () => {
		for (const d of designs) {
			expect(d.contrast).not.toBe(d.color);
			if (d.garment === 'T-shirt') expect(d.sleeveLength).toBe('Short');
			else if (d.garment !== 'Cardigan') expect(d.sleeveLength).not.toBe('Short');
			expect(d.needle).toBe(0);
			expect(d.wearer).toBe('Adult');
			expect(d.size).toBe('M');
			expect(d.custom).toBeNull();
		}
	});

	it('covers every garment and pattern, always in a medium adult size', () => {
		for (const key of ['garment', 'pattern', 'neckline'] as const)
			expect(new Set(designs.map((d) => d[key])).size, key).toBe(key === 'neckline' ? 6 : key === 'garment' ? 7 : PATTERNS.length - 1);
	});

	it('builds a 3D model with sane measurements for every design', () => {
		for (const d of designs.slice(0, 60)) {
			const m = measure(d);
			expect(Object.values(m).filter((v) => typeof v === 'number').every(Number.isFinite)).toBe(true);
			expect(buildGarment(d).fabric.getAttribute('position').count).toBeGreaterThan(0);
		}
	}, 60_000);

	it('names a design', () => {
		const d = { ...randomDesign(seeded(1)), garment: 'Cardigan', neckline: 'Turtleneck', pattern: 'Stripes', color: '#78917a' };
		expect(designName(d)).toBe('Sage Striped Turtleneck Cardigan');
		expect(designDetail(d)).toContain('·');
	});
});
