import { PATTERNS } from './motifs';
import { describe, expect, it } from 'vitest';
import { buildGarment, measure } from './garment';
import { choices } from './testDesigns';
import { designDetail, designName, randomDesign, seeded, surpriseDesign } from './random';
import { standardBody } from './fit';

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
			expect(new Set(designs.map((d) => d[key])).size, key).toBe(key === 'neckline' ? 6 : key === 'garment' ? 8 : PATTERNS.length - 1);
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

describe('surpriseDesign', () => {
	it('rolls a new design but keeps who it is for and how big', () => {
		const custom = standardBody('Kid', 'L');
		const mine = { ...randomDesign(seeded(3)), wearer: 'Kid', size: 'Custom', custom, shoeSize: 'EU 32' };
		const rolled = Array.from({ length: 40 }, (_, i) => surpriseDesign(mine, seeded(i + 1)));
		for (const d of rolled) {
			expect(d).toMatchObject({ wearer: 'Kid', size: 'Custom', custom, shoeSize: 'EU 32' });
			expect(d.custom).not.toBe(custom);
		}
		expect(new Set(rolled.map((d) => d.garment)).size).toBeGreaterThan(3);
		expect(surpriseDesign(mine, seeded(9))).toEqual({ ...randomDesign(seeded(9)), wearer: 'Kid', size: 'Custom', custom, shoeSize: 'EU 32' });
	});

	it('keeps a standard size without inventing measurements', () => {
		const d = surpriseDesign({ ...randomDesign(seeded(4)), wearer: 'Baby', size: 'XS', custom: null, shoeSize: '' }, seeded(2));
		expect(d).toMatchObject({ wearer: 'Baby', size: 'XS', custom: null, shoeSize: '' });
	});
});
