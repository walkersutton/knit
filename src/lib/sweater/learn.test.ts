import { describe, expect, it } from 'vitest';
import { SHORTHAND, spellOut, techniques, techniquesIn } from './learn';
import { writePattern } from './pattern';
import { baseDesign, randomDesigns, singleVariations } from './testDesigns';

const patterns = [...singleVariations(), ...randomDesigns(300, 11)].map(writePattern).flatMap((p) => (p.ok ? [p] : []));
const steps = patterns.flatMap((p) => p.sections.flatMap((s) => s.steps));

describe('spellOut', () => {
	it('writes the shorthand out in words', () => {
		expect(spellOut('*Knit to 1 st before marker, M1R, k1, sm, k1, M1L; rep from * 3 more times, knit to end. 8 sts increased.')).toBe(
			'*Knit to 1 stitch before marker, make 1 right (M1R), knit 1, slip the marker, knit 1, make 1 left (M1L); repeat from * 3 more times, knit to end. 8 stitches increased.'
		);
		expect(spellOut('Pm for BOR.')).toBe('Place a marker for the beginning of the round.');
		expect(spellOut('Dec round: k1, k2tog, knit to the last 3 sts, ssk, k1.')).toBe('Decrease round: knit 1, knit 2 together, knit to the last 3 stitches, slip, slip, knit (ssk), knit 1.');
		expect(spellOut('Raglan inc row with neck incs')).toBe('Raglan increase row with neck increases');
	});

	it('keeps stitch-count markup', () => {
		expect(spellOut('Cast on **86** sts loosely.')).toBe('Cast on **86** stitches loosely.');
	});

	it('leaves no shorthand in any step, count or tally of any pattern', () => {
		for (const step of steps)
			for (const text of [step.text, step.count ?? '', ...(step.tally?.rows ?? [])]) {
				const full = spellOut(text);
				expect(full, text).not.toMatch(SHORTHAND);
				expect(full, text).not.toMatch(/\(\s*\)|\bundefined\b/);
			}
	});
});

describe('techniquesIn', () => {
	it('links every technique from at least one pattern', () => {
		const used = new Set(steps.flatMap((s) => techniquesIn(s.text).map((t) => t.id)));
		expect(techniques.map((t) => t.id).filter((id) => !used.has(id))).toEqual([]);
	});

	it('points a plain sweater at the tutorials a first-timer needs', () => {
		const p = writePattern(baseDesign);
		if (!p.ok) throw new Error(p.reason);
		const ids = new Set(p.sections.flatMap((s) => s.steps).flatMap((s) => techniquesIn(s.text).map((t) => t.id)));
		for (const id of ['cast-on', 'join', 'm1', 'short-rows', 'backward-loop', 'magic-loop', 'decreases', 'ssk', 'rib', 'bind-off', 'ends', 'blocking']) expect(ids, id).toContain(id);
	});

	it('uses https links with distinct ids', () => {
		expect(new Set(techniques.map((t) => t.id)).size).toBe(techniques.length);
		for (const t of techniques) expect(t.url).toMatch(/^https:\/\/[a-z.-]+\/.+/);
	});
});
