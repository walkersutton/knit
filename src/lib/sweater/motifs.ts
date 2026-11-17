/**
 * Stitch-pattern library. Every pattern is a chart that repeats across one texture tile, TILE_ST
 * stitches wide and TILE_ROWS rows tall, so the 3D fabric, the written pattern and the chart all
 * agree. Small motifs are drawn once and repeated to fill the tile.
 */

export const TILE_ST = 12;
export const TILE_ROWS = 16;

/** Name of the pattern the knitter paints themselves. */
export const CUSTOM_PATTERN = 'Custom';

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** A colourwork chart's size. Both sizes cover about the same area of fabric at their own gauge. */
export type Tile = { st: number; rows: number; fine: boolean };
export const STANDARD_TILE: Tile = { st: TILE_ST, rows: TILE_ROWS, fine: false };
/** Twice the stitches and rows, so a motif can have rounded curves. 24 still divides by every rib repeat. */
export const FINE_TILE: Tile = { st: 2 * TILE_ST, rows: 2 * TILE_ROWS, fine: true };
/** From this gauge (stitches per 4 in) up, Fair Isle gets the detailed chart: DK is 22, fingering 28. */
export const FINE_GAUGE = 25;

/** The chart size for a pattern at a stitch gauge. Only Fair Isle has detail to gain from a finer yarn. */
export const tileFor = (pattern: string, gauge: number): Tile =>
	pattern === 'Fair isle' && gauge >= FINE_GAUGE ? FINE_TILE : STANDARD_TILE;

const BIG_HEART = [
	'.###...###.',
	'#####.#####',
	'###########',
	'###########',
	'.#########.',
	'..#######..',
	'...#####...',
	'....###....',
	'.....#.....'
];
const SMALL_HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

/** The fine Fair Isle chart: bands of hearts between peerie borders, the second band offset by half a repeat. */
const FINE_CHART: boolean[][] = (() => {
	const g = Array.from({ length: FINE_TILE.rows }, () => new Array<boolean>(FINE_TILE.st).fill(false));
	const stamp = (art: string[], col: number, row: number) =>
		art.forEach((line, dj) => [...line].forEach((c, di) => c === '#' && (g[mod(row + dj, FINE_TILE.rows)][mod(col + di, FINE_TILE.st)] = true)));
	for (const [base, shift] of [[0, 0], [16, 12]]) {
		for (let i = 0; i < FINE_TILE.st; i++) {
			g[base][i] = i % 2 === 0;
			g[base + 1][i] = true;
			g[base + 2][i] = i % 2 === 0;
		}
		stamp(BIG_HEART, 1 + shift, base + 4);
		stamp(SMALL_HEART, 15 + shift, base + 5);
	}
	return g;
})();

/** A motif drawn on a small grid ('#' = contrast colour) that must divide the tile exactly. */
type Motif = { w: number; h: number; rows: string[] };

/** Rows are padded with background to w × h, so only the drawn part needs writing out. */
const motif = (w: number, h: number, ...rows: string[]): Motif => ({ w, h, rows });

const MOTIFS: Record<string, Motif> = {
	Checks: motif(4, 4, '##..', '##..', '..##', '..##'),
	Dots: motif(4, 8, '#...', '', '', '', '..#.'),
	Diamonds: motif(6, 8, '..##..', '.#..#.', '.#..#.', '#....#', '#....#', '.#..#.', '.#..#.', '..##..'),
	Chevron: motif(6, 8, '#....#', '##..##', '.####.', '..##..'),
	Hearts: motif(6, 8, '.#.#..', '#####.', '#####.', '.###..', '..#...'),
	Snowflakes: motif(6, 8, '#.#.#.', '.###..', '##.##.', '.###..', '#.#.#.')
};

/** Patterns a knitter can pick, in the order the designer shows them. */
export const PATTERNS = ['Solid', 'Stripes', 'Fair isle', ...Object.keys(MOTIFS), CUSTOM_PATTERN];

/** One cell of a custom chart per stitch, rows top to bottom: a string of '0' and '1'. */
export const CUSTOM_LENGTH = TILE_ST * TILE_ROWS;
export const blankMotif = () => '0'.repeat(CUSTOM_LENGTH);
export const validMotif = (s: unknown): s is string => typeof s === 'string' && s.length === CUSTOM_LENGTH && /^[01]+$/.test(s);

/** A small starter for the custom pattern: a plain diamond, so the grid is never blank. */
export const starterMotif = () => motifToString((i, j) => MOTIFS.Diamonds.rows[mod(j, 8)]?.[mod(i, 6)] === '#');

function motifToString(on: (i: number, j: number) => boolean) {
	let s = '';
	for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) s += on(i, j) ? '1' : '0';
	return s;
}

/** The existing Fair Isle chart: a border, a cross-shaped flower and a row of ticks. */
function fairIsle(i: number, j: number) {
	if (j === 0 || j === 10) return true;
	if (j >= 2 && j <= 8) {
		const d = Math.abs(i - 6) + Math.abs(j - 5);
		const d2 = Math.abs(mod(i + 6, 12) - 6) + Math.abs(j - 5);
		return (d <= 3 && d !== 0) || d2 === 0;
	}
	return j === 13 && i % 4 === 2;
}

/** true = this stitch is worked in the contrast colour. `custom` is the knitter's own chart; `tile` picks the fine Fair Isle chart. */
export function chart(pattern: string, i: number, j: number, custom?: string, tile: Tile = STANDARD_TILE): boolean {
	if (pattern === 'Stripes') return j < 5;
	if (pattern === 'Fair isle') return tile.fine ? FINE_CHART[mod(j, tile.rows)][mod(i, tile.st)] : fairIsle(i, j);
	if (pattern === CUSTOM_PATTERN) return validMotif(custom) && custom[mod(j, TILE_ROWS) * TILE_ST + mod(i, TILE_ST)] === '1';
	const m = MOTIFS[pattern];
	return m ? m.rows[mod(j, m.h)]?.[mod(i, m.w)] === '#' : false;
}

/** Whole tile as rows of booleans, top to bottom. */
export const tileOf = (pattern: string, custom?: string, tile: Tile = STANDARD_TILE) =>
	Array.from({ length: tile.rows }, (_, j) => Array.from({ length: tile.st }, (_, i) => chart(pattern, i, j, custom, tile)));

/** Share of stitches in the contrast colour. */
export function contrastShare(pattern: string, custom?: string, tile: Tile = STANDARD_TILE) {
	let on = 0;
	for (const row of tileOf(pattern, custom, tile)) for (const c of row) on += +c;
	return on / (tile.st * tile.rows);
}

/**
 * The longest strand carried behind the work, in stitches: the longest run of one colour in a round
 * that also uses the other. Floats past about 5 stitches snag, so the pattern says to catch them.
 */
export function longestFloat(pattern: string, custom?: string, tile: Tile = STANDARD_TILE) {
	let best = 0;
	for (const row of tileOf(pattern, custom, tile)) {
		const n0 = row.length;
		const start = row.findIndex((c) => c !== row[0]);
		if (start < 0) continue; // one colour all the way round: nothing is carried
		let run = 0;
		for (let n = 0; n < n0; n++) {
			const i = (start + n) % n0;
			run = n && row[i] === row[(i + n0 - 1) % n0] ? run + 1 : 1;
			best = Math.max(best, run);
		}
	}
	return best;
}
