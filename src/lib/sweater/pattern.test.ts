import { describe, expect, it } from 'vitest';
import { isColourwork, writePattern, patternText, type Pattern } from './pattern';
import { baseDesign, customVariations, needleVariations, randomDesigns, singleVariations } from './testDesigns';
import { centerpieceOf } from './centerpiece';
import { isTop } from './family';

const RIB_REP: Record<string, number> = { '1×1': 2, '2×2': 4, '2×1': 3, Twisted: 2, Stockinette: 1 };
const designs = [...singleVariations(), ...needleVariations(), ...customVariations(), ...randomDesigns(600, 7)];
const raglanDesigns = designs.filter((d) => isTop(d) && d.construction === 'Raglan' && d.garment !== 'Slipover');
const setInDesigns = designs.filter((d) => isTop(d) && d.construction === 'Set-in' && d.garment !== 'Slipover');
const slipoverDesigns = designs.filter((d) => d.garment === 'Slipover');

/** The first stitch count (**n**) in a step's count line. */
const countOf = (count: string | undefined) => Number(/\*\*(\d+)\*\*/.exec(count ?? '')?.[1] ?? NaN);

describe('writePattern', () => {
	it('writes patterns for sweaters, T-shirts, cardigans and slipovers, in either construction', () => {
		for (const construction of ['Raglan', 'Set-in']) {
			for (const garment of ['Sweater', 'T-shirt', 'Cardigan', 'Slipover']) expect(writePattern({ ...baseDesign, construction, garment }).ok, `${construction} ${garment}`).toBe(true);
		}
	});

	it('knows which construction it wrote', () => {
		const raglan = writePattern(baseDesign);
		const setIn = writePattern({ ...baseDesign, construction: 'Set-in' });
		if (!raglan.ok || !setIn.ok) throw new Error('expected patterns');
		expect(raglan.construction).toBe('Raglan');
		expect(setIn.construction).toBe('Set-in');
		expect(raglan.title).toContain('raglan');
		expect(setIn.title).toContain('set-in');
	});

	it('writes a beanie, a pair of socks and a scarf', () => {
		const hat = writePattern({ ...baseDesign, garment: 'Beanie' });
		const socks = writePattern({ ...baseDesign, garment: 'Socks' });
		const scarf = writePattern({ ...baseDesign, garment: 'Scarf' });
		for (const p of [hat, socks, scarf]) {
			expect(p.ok).toBe(true);
			if (!p.ok) continue;
			expect(p.family).not.toBe('top');
			expect(p.centerpiece).toBeNull();
			expect(patternText(p)).not.toMatch(/NaN|undefined|Infinity|\*\*-|\*\*0\*\* st/);
			for (const s of p.sections) for (const step of s.steps) expect(step.adds ?? 0).toBeGreaterThanOrEqual(0);
		}
		if (!hat.ok || !socks.ok || !scarf.ok) return;
		expect(hat.construction).toBe('Beanie');
		expect(socks.construction).toBe('Socks');
		expect(scarf.construction).toBe('Scarf');
		expect(hat.sections.map((s) => s.id)).toEqual(['brim', 'crown', 'finishing']);
		expect(hat.sections[0].piece).toBe('brim');
		expect(hat.sections[1].piece).toBe('crown');
		expect(socks.sections.map((s) => s.id)).toEqual(['cuff', 'leg', 'heel', 'foot', 'toe', 'finishing']);
		expect(socks.sections.slice(0, 5).every((s) => s.twice?.[0] === 'First sock' && s.piece === 'sock')).toBe(true);
		expect(scarf.sections[0].piece).toBe('scarf');
	});

	it('follows the accessory finishes without adding a centerpiece', () => {
		const beanie = { ...baseDesign, garment: 'Beanie', brimFinish: 'Folded', crown: 'Gathered', pomPom: 'Pom-pom', centerpiece: '12x12:000000000000' };
		const socks = { ...baseDesign, garment: 'Socks', heel: 'Short row', toe: 'Round' };
		const scarf = { ...baseDesign, garment: 'Scarf', scarfEnds: 'Ribbed', fringe: 'Short' };
		for (const d of [beanie, socks, scarf]) expect(centerpieceOf(d)).toBeNull();
		const hat = writePattern(beanie);
		if (!hat.ok) throw new Error('expected a hat pattern');
		expect(hat.sections[0].steps.some((s) => s.text.includes('turning round'))).toBe(true);
		expect(hat.materials.join(' ')).toContain('pom-pom maker');
		const pair = writePattern(socks);
		if (!pair.ok) throw new Error('expected a sock pattern');
		expect(pair.sections.find((s) => s.id === 'heel')?.steps[0].text).toContain('German short-row heel');
		expect(pair.sections.find((s) => s.id === 'toe')?.steps.at(-1)?.text).toContain('three-needle bind-off');
		const strip = writePattern(scarf);
		if (!strip.ok) throw new Error('expected a scarf pattern');
		expect(strip.sections.map((s) => s.id)).toContain('fringe');
		expect(strip.sections[0].steps.some((s) => s.text.includes('1×1 rib'))).toBe(true);
	});

	it('charts colourwork accessories without giving them a centerpiece', () => {
		for (const garment of ['Beanie', 'Socks', 'Scarf']) {
			const d = { ...baseDesign, garment: garment as typeof baseDesign.garment, pattern: 'Fair isle', centerpiece: '12x12:000000000000' };
			const p = writePattern(d);
			if (!p.ok) throw new Error(`expected a ${garment} pattern`);
			expect(p.chart, garment).toBeTruthy();
			expect(p.centerpiece, garment).toBeNull();
			const text = patternText(p);
			expect(text, garment).toContain('CHART (');
			expect(text, garment).not.toContain('CENTERPIECE CHART');
		}
		const scarf = writePattern({ ...baseDesign, garment: 'Scarf', pattern: 'Stripes' });
		if (!scarf.ok) throw new Error('expected a scarf pattern');
		expect(scarf.sections[0].steps.some((s) => s.text.includes('16-row repeat'))).toBe(true);
		expect(scarf.sections[0].steps.some((s) => s.text.includes('jogless'))).toBe(false);
	});
});

describe('raglan pattern', () => {
	it('is sensible for an adult M worsted sweater', () => {
		const p = writePattern(baseDesign);
		if (!p.ok || p.construction !== 'Raglan') throw new Error('expected a raglan pattern');
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

	it.each(raglanDesigns.map((d, i) => [i, d] as const))('design %i adds up', (_i, d) => {
		const p = writePattern(d);
		if (!p.ok || p.construction !== 'Raglan') throw new Error('expected a raglan pattern');
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
		if (isColourwork(d.pattern) && d.garment !== 'Cardigan') expect(c.bodySts % 12).toBe(0);
		// Proportions stay garment-like.
		// Short sleeves can run straight; longer ones taper.
		if (d.sleeveLength === 'Short') expect(c.cuffSts).toBeLessThanOrEqual(c.upperSts);
		else expect(c.cuffSts).toBeLessThan(c.upperSts);
		expect(c.cuffSts).toBeGreaterThan(c.upperSts * 0.35);
		expect(c.castOn).toBeLessThan(c.bodySts);
	});
});

describe('set-in pattern', () => {
	const setIn = (d = baseDesign) => {
		const p = writePattern({ ...d, construction: 'Set-in' });
		if (!p.ok || p.construction !== 'Set-in') throw new Error('expected a set-in pattern');
		return p;
	};

	it('is sensible for an adult M worsted sweater', () => {
		const c = setIn().counts;
		// 18 sts / 4 in: a 41 cm shoulder, 100 cm chest and 36 cm upper arm.
		expect(c.castOn).toBeGreaterThan(65);
		expect(c.castOn).toBeLessThan(80);
		expect(c.bodySts).toBe(176);
		expect(c.back).toBe(80);
		expect(c.front).toBe(80);
		expect(c.underarm).toBe(8);
		expect(c.upperSts).toBeGreaterThan(58);
		expect(c.upperSts).toBeLessThan(70);
		expect(c.cuffSts).toBeGreaterThan(30);
		expect(c.cuffSts).toBeLessThan(44);
	});

	it('is worked top-down in the order back, fronts, body, sleeves, neck', () => {
		const p = setIn();
		expect(p.sections.map((s) => s.id)).toEqual(['yoke', 'body', 'sleeves', 'neck', 'finishing']);
		const text = patternText(p);
		expect(text).toMatch(/German short rows/);
		expect(text).not.toMatch(/raglan/i);
		expect(setIn({ ...baseDesign, garment: 'Cardigan' }).sections.map((s) => s.id)).toEqual(['yoke', 'body', 'sleeves', 'neck', 'bands', 'finishing']);
	});

	it('picks the sleeve up around the armhole, so the stitches before the cap add up', () => {
		const c = setIn().counts;
		const sleeves = setIn().sections.find((s) => s.id === 'sleeves')!;
		expect(countOf(sleeves.steps[0].count)).toBe(c.upperSts);
		// The cap's short rows are numbered and ticked off one by one.
		const cap = sleeves.steps.find((s) => s.tally)!;
		expect(cap.tally!.rows).toHaveLength(2 * c.capPairs);
	});

	it.each(setInDesigns.map((d, i) => [i, d] as const))('design %i adds up', (_i, d) => {
		const p = writePattern(d);
		if (!p.ok || p.construction !== 'Set-in') throw new Error('expected a set-in pattern');
		const c = p.counts;
		const cardigan = d.garment === 'Cardigan';
		const text = patternText(p);
		expect(text).not.toMatch(/NaN|undefined|Infinity|\*\*-|\*\*0\*\* st/);
		for (const [key, v] of Object.entries(c)) {
			expect(Number.isInteger(v), key).toBe(true);
			expect(v, key).toBeGreaterThanOrEqual(0);
		}

		// Widths: the back is cast on across the shoulders and grows at the armholes to the chest.
		expect(c.underarm % 2).toBe(0);
		expect(c.backNeck % 2).toBe(0);
		expect(c.castOn).toBe(2 * c.strap + c.backNeck);
		expect(c.back).toBe(c.castOn + 2 * c.armholeIncs);
		expect(c.bodySts).toBe(c.front + c.back + 2 * c.underarm);
		expect(c.front).toBe(c.back - c.band);
		if (!cardigan) expect(c.band).toBe(0);
		else expect(c.band).toBeGreaterThanOrEqual(4);
		expect(c.strap).toBeGreaterThanOrEqual(2);
		expect(c.shoulderPairs).toBeGreaterThanOrEqual(1);
		expect(c.shoulderPairs).toBeLessThanOrEqual(c.strap);
		// A front is as tall as the back, give or take the row it starts on.
		expect(c.frontRows).toBe(c.backRows - 1);
		expect(c.frontRows % 2).toBe(1);
		expect(c.backRows % 2).toBe(0);
		expect(c.castOn).toBeLessThan(c.bodySts);
		// The sleeve is picked up round the armhole, then tapers to the cuff.
		expect(c.upperSts).toBeGreaterThan(c.underarm);
		expect(c.capPairs).toBeGreaterThanOrEqual(1);
		// Ribbed edges land on a whole number of rib repeats.
		if (d.hemFinish === 'Ribbed' && !cardigan) expect(c.bodySts % RIB_REP[d.bodyRib]).toBe(0);
		if (d.cuffFinish === 'Ribbed') expect(c.cuffSts % RIB_REP[d.sleeveRib]).toBe(0);
		if (isColourwork(d.pattern) && !cardigan) expect(c.bodySts % 12).toBe(0);
		if (d.sleeveLength === 'Short') expect(c.cuffSts).toBeLessThanOrEqual(c.upperSts);
		else expect(c.cuffSts).toBeLessThan(c.upperSts);
		expect(c.cuffSts).toBeGreaterThan(c.upperSts * 0.35);

		// The numbers in the steps tell the same story as the counts.
		const yoke = p.sections.find((s) => s.id === 'yoke')!.steps;
		const at = (re: RegExp) => yoke.findIndex((s) => re.test(s.text));
		expect(countOf(yoke[0].count)).toBe(c.castOn);
		const backEnd = at(/^Leave the \*\*\d+\*\* sts of the back/);
		expect(backEnd).toBeGreaterThan(0);
		expect(countOf(yoke[backEnd - 1].count)).toBe(c.back);
		expect(Number(/Leave the \*\*(\d+)\*\*/.exec(yoke[backEnd].text)![1])).toBe(c.back);
		const join = at(/^Join the body/);
		expect(join).toBe(yoke.length - 1);
		expect(countOf(yoke[join].count)).toBe(c.bodySts);
		if (cardigan) {
			// Each front is half of both together.
			const steps = yoke.map((s) => s.text).join('\n');
			for (const side of ['left', 'right']) expect(Number(new RegExp(`Leave the \\*\\*(\\d+)\\*\\* sts of the ${side} front`).exec(steps)![1])).toBe(c.front / 2);
		} else {
			// The fronts join at the neck, and the front ends as wide as the back.
			const joinFronts = at(/^Join the fronts/);
			expect(joinFronts).toBeGreaterThan(backEnd);
			expect(countOf(yoke[join - 1].count)).toBe(c.front);
		}
		// Each run of rows says how many it covers, and ticks off that many.
		for (const s of p.sections.flatMap((x) => x.steps)) {
			const rows = /^Rows (\d+)–(\d+):/.exec(s.text);
			if (rows && s.tally) expect(s.tally.rows.length, s.text).toBe(Number(rows[2]) - Number(rows[1]) + 1);
		}
		// The back ends on the last row of its plan, and the front on its own.
		const lastRow = (from: number, to: number) => {
			let last = 0;
			for (const s of yoke.slice(from, to)) {
				const r = /^(?:Rows? (\d+)(?:–(\d+))?[:\s(])/.exec(s.text);
				if (r && !/^Rows 1–/.test(s.text)) last = Number(r[2] ?? r[1]);
			}
			return last;
		};
		expect(lastRow(0, backEnd)).toBe(c.backRows);
		expect(lastRow(backEnd, join)).toBe(c.frontRows);
	});
});

describe('slipover pattern', () => {
	const slipover = (d = baseDesign) => {
		const p = writePattern({ ...d, garment: 'Slipover' });
		if (!p.ok || p.construction !== 'Set-in') throw new Error('expected a pattern');
		return p;
	};

	it('is worked back, fronts, body, armhole edges, neck, with no sleeves', () => {
		const p = slipover();
		expect(p.sleeveless).toBe(true);
		expect(p.sections.map((s) => s.id)).toEqual(['yoke', 'body', 'armholes', 'neck', 'finishing']);
		expect(p.title).toContain('slipover');
		const text = patternText(p);
		expect(text).not.toMatch(/sleeve|cuff|raglan|set-in/i);
		// Raglan or set-in makes no difference without sleeves.
		expect(patternText(slipover({ ...baseDesign, construction: 'Set-in' }))).toBe(text);
	});

	it('picks the armhole edge up around the opening', () => {
		const p = slipover();
		const armholes = p.sections.find((s) => s.id === 'armholes')!;
		expect(countOf(armholes.steps[0].count)).toBe(p.counts.upperSts);
		expect(armholes.twice).toBeDefined();
	});

	it.each(slipoverDesigns.map((d, i) => [i, d] as const))('design %i adds up', (_i, d) => {
		const p = writePattern(d);
		if (!p.ok || p.construction !== 'Set-in') throw new Error('expected a pattern');
		const c = p.counts;
		expect(patternText(p)).not.toMatch(/NaN|undefined|Infinity|\*\*-|\*\*0\*\* st|sleeve|cuff/i);
		for (const [key, v] of Object.entries(c)) {
			expect(Number.isInteger(v), key).toBe(true);
			expect(v, key).toBeGreaterThanOrEqual(0);
		}
		expect(c.castOn).toBe(2 * c.strap + c.backNeck);
		expect(c.back).toBe(c.castOn + 2 * c.armholeIncs);
		expect(c.bodySts).toBe(c.front + c.back + 2 * c.underarm);
		expect(c.upperSts).toBeGreaterThan(c.underarm);
		expect(c.frontRows).toBe(c.backRows - 1);
		if (d.hemFinish === 'Ribbed') expect(c.bodySts % RIB_REP[d.bodyRib]).toBe(0);
	});
});
