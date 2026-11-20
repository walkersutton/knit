import { describe, expect, it } from 'vitest';
import { measure } from './garment';
import { writePattern } from './pattern';
import { footLabel, sections } from './options';
import { signature, validDesign } from './progress';
import { DEFAULT_DESIGN } from './defaults';
import { footFromShoe, SHOE_SIZES } from './shoes';
import { baseDesign } from './testDesigns';

const socks = { ...baseDesign, garment: 'Socks' };

describe('shoe sizes', () => {
	it('match the usual size charts to within a centimetre', () => {
		// Bare-foot lengths (cm) from common brand charts.
		const charts: [string, number][] = [
			['EU 20', 12],
			['EU 30', 18.5],
			['EU 38', 24],
			['EU 42', 26.5],
			['EU 46', 29.2],
			['UK 7', 25.6],
			['US M 9', 26.7],
			['US W 8', 24.6]
		];
		for (const [size, foot] of charts) expect(Math.abs(footFromShoe(size)! - foot), size).toBeLessThan(1);
	});

	it('get longer with every step up in each system', () => {
		const sizes = SHOE_SIZES.filter((s) => s.value);
		for (let i = 1; i < sizes.length; i++)
			if (sizes[i].group === sizes[i - 1].group) expect(footFromShoe(sizes[i].value)!).toBeGreaterThan(footFromShoe(sizes[i - 1].value)!);
	});

	it('read nothing from an unset or unknown size', () => {
		for (const v of ['', 'EU 99', 'US 9', 'EU 42.25', 'eu 42']) expect(footFromShoe(v), v).toBeNull();
	});

	it('size the foot and the width of the sock, and leave socks without one as they were', () => {
		// The adult standard, as it was before shoe sizes.
		const plain = measure({ ...socks, shoeSize: '' });
		expect(plain.footLen).toBeCloseTo(25.2);
		expect(plain.sockCirc).toBeCloseTo(19.8);
		const small = measure({ ...socks, shoeSize: 'EU 36' });
		const big = measure({ ...socks, shoeSize: 'EU 46' });
		expect(big.footLen!).toBeGreaterThan(small.footLen!);
		expect(big.sockCirc!).toBeGreaterThan(small.sockCirc!);
		// Knitted a little shorter than the bare foot, so it hugs.
		expect(big.footLen!).toBeLessThan(footFromShoe('EU 46')!);
		expect(big.footLen!).toBeGreaterThan(footFromShoe('EU 46')! - 2);
	});

	it('are offered, saved and written into the pattern', () => {
		expect(validDesign({ ...DEFAULT_DESIGN, garment: 'Socks', shoeSize: 'US W 8.5' }, DEFAULT_DESIGN)).toBe(true);
		expect(validDesign({ ...DEFAULT_DESIGN, garment: 'Socks', shoeSize: 'EU 99' }, DEFAULT_DESIGN)).toBe(false);
		const p = writePattern({ ...socks, shoeSize: 'EU 42' });
		if (!p.ok) throw new Error('expected a sock pattern');
		expect(p.measurements[0]).toEqual(['Shoe size', 'EU 42']);
		expect(footLabel({ ...socks, shoeSize: 'EU 42' })).toBe('fits a 26.5 cm / 10.4 in foot');
	});

	it('keep the place in a sock pattern saved before shoe sizes existed, but not across sizes', () => {
		const { shoeSize: _s, ...old } = socks;
		expect(signature(old as typeof socks)).toBe(signature(socks));
		expect(signature({ ...socks, shoeSize: 'EU 42' })).not.toBe(signature(socks));
	});
});

describe('heel and toe choices', () => {
	it('each explain what they are', () => {
		const fields = sections.flatMap((s) => s.groups).flatMap((g) => g.fields);
		for (const key of ['heel', 'toe'] as const) {
			const field = fields.find((f) => f.key === key)!;
			for (const o of field.options) expect(o.hint, `${key} ${o.value}`).toBeTruthy();
		}
	});
});
