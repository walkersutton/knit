/**
 * A centerpiece: one picture or word worked once on the front of the body, not repeated like the
 * all-over pattern. It is a grid of cells (a stitch wide, a row tall) kept in a design as text:
 * `"<w>x<h>:<cells>"`, cells being '0' (main colour) and '1' (contrast colour), rows top to bottom.
 * An empty string means no centerpiece.
 */

export const MAX_W = 40;
export const MAX_H = 48;
export const MIN_SIZE = 3;

export type Centerpiece = { w: number; h: number; cells: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const encodeCenterpiece = (c: Centerpiece) => `${c.w}x${c.h}:${c.cells}`;

/** The centerpiece a design carries, or null for none, or for text that is not a whole, sensible grid. */
export function parseCenterpiece(s: unknown): Centerpiece | null {
	if (typeof s !== 'string') return null;
	const m = /^(\d{1,2})x(\d{1,2}):([01]+)$/.exec(s);
	if (!m) return null;
	const w = +m[1];
	const h = +m[2];
	if (w < MIN_SIZE || h < MIN_SIZE || w > MAX_W || h > MAX_H || m[3].length !== w * h) return null;
	return { w, h, cells: m[3] };
}

/** Whether a design's field holds no centerpiece or a valid one. */
export const validCenterpiece = (s: unknown) => s === '' || parseCenterpiece(s) !== null;

export const blankCenterpiece = (w = 20, h = 20): Centerpiece => ({ w: clamp(w, MIN_SIZE, MAX_W), h: clamp(h, MIN_SIZE, MAX_H), cells: '0'.repeat(clamp(w, MIN_SIZE, MAX_W) * clamp(h, MIN_SIZE, MAX_H)) });

export const cellOn = (c: Centerpiece, i: number, j: number) => i >= 0 && j >= 0 && i < c.w && j < c.h && c.cells[j * c.w + i] === '1';

/** The grid as rows of booleans, top to bottom: what the written pattern and the 3D texture read. */
export const rowsOf = (c: Centerpiece) => Array.from({ length: c.h }, (_, j) => Array.from({ length: c.w }, (_, i) => cellOn(c, i, j)));

export const countOn = (c: Centerpiece) => [...c.cells].filter((x) => x === '1').length;

const build = (c: Centerpiece, w: number, h: number, on: (i: number, j: number) => boolean): Centerpiece => {
	let cells = '';
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells += on(i, j) ? '1' : '0';
	return { w, h, cells };
};

/** Paints cells on or off (cells outside the grid are ignored). Returns the same grid if nothing changed. */
export function paintCells(c: Centerpiece, at: [number, number][], on: boolean): Centerpiece {
	const chars = [...c.cells];
	let changed = false;
	for (const [i, j] of at) {
		if (i < 0 || j < 0 || i >= c.w || j >= c.h) continue;
		const k = j * c.w + i;
		const v = on ? '1' : '0';
		if (chars[k] !== v) ((chars[k] = v), (changed = true));
	}
	return changed ? { ...c, cells: chars.join('') } : c;
}

/** The same picture on a bigger or smaller grid, kept in the middle; what no longer fits is cut off. */
export function resizeCenterpiece(c: Centerpiece, w: number, h: number): Centerpiece {
	w = clamp(Math.round(w), MIN_SIZE, MAX_W);
	h = clamp(Math.round(h), MIN_SIZE, MAX_H);
	const dx = Math.floor((w - c.w) / 2);
	const dy = Math.floor((h - c.h) / 2);
	return build(c, w, h, (i, j) => cellOn(c, i - dx, j - dy));
}

/** Moves the picture on its grid. What leaves one edge is lost (it does not wrap: this is not a repeat). */
export const shiftCenterpiece = (c: Centerpiece, dx: number, dy: number) => build(c, c.w, c.h, (i, j) => cellOn(c, i - dx, j - dy));
export const flipCenterpieceH = (c: Centerpiece) => build(c, c.w, c.h, (i, j) => cellOn(c, c.w - 1 - i, j));
export const flipCenterpieceV = (c: Centerpiece) => build(c, c.w, c.h, (i, j) => cellOn(c, i, c.h - 1 - j));
export const invertCenterpiece = (c: Centerpiece) => build(c, c.w, c.h, (i, j) => !cellOn(c, i, j));
/** Copies the left half onto the right, mirrored, for a symmetrical picture. */
export const mirrorCenterpiece = (c: Centerpiece) => build(c, c.w, c.h, (i, j) => cellOn(c, i < c.w / 2 ? i : c.w - 1 - i, j));

/** The smallest grid that holds everything painted, so a picture can be centred or sized to fit. Null when blank. */
export function trimCenterpiece(c: Centerpiece): Centerpiece | null {
	let [x0, y0, x1, y1] = [c.w, c.h, -1, -1];
	for (let j = 0; j < c.h; j++)
		for (let i = 0; i < c.w; i++)
			if (cellOn(c, i, j)) [x0, y0, x1, y1] = [Math.min(x0, i), Math.min(y0, j), Math.max(x1, i), Math.max(y1, j)];
	if (x1 < 0) return null;
	const [w, h] = [Math.max(MIN_SIZE, x1 - x0 + 1), Math.max(MIN_SIZE, y1 - y0 + 1)];
	return build(c, w, h, (i, j) => cellOn(c, i + x0, j + y0));
}

// ── Words ───────────────────────────────────────────────────────────────
/** A 5 × 7 letter-form font: each glyph is seven rows of five cells. */
const GLYPHS: Record<string, string[]> = {
	A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
	C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
	D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
	E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
	F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
	G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
	H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
	J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
	K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
	L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
	M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
	N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
	O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
	Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
	R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
	S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
	T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
	U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
	W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
	X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
	Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
	Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
	'0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
	'1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
	'2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
	'3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
	'4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
	'5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
	'6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
	'7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
	'8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
	'9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
	'!': ['#', '#', '#', '#', '#', '.', '#'],
	'?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
	'.': ['.', '.', '.', '.', '.', '.', '#'],
	',': ['.', '.', '.', '.', '.', '#', '#'],
	'-': ['...', '...', '...', '###', '...', '...', '...'],
	"'": ['#', '#', '.', '.', '.', '.', '.'],
	':': ['.', '#', '.', '.', '.', '#', '.'],
	'&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
	'+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
	'♥': ['.#.#.', '#####', '#####', '#####', '.###.', '..#..', '.....']
};
export const GLYPH_HEIGHT = 7;
const GAP = 1;
/** Letters with a descender sit as in print (the font has none), so every glyph is 7 rows tall. */
export const hasGlyph = (ch: string) => ch === ' ' || ch.toUpperCase() in GLYPHS;

/**
 * Words as a grid: up to a few lines, each in a 5 × 7 letter-form font with a stitch between
 * letters and between lines, centred. Characters the font lacks are skipped. Returns the grid
 * trimmed to the text, or null when there is nothing to show, plus whether it fits in MAX_W.
 */
export function textCenterpiece(text: string, maxWidth = MAX_W): { centerpiece: Centerpiece; fits: boolean } | null {
	const lines = text
		.toUpperCase()
		.split('\n')
		.slice(0, 5)
		.map((line) => [...line].filter(hasGlyph).join('').trim());
	const used = lines.filter(Boolean);
	if (!used.length) return null;
	const widthOf = (line: string) => [...line].reduce((sum, ch, n) => sum + (ch === ' ' ? 3 : GLYPHS[ch][0].length) + (n ? GAP : 0), 0);
	const w = Math.max(MIN_SIZE, ...used.map(widthOf));
	const h = Math.max(MIN_SIZE, used.length * GLYPH_HEIGHT + (used.length - 1) * 2);
	const grid = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
	used.forEach((line, row) => {
		let x = Math.floor((w - widthOf(line)) / 2);
		const y = row * (GLYPH_HEIGHT + 2);
		[...line].forEach((ch, n) => {
			if (n) x += GAP;
			if (ch === ' ') return void (x += 3);
			const glyph = GLYPHS[ch];
			glyph.forEach((r, dj) => [...r].forEach((c, di) => c === '#' && (grid[y + dj][x + di] = true)));
			x += glyph[0].length;
		});
	});
	const cells = grid.map((r) => r.map((on) => (on ? '1' : '0')).join('')).join('');
	const fits = w <= Math.min(MAX_W, maxWidth) && h <= MAX_H;
	// A grid past the limit is cut to it, so the preview still shows what the text would look like.
	const centerpiece = w > MAX_W || h > MAX_H ? resizeCenterpiece({ w, h, cells }, Math.min(w, MAX_W), Math.min(h, MAX_H)) : { w, h, cells };
	return { centerpiece, fits };
}

// ── Pictures ────────────────────────────────────────────────────────────
/**
 * A picture as cells. `rgba` is the picture already drawn at w × h pixels; a pixel becomes the
 * contrast colour when it is opaque and darker than `level` (0–255, higher takes more).
 */
export function imageCenterpiece(rgba: ArrayLike<number>, w: number, h: number, level = 128): Centerpiece {
	let cells = '';
	for (let k = 0; k < w * h; k++) {
		const [r, g, b, a] = [rgba[k * 4], rgba[k * 4 + 1], rgba[k * 4 + 2], rgba[k * 4 + 3]];
		const luma = 0.299 * r + 0.587 * g + 0.114 * b;
		cells += a >= 128 && luma < level ? '1' : '0';
	}
	return { w, h, cells };
}

/** The grid size that keeps a picture's proportions inside `box` stitches by `maxH` rows. */
export function fitSize(srcW: number, srcH: number, maxW: number, maxH: number, rowAspect = 1) {
	// A stitch is wider than a row is tall: about 4 sts to 5 rows in stockinette, so rows are rowAspect shorter.
	const ratio = (srcW / srcH) * rowAspect;
	let w = Math.min(maxW, MAX_W);
	let h = Math.round(w / ratio);
	if (h > Math.min(maxH, MAX_H)) {
		h = Math.min(maxH, MAX_H);
		w = Math.round(h * ratio);
	}
	return { w: clamp(w, MIN_SIZE, MAX_W), h: clamp(h, MIN_SIZE, MAX_H) };
}

// ── Where it goes ───────────────────────────────────────────────────────
/** What a centerpiece needs to know about the sweater: stitch and row density, and the plain body below the underarm. */
export type BodyBox = {
	stPerCm: number;
	rowPerCm: number;
	chest: number;
	ya: number;
	hemH: number;
	slitH: number;
	rolled: number;
	/**
	 * Front stitches on each row above the underarm where the front is one plain piece, nearest the
	 * underarm first: the round that joins the body at the underarm, then the yoke rows above it, up to
	 * where the neck shaping ends. Empty when the picture cannot rise into the yoke.
	 */
	yoke?: number[];
};

/** Where across the front the picture goes: the middle, or over the wearer's left or right chest. */
export const PLACEMENTS = ['Centre', 'Left chest', 'Right chest'];

/**
 * How far the picture's middle is from the middle of the front, in stitches, towards the viewer's
 * right (+, the wearer's left) or left (−). A chest placement sits an eighth of the way round.
 */
export function offsetSts(at: string, b: BodyBox) {
	const d = Math.round((b.chest * b.stPerCm) / 8);
	return at === 'Left chest' ? d : at === 'Right chest' ? -d : 0;
}

/** Rows of plain body under the underarm available to a centerpiece, and stitches across the front where it is placed. */
export function room(b: BodyBox, at = 'Centre') {
	const rows = Math.max(0, Math.round((b.ya - b.hemH - b.rolled - b.slitH) * b.rowPerCm));
	// The front is half the round; leave a few stitches each side so it never reaches the side seams.
	const front = Math.floor((b.chest * b.stPerCm) / 2) - 4 - 2 * Math.abs(offsetSts(at, b));
	return { rows, sts: Math.max(0, Math.min(MAX_W, front)) };
}

/**
 * How many rows above the underarm the top of the picture can go: up into the yoke while the front
 * there is wide enough for it (with a couple of stitches spare each side), and never into the neckline.
 */
export function riseRows(c: { w: number }, b: BodyBox, at = 'Centre') {
	const yoke = b.yoke ?? [];
	const need = c.w + 2 * Math.abs(offsetSts(at, b)) + 4;
	const usable = Math.max(0, yoke.length - Math.round(2.5 * b.rowPerCm));
	let n = 0;
	while (n < usable && yoke[n] >= need) n++;
	return n;
}

/**
 * How far below the underarm the top of the picture sits, in rows; negative when it is up in the yoke.
 * `y` runs from -1 (as high as it can go, up on the chest) through 0 (right under the arms) to 1 (as
 * low as it can go before the hem or slits).
 */
export function dropRows(c: Centerpiece, y: number, b: BodyBox, at = 'Centre') {
	const lo = -riseRows(c, b, at);
	const hi = Math.max(lo, room(b).rows - c.h);
	const raw = y < 0 ? clamp(y, -1, 0) * -lo : clamp(y, 0, 1) * Math.max(0, hi);
	return Math.round(clamp(raw, lo, hi));
}

/** Whether the picture fits the sweater at its gauge, and what is in the way if not. */
export function fitProblem(c: Centerpiece, b: BodyBox, at = 'Centre'): 'wide' | 'tall' | undefined {
	const r = room(b, at);
	if (c.w > r.sts) return 'wide';
	if (c.h > r.rows + riseRows(c, b, at)) return 'tall';
	return undefined;
}

/** Stitches from the beginning of the round (centre back) to the start of the picture, which sits in the middle of the front. */
export const leftOf = (c: Centerpiece, bodySts: number) => Math.max(0, Math.floor((bodySts - c.w) / 2));

// ── From a design ───────────────────────────────────────────────────────
/** The centerpiece a design asks for. A cardigan opens down the front, so it has none. */
export const centerpieceOf = (d: { garment: string; centerpiece?: string }) => (d.garment === 'Cardigan' ? null : parseCenterpiece(d.centerpiece));

/** The measurements of a design's body that decide where a centerpiece can go (see `measure`). */
export const bodyBoxOf = (d: { hemFinish: string }, m: { stPerCm: number; rowPerCm: number; chest: number; ya: number; hemH: number; slitH: number; k: number }): BodyBox => ({
	stPerCm: m.stPerCm,
	rowPerCm: m.rowPerCm,
	chest: m.chest,
	ya: m.ya,
	hemH: m.hemH,
	slitH: m.slitH,
	rolled: d.hemFinish === 'Rolled edge' ? 2 * m.k : 0
});

/**
 * The longest strand carried behind the picture, in stitches: a run of contrast colour (the main
 * colour is carried behind it) or a run of main colour between two contrast stitches. Runs at the
 * edge of a row are plain knitting and carry nothing.
 */
export function longestStrand(c: Centerpiece) {
	let best = 0;
	for (let j = 0; j < c.h; j++) {
		const row = Array.from({ length: c.w }, (_, i) => cellOn(c, i, j));
		const first = row.indexOf(true);
		const last = row.lastIndexOf(true);
		if (first < 0) continue;
		let run = 0;
		for (let i = first; i <= last; i++) {
			run = i > first && row[i] === row[i - 1] ? run + 1 : 1;
			best = Math.max(best, run);
		}
	}
	return best;
}
