import { describe, expect, it } from 'vitest';
import { buildGarment } from './garment';
import { randomDesigns, singleVariations } from './testDesigns';

/**
 * Guards the 3D model against accidental change while measurements are shared with the pattern.
 * If you change the model on purpose, update with `pnpm test -u`.
 */
describe('3D garment geometry', () => {
	it('is unchanged', () => {
		const r = (x: number) => Math.round(x * 1e5) / 1e5;
		const hashes = [...singleVariations(), ...randomDesigns(40)].map((d) => {
			const g = buildGarment(d);
			// FNV-1a over everything that describes the shape.
			let h = 0x811c9dc5;
			const update = (s: string) => {
				for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
			};
			for (const geo of [g.fabric, ...g.ribs.map((x) => x.geometry), g.trim, g.holes])
				if (geo) for (const name of Object.keys(geo.attributes).sort()) update(name + Array.from(geo.attributes[name].array, r).join(','));
			update(JSON.stringify([g.ribs.map((x) => x.kind), g.seams.map(([a, b]) => [a.x, a.y, b.x, b.y].map(r)), r(g.scale)]));
			return h.toString(16).padStart(8, '0');
		});
		expect(hashes).toMatchSnapshot();
	}, 60_000); // builds ~100 full garments
});
