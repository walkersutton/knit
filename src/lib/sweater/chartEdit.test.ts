import { describe, expect, it } from 'vitest';
import { flipH, flipV, invert, isOn, lineCells, mirror, paint, shift } from './chartEdit';
import { designLink, editLink, freshName, parseLibrary, readMotifHash } from './library';
import { blankMotif, FINE_TILE, starterMotif, TILE_ROWS, TILE_ST, validMotif } from './motifs';

const one = (i: number, j: number) => paint(blankMotif(), [[i, j]], true);

describe('chart editing', () => {
	it('draws a gapless line between two cells', () => {
		expect(lineCells(0, 0, 3, 0)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
		expect(lineCells(2, 2, 2, 2)).toEqual([[2, 2]]);
		const diag = lineCells(0, 0, 4, 2);
		expect(diag[0]).toEqual([0, 0]);
		expect(diag.at(-1)).toEqual([4, 2]);
		for (let n = 1; n < diag.length; n++) {
			expect(Math.abs(diag[n][0] - diag[n - 1][0])).toBeLessThanOrEqual(1);
			expect(Math.abs(diag[n][1] - diag[n - 1][1])).toBeLessThanOrEqual(1);
		}
	});

	it('paints cells, ignores ones off the grid and keeps the same string when nothing changes', () => {
		const m = paint(blankMotif(), [[1, 2], [-1, 0], [TILE_ST, 0]], true);
		expect(validMotif(m)).toBe(true);
		expect(isOn(m, 1, 2)).toBe(true);
		expect([...m].filter((c) => c === '1')).toHaveLength(1);
		expect(paint(m, [[1, 2]], true)).toBe(m);
		expect(isOn(paint(m, [[1, 2]], false), 1, 2)).toBe(false);
	});

	it('shifts with wrap-around', () => {
		expect(isOn(shift(one(0, 0), -1, -1), TILE_ST - 1, TILE_ROWS - 1)).toBe(true);
		expect(shift(shift(starterMotif(), 3, 5), -3, -5)).toBe(starterMotif());
	});

	it('mirrors, flips and inverts', () => {
		expect(isOn(mirror(one(1, 0)), TILE_ST - 2, 0)).toBe(true);
		expect(isOn(flipH(one(0, 3)), TILE_ST - 1, 3)).toBe(true);
		expect(isOn(flipV(one(4, 0)), 4, TILE_ROWS - 1)).toBe(true);
		expect(invert(blankMotif())).toBe('1'.repeat(TILE_ST * TILE_ROWS));
		expect(flipH(flipH(starterMotif()))).toBe(starterMotif());
	});
});

describe('pattern library', () => {
	it('always has a chart to edit and drops broken ones', () => {
		const lib = parseLibrary({ patterns: [{ id: 'a', name: 'Bad', motif: '01' }, { id: 'b', name: 'Good', motif: starterMotif() }] });
		expect(lib.patterns.map((p) => p.id)).toEqual(['b']);
		expect(parseLibrary(null).patterns).toHaveLength(1);
		expect(parseLibrary('junk').patterns[0].motif).toBe(starterMotif());
	});

	it("previews in the sweater's colours until its own are chosen", () => {
		expect(parseLibrary(null, { color: '#2f5a48', contrast: '#e8bd53' })).toMatchObject({ color: '#2f5a48', contrast: '#e8bd53' });
		expect(parseLibrary({ color: '#c8543e' }, { color: '#2f5a48' }).color).toBe('#c8543e');
		expect(parseLibrary({ color: 'red' }).color).toBe('#465e9d');
	});

	it('names copies without clashing', () => {
		expect(freshName('Hearts', [])).toBe('Hearts');
		expect(freshName('Hearts', ['Hearts'])).toBe('Hearts 2');
		expect(freshName('Hearts 2', ['Hearts', 'Hearts 2'])).toBe('Hearts 3');
	});

	it('carries a chart and colours in a link, and rejects broken ones', () => {
		const m = starterMotif();
		expect(readMotifHash(designLink(m, '#c8543e', '#faf3dc').split('#').slice(1).join('#'))).toEqual({ motif: m, color: '#c8543e', contrast: '#faf3dc' });
		expect(readMotifHash(editLink(m).slice('/patterns'.length))).toEqual({ motif: m });
		expect(readMotifHash('#motif=0101')).toBeUndefined();
		expect(readMotifHash(`#motif=${m}&color=red`)).toEqual({ motif: m });
		expect(readMotifHash('#d=abc')).toBeUndefined();
	});
});

describe('fine charts', () => {
	const fine = blankMotif(FINE_TILE);
	it('edits on the 24 × 32 grid and keeps its size', () => {
		const m = paint(fine, [[23, 31], [24, 0]], true);
		expect(m).toHaveLength(FINE_TILE.st * FINE_TILE.rows);
		expect(isOn(m, 23, 31)).toBe(true);
		expect([...m].filter((c) => c === '1')).toHaveLength(1);
		expect(isOn(shift(m, 1, 1), 0, 0)).toBe(true);
		expect(isOn(flipH(m), 0, 31)).toBe(true);
		expect(isOn(flipV(m), 23, 0)).toBe(true);
		expect(isOn(mirror(paint(fine, [[0, 5]], true)), 23, 5)).toBe(true);
		expect(invert(fine)).toBe('1'.repeat(FINE_TILE.st * FINE_TILE.rows));
	});
	it('travels in a link', () => {
		const m = starterMotif(FINE_TILE);
		expect(readMotifHash(designLink(m).replace('/design', ''))?.motif).toBe(m);
	});
});
