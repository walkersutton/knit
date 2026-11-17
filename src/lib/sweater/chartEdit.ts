/**
 * Editing a custom chart: a string of '0' and '1', TILE_ST stitches by TILE_ROWS rows, top row first
 * (see `validMotif`). Every edit returns a new string and leaves the old one alone, so undo is a list.
 */
import { TILE_ROWS, TILE_ST } from './motifs';

const mod = (n: number, m: number) => ((n % m) + m) % m;
const build = (cell: (i: number, j: number) => string) => {
	let s = '';
	for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) s += cell(i, j);
	return s;
};

export const isOn = (motif: string, i: number, j: number) => motif[j * TILE_ST + i] === '1';

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
	let changed = false;
	for (const [i, j] of cells) {
		if (i < 0 || j < 0 || i >= TILE_ST || j >= TILE_ROWS) continue;
		const k = j * TILE_ST + i;
		const c = on ? '1' : '0';
		if (chars[k] !== c) {
			chars[k] = c;
			changed = true;
		}
	}
	return changed ? chars.join('') : motif;
}

/** Moves the whole chart, wrapping round the edges as the repeat does. */
export const shift = (motif: string, dx: number, dy: number) => build((i, j) => motif[mod(j - dy, TILE_ROWS) * TILE_ST + mod(i - dx, TILE_ST)]);
/** Copies the left half onto the right, mirrored, for a symmetrical motif. */
export const mirror = (motif: string) => build((i, j) => motif[j * TILE_ST + (i < TILE_ST / 2 ? i : TILE_ST - 1 - i)]);
/** Turns the chart left to right. */
export const flipH = (motif: string) => build((i, j) => motif[j * TILE_ST + TILE_ST - 1 - i]);
/** Turns the chart upside down. */
export const flipV = (motif: string) => build((i, j) => motif[(TILE_ROWS - 1 - j) * TILE_ST + i]);
/** Swaps the two colours. */
export const invert = (motif: string) => build((i, j) => (isOn(motif, i, j) ? '0' : '1'));
