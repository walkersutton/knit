import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN } from './defaults';
import { measure, type Design } from './garment';
import {
	blankCenterpiece,
	bodyBoxOf,
	centerpieceOf,
	dropRows,
	encodeCenterpiece,
	fitProblem,
	imageCenterpiece,
	invertCenterpiece,
	longestStrand,
	offsetSts,
	paintCells,
	parseCenterpiece,
	resizeCenterpiece,
	room,
	rowsOf,
	shiftCenterpiece,
	textCenterpiece,
	trimCenterpiece,
	validCenterpiece
} from './centerpiece';
import { estimate, patternText, writePattern } from './pattern';
import { signature, validDesign } from './progress';

const heart = encodeCenterpiece(paintCells(blankCenterpiece(8, 7), [[1, 1], [2, 1], [5, 1], [6, 1], [0, 2], [3, 2], [4, 2], [7, 2], [1, 3], [6, 3], [2, 4], [5, 4], [3, 5], [4, 5]], true));
const withCp = (over: Partial<Design> = {}): Design => ({ ...DEFAULT_DESIGN, centerpiece: heart, ...over });
const ones = (s: string) => s.split('1').length - 1;

describe('centerpiece grids', () => {
	it('round-trips through its text form and rejects bad text', () => {
		const c = blankCenterpiece(10, 6);
		expect(parseCenterpiece(encodeCenterpiece(c))).toEqual(c);
		expect(parseCenterpiece('')).toBeNull();
		expect(parseCenterpiece('10x6:0101')).toBeNull();
		expect(parseCenterpiece('99x99:' + '0'.repeat(9801))).toBeNull();
		expect(validCenterpiece('')).toBe(true);
		expect(validCenterpiece('nonsense')).toBe(false);
	});

	it('paints, shifts without wrapping and inverts', () => {
		const c = paintCells(blankCenterpiece(5, 5), [[0, 0]], true);
		expect(paintCells(c, [[0, 0]], true)).toBe(c);
		expect(rowsOf(shiftCenterpiece(c, 1, 1))[1][1]).toBe(true);
		expect(shiftCenterpiece(c, -1, 0).cells).toBe(blankCenterpiece(5, 5).cells);
		expect(ones(invertCenterpiece(c).cells)).toBe(24);
		expect(ones(paintCells(c, [[9, 9], [-1, 0]], true).cells)).toBe(1);
	});

	it('resizes around the middle and trims to the painted part', () => {
		const c = paintCells(blankCenterpiece(7, 7), [[3, 3]], true);
		expect(rowsOf(resizeCenterpiece(c, 11, 9))[4][5]).toBe(true);
		const t = trimCenterpiece(paintCells(blankCenterpiece(20, 20), [[5, 6], [9, 8]], true))!;
		expect([t.w, t.h]).toEqual([5, 3]);
		expect(trimCenterpiece(blankCenterpiece(5, 5))).toBeNull();
	});
});

describe('words and pictures', () => {
	it('sets text in a 5 × 7 font, centred over lines', () => {
		const one = textCenterpiece('hi')!;
		expect(one.centerpiece.h).toBe(7);
		expect(one.centerpiece.w).toBe(3 + 1 + 5);
		expect(textCenterpiece('knit\nmore')!.centerpiece.h).toBe(16);
		expect(textCenterpiece('   ')).toBeNull();
		expect(textCenterpiece('☃')).toBeNull();
	});

	it('says when words are too wide', () => {
		expect(textCenterpiece('KNIT', 40)!.fits).toBe(true);
		expect(textCenterpiece('KNITTING IS FUN', 40)!.fits).toBe(false);
		expect(textCenterpiece('KNIT', 10)!.fits).toBe(false);
	});

	it('turns dark opaque pixels into the pattern colour', () => {
		const px = [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 40, 40, 40, 255];
		expect(imageCenterpiece(px, 4, 1, 128).cells).toBe('1001');
	});

	it('measures the longest carried strand inside the picture only', () => {
		expect(longestStrand(parseCenterpiece('5x3:000000111000000')!)).toBe(3);
		expect(longestStrand(parseCenterpiece('6x3:101001000000000000')!)).toBe(2);
	});
});

describe('placing it on a sweater', () => {
	const box = (d: Design) => bodyBoxOf(d, measure(d));

	it('has room under the arms and across the front', () => {
		const r = room(box(DEFAULT_DESIGN));
		expect(r.rows).toBeGreaterThan(30);
		expect(r.sts).toBeGreaterThan(20);
		expect(r.sts).toBeLessThanOrEqual(40);
	});

	it('drops further the lower it is set, and never past the room', () => {
		const b = box(DEFAULT_DESIGN);
		const c = parseCenterpiece(heart)!;
		expect(dropRows(c, 0, b)).toBe(0);
		expect(dropRows(c, 1, b)).toBe(room(b).rows - c.h);
		expect(dropRows(c, 0.5, b)).toBeGreaterThan(0);
	});

	it('flags a picture that does not fit', () => {
		expect(fitProblem(parseCenterpiece(heart)!, box({ ...DEFAULT_DESIGN, gauge: 28 }))).toBeUndefined();
		const tiny = box({ ...DEFAULT_DESIGN, gauge: 13, wearer: 'Baby' });
		expect(fitProblem(blankCenterpiece(40, 10), tiny)).toBe('wide');
		expect(fitProblem(blankCenterpiece(10, 48), tiny)).toBe('tall');
	});

	it('moves to a chest and has less room there', () => {
		const b = box(DEFAULT_DESIGN);
		expect(offsetSts('Centre', b)).toBe(0);
		expect(offsetSts('Left chest', b)).toBe(-offsetSts('Right chest', b));
		expect(offsetSts('Left chest', b)).toBeGreaterThan(5);
		const small = box({ ...DEFAULT_DESIGN, wearer: 'Kid', gauge: 13 });
		expect(room(small, 'Left chest').sts).toBeLessThan(room(small).sts);
		expect(room(b, 'Left chest').sts).toBeLessThanOrEqual(room(b).sts);
	});

	it('is ignored on a cardigan', () => {
		expect(centerpieceOf({ garment: 'Cardigan', centerpiece: heart })).toBeNull();
		expect(centerpieceOf({ garment: 'Sweater', centerpiece: heart })).not.toBeNull();
	});
});

describe('the written pattern', () => {
	it('adds the chart and steps to the body of a raglan', () => {
		const p = writePattern(withCp());
		if (!p.ok) throw new Error(p.reason);
		const c = parseCenterpiece(heart)!;
		expect(p.centerpiece).toEqual(rowsOf(c));
		const body = p.sections.find((s) => s.id === 'body')!;
		const setUp = body.steps.find((s) => s.text.startsWith('Centerpiece set-up'))!;
		expect(setUp).toBeTruthy();
		expect(body.steps.find((s) => s.tally)!.tally!.rows).toHaveLength(c.h - 1);
		expect(patternText(p)).toContain('CENTERPIECE CHART');
		// The picture sits in the middle: the stitches either side of it, and under it, add up to the round.
		const nums = [...setUp.text.matchAll(/\*\*(\d+)\*\* st/g)].map((m) => +m[1]);
		expect(nums[0] + nums[1] + nums[2]).toBe(p.counts.bodySts);
		expect(nums[1]).toBe(c.w);
		expect(Math.abs(nums[0] - nums[2])).toBeLessThanOrEqual(1);
	});

	it('puts the picture over the chest the knitter chose, mirrored either side of the middle', () => {
		const left = (at: string) => {
			const p = writePattern(withCp({ centerpieceAt: at }));
			if (!p.ok) throw new Error(p.reason);
			const s = p.sections.find((x) => x.id === 'body')!.steps.find((x) => x.text.startsWith('Centerpiece set-up'))!;
			return { n: +[...s.text.matchAll(/\*\*(\d+)\*\* st/g)][0][1], text: s.text };
		};
		const [c, l, r] = [left('Centre'), left('Left chest'), left('Right chest')];
		expect(l.n).toBeLessThan(c.n);
		expect(r.n).toBeGreaterThan(c.n);
		expect(c.n - l.n).toBe(r.n - c.n);
		expect(l.text).toContain('left chest');
		expect(r.text).toContain('right chest');
	});

	it('works with set-in sleeves, slits, a slipover, a rolled hem and colourwork, and leaves a cardigan alone', () => {
		for (const over of [{ construction: 'Set-in' }, { slits: 'Long' }, { garment: 'Slipover' }, { hemFinish: 'Rolled edge' }, { pattern: 'Fair isle' }]) {
			const p = writePattern(withCp(over));
			if (!p.ok) throw new Error(`${JSON.stringify(over)}: ${p.reason}`);
			expect(p.centerpiece).not.toBeNull();
			expect(p.sections.find((s) => s.id === 'body')!.steps.some((s) => s.text.startsWith('Centerpiece set-up'))).toBe(true);
		}
		const cardigan = writePattern(withCp({ garment: 'Cardigan' }));
		expect(cardigan.ok && cardigan.centerpiece).toBeNull();
	});

	it('never knits more body than the sweater has, wherever the picture is set', () => {
		for (const y of [0, 0.5, 1]) {
			const d = withCp({ centerpieceY: y });
			const p = writePattern(d);
			if (!p.ok) throw new Error(p.reason);
			const m = measure(d);
			const plain = writePattern({ ...d, centerpiece: '' });
			const sum = (q: typeof p) => q.sections.find((s) => s.id === 'body')!.steps.reduce((total, s) => total + (s.adds ?? 0), 0);
			expect(sum(p)).toBeGreaterThan(0);
			// The picture is placed inside the same length of body the plain sweater has (within the one round the set-up takes).
			expect(Math.abs(sum(p) - sum(plain as typeof p))).toBeLessThan(2 / m.rowPerCm + 0.5);
		}
	});

	it('uses more contrast yarn and a higher skill level', () => {
		expect(estimate(DEFAULT_DESIGN).contrastYards).toBe(0);
		const marked = estimate(withCp());
		expect(marked.contrastYards).toBeGreaterThanOrEqual(20);
		expect(marked.level).toBe('Intermediate');
	});
});

describe('saved designs', () => {
	it('accepts only a valid centerpiece and position', () => {
		expect(validDesign(withCp(), DEFAULT_DESIGN)).toBe(true);
		expect(validDesign(withCp({ centerpiece: '3x3:11' }), DEFAULT_DESIGN)).toBe(false);
		expect(validDesign(withCp({ centerpieceY: 2 }), DEFAULT_DESIGN)).toBe(false);
		expect(validDesign(withCp({ centerpieceAt: 'Ankle' }), DEFAULT_DESIGN)).toBe(false);
	});

	it('tells designs apart by their centerpiece, but not by its position when there is none', () => {
		expect(signature(withCp())).not.toBe(signature(DEFAULT_DESIGN));
		expect(signature({ ...DEFAULT_DESIGN, centerpieceY: 0.9 })).toBe(signature(DEFAULT_DESIGN));
		expect(signature(withCp({ centerpieceY: 0.9 }))).not.toBe(signature(withCp()));
	});
});
