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

/** true = this stitch is worked in the contrast colour. `custom` is the knitter's own chart. */
export function chart(pattern: string, i: number, j: number, custom?: string): boolean {
	if (pattern === 'Stripes') return j < 5;
	if (pattern === 'Fair isle') return fairIsle(i, j);
	if (pattern === CUSTOM_PATTERN) return validMotif(custom) && custom[mod(j, TILE_ROWS) * TILE_ST + mod(i, TILE_ST)] === '1';
	const m = MOTIFS[pattern];
	return m ? m.rows[mod(j, m.h)]?.[mod(i, m.w)] === '#' : false;
}

/** Whole tile as rows of booleans, top to bottom. */
export const tileOf = (pattern: string, custom?: string) => Array.from({ length: TILE_ROWS }, (_, j) => Array.from({ length: TILE_ST }, (_, i) => chart(pattern, i, j, custom)));

/** Share of stitches in the contrast colour. */
export function contrastShare(pattern: string, custom?: string) {
	let on = 0;
	for (const row of tileOf(pattern, custom)) for (const c of row) on += +c;
	return on / (TILE_ST * TILE_ROWS);
}

/**
 * The longest strand carried behind the work, in stitches: the longest run of one colour in a round
 * that also uses the other. Floats past about 5 stitches snag, so the pattern says to catch them.
 */
export function longestFloat(pattern: string, custom?: string) {
	let best = 0;
	for (const row of tileOf(pattern, custom)) {
		const start = row.findIndex((c) => c !== row[0]);
		if (start < 0) continue; // one colour all the way round: nothing is carried
		let run = 0;
		for (let n = 0; n < TILE_ST; n++) {
			const i = (start + n) % TILE_ST;
			run = n && row[i] === row[(i + TILE_ST - 1) % TILE_ST] ? run + 1 : 1;
			best = Math.max(best, run);
		}
	}
	return best;
}
