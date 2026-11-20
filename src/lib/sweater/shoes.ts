/**
 * Shoe sizes, turned into the foot length a sock is knitted for.
 *
 * A shoe size measures the shoe's last, which is about 1.5 cm longer than the foot it fits:
 * - EU (Paris points): the last is the size × ⅔ cm. EU covers children's sizes too.
 * - UK adult: the last is (size + 25) ÷ 3 inches.
 * - US men's run one size above UK, US women's two above.
 * These are the usual rules of thumb. Brands differ by half a size or so, which a stretchy sock absorbs.
 */

export type ShoeSystem = 'EU' | 'UK' | 'US M' | 'US W';

const LAST_TO_FOOT = 1.5;

const ranges: Record<ShoeSystem, { from: number; to: number; step: number; group: string }> = {
	EU: { from: 16, to: 50, step: 1, group: 'EU (children and adults)' },
	UK: { from: 2, to: 14, step: 0.5, group: 'UK' },
	'US M': { from: 4, to: 15, step: 0.5, group: "US men's" },
	'US W': { from: 4, to: 13, step: 0.5, group: "US women's" }
};

const lastCm = (system: ShoeSystem, size: number) => {
	if (system === 'EU') return (size * 2) / 3;
	const uk = system === 'UK' ? size : system === 'US M' ? size - 1 : size - 2;
	return ((uk + 25) / 3) * 2.54;
};

/** The value a design stores, e.g. "EU 42" or "US W 8.5". */
const valueOf = (system: ShoeSystem, size: number) => `${system} ${size}`;

/** Every size the designer offers, grouped by system, after "not set" (''). */
export const SHOE_SIZES: { label: string; value: string; group?: string }[] = [
	{ label: 'Not set: size from “Made for”', value: '' },
	...(Object.keys(ranges) as ShoeSystem[]).flatMap((system) => {
		const { from, to, step, group } = ranges[system];
		const out = [];
		for (let n = from; n <= to + 1e-9; n += step) out.push({ label: valueOf(system, n), value: valueOf(system, n), group });
		return out;
	})
];

/** The bare foot's length in cm for a stored shoe size, or null when none is set (or it is not one we offer). */
export function footFromShoe(value: string): number | null {
	if (!value) return null;
	const match = /^(EU|UK|US M|US W) (\d+(?:\.5)?)$/.exec(value);
	if (!match) return null;
	const system = match[1] as ShoeSystem;
	const size = Number(match[2]);
	const { from, to } = ranges[system];
	if (size < from || size > to) return null;
	return Math.round((lastCm(system, size) - LAST_TO_FOOT) * 10) / 10;
}
