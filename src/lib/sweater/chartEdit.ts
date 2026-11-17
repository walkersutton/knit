/**
 * Editing a custom chart: a string of '0' and '1', one cell per stitch, top row first (see
 * `validMotif`). It is a standard chart (12 × 16) or a fine one (24 × 32); every edit keeps the
 * size it was given. Every edit returns a new string and leaves the old one alone, so undo is a list.
 */
import { tileOfMotif } from './motifs';

const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Stitches across and rows down, from the chart's length. */
const dims = (motif: string) => {
	const { st, rows } = tileOfMotif(motif);
	return { st, rows };
};
const build = (motif: string, cell: (i: number, j: number, st: number, rows: number) => string) => {
	const { st, rows } = dims(motif);
	let s = '';
	for (let j = 0; j < rows; j++) for (let i = 0; i < st; i++) s += cell(i, j, st, rows);
	return s;
};

export const isOn = (motif: string, i: number, j: number) => motif[j * dims(motif).st + i] === '1';

/** The cells on a straight line from one cell to another, both ends included, so a fast drag leaves no gaps. */
export function lineCells(i0: number, j0: number, i1: number, j1: number): [number, number][] {
	const out: [number, number][] = [];
	const dx = Math.abs(i1 - i0);
	const dy = -Math.abs(j1 - j0);
	const sx = i0 < i1 ? 1 : -1;
	const sy = j0 < j1 ? 1 : -1;
	let err = dx + dy;
	let [i, j] = [i0, j0];
	for (;;) {
		out.push([i, j]);
		if (i === i1 && j === j1) return out;
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			i += sx;
		}
		if (e2 <= dx) {
			err += dx;
			j += sy;
		}
	}
}

/** Sets each cell on or off. Cells outside the grid are ignored. Returns the same string if nothing changed. */
export function paint(motif: string, cells: [number, number][], on: boolean) {
	const chars = [...motif];
	const { st, rows } = dims(motif);
	let changed = false;
	for (const [i, j] of cells) {
		if (i < 0 || j < 0 || i >= st || j >= rows) continue;
		const k = j * st + i;
		const c = on ? '1' : '0';
		if (chars[k] !== c) {
			chars[k] = c;
			changed = true;
		}
	}
	return changed ? chars.join('') : motif;
}

/** Moves the whole chart, wrapping round the edges as the repeat does. */
export const shift = (motif: string, dx: number, dy: number) => build(motif, (i, j, st, rows) => motif[mod(j - dy, rows) * st + mod(i - dx, st)]);
/** Copies the left half onto the right, mirrored, for a symmetrical motif. */
export const mirror = (motif: string) => build(motif, (i, j, st) => motif[j * st + (i < st / 2 ? i : st - 1 - i)]);
/** Turns the chart left to right. */
export const flipH = (motif: string) => build(motif, (i, j, st) => motif[j * st + st - 1 - i]);
/** Turns the chart upside down. */
export const flipV = (motif: string) => build(motif, (i, j, st, rows) => motif[(rows - 1 - j) * st + i]);
/** Swaps the two colours. */
export const invert = (motif: string) => build(motif, (i, j, st) => (motif[j * st + i] === '1' ? '0' : '1'));
