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

/**
 * A chart's size. `fine` charts draw every motif on a grid twice as fine, so it comes out twice as big
 * in stitches with rounder curves and thinner lines. `stripe` is a stripe repeat: contrast rows, out of `period`.
 */
export type Tile = { st: number; rows: number; fine: boolean; stripe?: [on: number, period: number] };
export const STANDARD_TILE: Tile = { st: TILE_ST, rows: TILE_ROWS, fine: false };
/** Twice the stitches and rows, so a motif can have rounded curves. 24 still divides by every rib repeat. */
export const FINE_TILE: Tile = { st: 2 * TILE_ST, rows: 2 * TILE_ROWS, fine: true };
/** From this gauge (stitches per 4 in) up, Fair Isle gets the detailed chart: DK is 22, fingering 28. */
export const FINE_GAUGE = 25;

/** The parts of a design that decide its chart. */
export type ChartSpec = { pattern: string; motif?: string; motifScale?: string; stripeWidth?: string };

/**
 * Motif sizes a knitter can pick. 'Small' works each motif on the standard chart; 'Large' on the fine
 * one, twice the stitches each way, with the shapes redrawn rather than blown up. 'Auto' picks Large
 * from FINE_GAUGE up, where small motifs would be tiny.
 */
export const MOTIF_SCALES = ['Auto', 'Small', 'Large'];

/** Stripe widths: rows of contrast colour, out of a repeat of rows. Every repeat divides the tile's rows. */
export const STRIPE_WIDTHS: Record<string, [on: number, period: number]> = {
	Pinstripe: [1, 4],
	Narrow: [2, 4],
	Regular: [5, 16],
	Wide: [8, 16],
	Bold: [16, 32]
};
export const stripeOf = (width?: string): [on: number, period: number] => STRIPE_WIDTHS[width ?? ''] ?? STRIPE_WIDTHS.Regular;

/** Whether a design's motifs are worked on the fine chart, at a stitch gauge. */
export const isLarge = (spec: ChartSpec, gauge: number) => (spec.motifScale === 'Large' ? true : spec.motifScale === 'Small' ? false : gauge >= FINE_GAUGE);

/**
 * The chart a design is knitted from, at a stitch gauge. A custom chart is whatever size its knitter
 * drew it (see `tileOfMotif`), at any gauge; stripes are as tall as their repeat needs.
 */
export function tileFor(spec: ChartSpec, gauge: number): Tile {
	if (spec.pattern === CUSTOM_PATTERN) return tileOfMotif(spec.motif);
	if (spec.pattern === 'Stripes') {
		const stripe = stripeOf(spec.stripeWidth);
		return { st: TILE_ST, rows: Math.max(TILE_ROWS, stripe[1]), fine: false, stripe };
	}
	if (spec.pattern === 'Solid') return STANDARD_TILE;
	return isLarge(spec, gauge) ? FINE_TILE : STANDARD_TILE;
}

/**
 * Whether a custom chart suits the yarn: a fine chart wants a gauge of FINE_GAUGE or more, a standard
 * one is wasted on it. Undefined when they match, or when there is no valid chart yet.
 */
export function chartFit(motif: string | undefined, gauge: number): 'too-fine' | 'too-coarse' | undefined {
	if (!validMotif(motif)) return undefined;
	const fine = tileOfMotif(motif).fine;
	if (fine && gauge < FINE_GAUGE) return 'too-fine';
	if (!fine && gauge >= FINE_GAUGE) return 'too-coarse';
	return undefined;
}

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

/**
 * The same motifs for the fine chart, twice the stitches each way, so a curve can be rounded and a line
 * one stitch thin. Each still divides FINE_TILE exactly.
 */
const FINE_MOTIFS: Record<string, Motif> = {
	Checks: motif(8, 8, '####....', '####....', '####....', '####....', '....####', '....####', '....####', '....####'),
	Dots: motif(8, 16, '.#......', '###.....', '.#......', '', '', '', '', '', '.....#..', '....###.', '.....#..'),
	Diamonds: motif(
		12,
		16,
		'.....##.....',
		'....#..#....',
		'....#..#....',
		'...#....#...',
		'..#......#..',
		'..#..##..#..',
		'.#..#..#..#.',
		'#..#....#..#',
		'#..#....#..#',
		'.#..#..#..#.',
		'..#..##..#..',
		'..#......#..',
		'...#....#...',
		'....#..#....',
		'....#..#....',
		'.....##.....'
	),
	Chevron: motif(12, 16, '##........##', '###......###', '.###....###.', '..###..###..', '...######...', '....####....', '.....##.....'),
	Hearts: motif(12, 16, '.###...###..', '#####.#####.', '###########.', '###########.', '.#########..', '..#######...', '...#####....', '....###.....', '.....#......'),
	Snowflakes: motif(
		12,
		16,
		'.....#......',
		'....###.....',
		'..#..#..#...',
		'...#.#.#....',
		'.#..#.#..#..',
		'####...####.',
		'.#..#.#..#..',
		'...#.#.#....',
		'..#..#..#...',
		'....###.....',
		'.....#......'
	)
};

/** Patterns a knitter can pick, in the order the designer shows them. */
export const PATTERNS = ['Solid', 'Stripes', 'Fair isle', ...Object.keys(MOTIFS), CUSTOM_PATTERN];

/**
 * One cell of a custom chart per stitch, rows top to bottom: a string of '0' and '1'. Its length
 * says which size it is: a standard chart (12 × 16) or a fine one (24 × 32) for thinner yarn.
 */
export const CUSTOM_LENGTH = TILE_ST * TILE_ROWS;
export const FINE_LENGTH = FINE_TILE.st * FINE_TILE.rows;
export const validMotif = (s: unknown): s is string => typeof s === 'string' && (s.length === CUSTOM_LENGTH || s.length === FINE_LENGTH) && /^[01]+$/.test(s);
/** The size of a custom chart; anything that is not a valid fine chart counts as a standard one. */
export const tileOfMotif = (s?: string): Tile => (validMotif(s) && s.length === FINE_LENGTH ? FINE_TILE : STANDARD_TILE);
export const blankMotif = (tile: Tile = STANDARD_TILE) => '0'.repeat(tile.st * tile.rows);

/** A small starter for the custom pattern: a plain diamond, so the grid is never blank. */
export const starterMotif = (tile: Tile = STANDARD_TILE) => motifToString(tile, (i, j) => MOTIFS.Diamonds.rows[mod(j, 8)]?.[mod(i, 6)] === '#');

function motifToString(tile: Tile, on: (i: number, j: number) => boolean) {
	// A fine chart draws the same picture with every stitch twice as big on the grid.
	const k = tile.fine ? 2 : 1;
	let s = '';
	for (let j = 0; j < tile.rows; j++) for (let i = 0; i < tile.st; i++) s += on(Math.floor(i / k), Math.floor(j / k)) ? '1' : '0';
	return s;
}

/**
 * The same chart on the other size's grid. Going finer turns each stitch into a 2 × 2 block, so the
 * picture is unchanged and can then be refined; going coarser keeps a stitch if at least two of its
 * four cells were painted, so detail is lost.
 */
export function resizeMotif(motif: string, to: Tile): string {
	const from = tileOfMotif(motif);
	if (from.fine === to.fine) return motif;
	let s = '';
	if (to.fine) {
		for (let j = 0; j < to.rows; j++) for (let i = 0; i < to.st; i++) s += motif[Math.floor(j / 2) * from.st + Math.floor(i / 2)];
	} else {
		for (let j = 0; j < to.rows; j++)
			for (let i = 0; i < to.st; i++) {
				let n = 0;
				for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) n += +(motif[(2 * j + dj) * from.st + 2 * i + di] === '1');
				s += n >= 2 ? '1' : '0';
			}
	}
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

/** The chart for a pattern with nothing else chosen: standard size, regular stripes. */
const plainTile = (pattern: string, custom?: string) => tileFor({ pattern, motif: custom, motifScale: 'Small' }, 0);

/** true = this stitch is worked in the contrast colour. `custom` is the knitter's own chart; `tile` (see `tileFor`) picks the fine motifs and the stripe width. */
export function chart(pattern: string, i: number, j: number, custom?: string, tile: Tile = plainTile(pattern, custom)): boolean {
	if (pattern === 'Stripes') {
		const [on, period] = tile.stripe ?? stripeOf();
		return mod(j, period) < on;
	}
	if (pattern === 'Fair isle') return tile.fine ? FINE_CHART[mod(j, tile.rows)][mod(i, tile.st)] : fairIsle(i, j);
	if (pattern === CUSTOM_PATTERN) {
		const t = tileOfMotif(custom); // the chart's own size, whatever `tile` says
		return validMotif(custom) && custom[mod(j, t.rows) * t.st + mod(i, t.st)] === '1';
	}
	const m = (tile.fine && FINE_MOTIFS[pattern]) || MOTIFS[pattern];
	return m ? m.rows[mod(j, m.h)]?.[mod(i, m.w)] === '#' : false;
}

/** Whole tile as rows of booleans, top to bottom. */
export const tileOf = (pattern: string, custom?: string, tile: Tile = plainTile(pattern, custom)) =>
	Array.from({ length: tile.rows }, (_, j) => Array.from({ length: tile.st }, (_, i) => chart(pattern, i, j, custom, tile)));

/** Share of stitches in the contrast colour. */
export function contrastShare(pattern: string, custom?: string, tile: Tile = plainTile(pattern, custom)) {
	let on = 0;
	for (const row of tileOf(pattern, custom, tile)) for (const c of row) on += +c;
	return on / (tile.st * tile.rows);
}

/**
 * The longest strand carried behind the work, in stitches: the longest run of one colour in a round
 * that also uses the other. Floats past about 5 stitches snag, so the pattern says to catch them.
 */
export function longestFloat(pattern: string, custom?: string, tile: Tile = plainTile(pattern, custom)) {
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
