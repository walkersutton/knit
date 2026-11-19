/**
 * The knitter's own colourwork charts, kept in this browser. Both designers live at /design, with the
 * charts and the sweater patterns listed in one sidebar. The chart designer edits a chart; the sweater
 * designer picks one for its Custom pattern. A chart travels in a link: /design#motif=…&color=…&contrast=…
 * opens the sweater designer with it, and adding tool=chart opens the chart designer on it instead.
 */
import { CUSTOM_PATTERN, starterMotif, tileOfMotif, validMotif } from './motifs';
import { parseCenterpiece } from './centerpiece';
import { DEFAULT_DESIGN } from './defaults';
import type { Design } from './garment';
import { choose, colors } from './options';

/** `notes` is the knitter's own words about a chart: yarn, ideas, where it came from. */
export type SavedPattern = { id: string; name: string; motif: string; notes?: string };
/** A centerpiece the knitter has drawn, kept beside their charts. `centerpiece` is its text (see `centerpiece.ts`). */
export type SavedCenterpiece = { id: string; name: string; centerpiece: string };
export type Library = { patterns: SavedPattern[]; centerpieces: SavedCenterpiece[]; color: string; contrast: string };

const KEY = 'knit-it:patterns:v1';
/** The sweater designer's saved state, read here only for its colours. */
const DESIGN_KEY = 'knit-it:v1';
const PALETTE = new Set(colors.map((c) => String(c.value)));
const DEFAULT_COLORS = { color: '#465e9d', contrast: '#faf3dc' };

/** The longest note a chart or a pattern keeps. */
export const NOTES_MAX = 1000;
/** Notes as they are stored and shared: plain text, Unix line ends, no blank edges, at most NOTES_MAX characters. */
export const cleanNotes = (value: unknown) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, NOTES_MAX) : '');

export const newId = () => Math.random().toString(36).slice(2, 10);
export const isPaletteColor = (c: unknown): c is string => typeof c === 'string' && PALETTE.has(c);

/** A library from whatever was stored: broken entries are dropped and there is always one chart to edit. */
export function parseLibrary(raw: unknown, design?: unknown): Library {
	const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const d = design && typeof design === 'object' ? (design as Record<string, unknown>) : {};
	const patterns: SavedPattern[] = [];
	for (const p of Array.isArray(r.patterns) ? r.patterns : []) {
		if (p && typeof p.id === 'string' && typeof p.name === 'string' && validMotif(p.motif)) {
			const notes = cleanNotes(p.notes);
			patterns.push({ id: p.id, name: p.name.slice(0, 40), motif: p.motif, ...(notes && { notes }) });
		}
	}
	if (!patterns.length) patterns.push({ id: newId(), name: 'My pattern', motif: starterMotif() });
	const centerpieces: SavedCenterpiece[] = [];
	for (const c of Array.isArray(r.centerpieces) ? r.centerpieces : []) {
		if (c && typeof c.id === 'string' && typeof c.name === 'string' && parseCenterpiece(c.centerpiece)) centerpieces.push({ id: c.id, name: c.name.slice(0, 40), centerpiece: c.centerpiece });
	}
	// Until the knitter picks colours here, preview in the sweater's own.
	const color = isPaletteColor(r.color) ? r.color : isPaletteColor(d.color) ? d.color : DEFAULT_COLORS.color;
	const contrast = isPaletteColor(r.contrast) ? r.contrast : isPaletteColor(d.contrast) ? d.contrast : DEFAULT_COLORS.contrast;
	return { patterns, centerpieces, color, contrast };
}

export function loadLibrary(): Library {
	const read = (key: string) => {
		try {
			return JSON.parse(localStorage.getItem(key) ?? 'null');
		} catch {
			return null;
		}
	};
	return parseLibrary(read(KEY), read(DESIGN_KEY)?.design);
}

/** The charts the knitter has kept, without the placeholder chart the designer invents when there are none. Account charts are merged into storage on sign-in. */
export function loadOwnCharts(): { library: Library; charts: SavedPattern[] } {
	const library = loadLibrary();
	const starter = starterMotif();
	return { library, charts: library.patterns.filter((p) => !(p.name === 'My pattern' && p.motif === starter)) };
}

export function saveLibrary(lib: Library) {
	try {
		localStorage.setItem(KEY, JSON.stringify(lib));
		window.dispatchEvent(new Event('knit:local-save'));
	} catch {
		// Private windows and blocked storage: the page still works, it just forgets.
	}
}

/** The name for a copy or a new chart that no other chart has yet: "Hearts 2", "Hearts 3"… */
export function freshName(base: string, taken: string[]) {
	const stem = base.replace(/\s+\d+$/, '');
	if (!taken.includes(stem)) return stem;
	let n = 2;
	while (taken.includes(`${stem} ${n}`)) n++;
	return `${stem} ${n}`;
}

/** A link that opens the sweater designer with this chart as its pattern, in these colours. */
export const designLink = (motif: string, color?: string, contrast?: string) => {
	const q = new URLSearchParams({ motif });
	if (color) q.set('color', color);
	if (contrast) q.set('contrast', contrast);
	return `/design#${q}`;
};

/** A link that shows this chart on a 3D garment (/chart/view). */
export const previewLink = (motif: string, color?: string, contrast?: string, garment?: string, id?: string) => {
	const q = new URLSearchParams({ motif });
	if (id) q.set('id', id);
	if (color) q.set('color', color);
	if (contrast) q.set('contrast', contrast);
	if (garment && garment !== 'Sweater') q.set('garment', garment);
	return `/chart/view#${q}`;
};

/** A link that opens this chart in the chart designer. */
export const editLink = (motif: string) => `/design#${new URLSearchParams({ tool: 'chart', motif })}`;

/** Whether a /design link asks for the chart designer rather than the sweater designer. */
export const wantsChart = (hash: string) => new URLSearchParams(hash.replace(/^#/, '')).get('tool') === 'chart';
/** Whether a /design link asks for the centerpiece designer. */
export const wantsCenterpiece = (hash: string) => new URLSearchParams(hash.replace(/^#/, '')).get('tool') === 'centerpiece';

/** A link that puts this centerpiece on the sweater in the designer, in these colours. */
export const centerpieceDesignLink = (centerpiece: string, color?: string, contrast?: string) => {
	const q = new URLSearchParams({ centerpiece });
	if (color) q.set('color', color);
	if (contrast) q.set('contrast', contrast);
	return `/design#${q}`;
};

/** A link that opens this centerpiece in the centerpiece designer. */
export const centerpieceEditLink = (centerpiece: string) => `/design#${new URLSearchParams({ tool: 'centerpiece', centerpiece })}`;

/** What a #centerpiece=… link carries, or undefined if it is not one. Colours outside the palette are left out. */
export function readCenterpieceHash(hash: string): { centerpiece: string; color?: string; contrast?: string } | undefined {
	const q = new URLSearchParams(hash.replace(/^#/, ''));
	const centerpiece = q.get('centerpiece');
	if (!parseCenterpiece(centerpiece)) return undefined;
	const color = q.get('color');
	const contrast = q.get('contrast');
	return { centerpiece: centerpiece!, ...(isPaletteColor(color) && { color }), ...(isPaletteColor(contrast) && { contrast }) };
}

/**
 * A shared chart is either a repeating chart or a centerpiece, told apart by its text: a centerpiece
 * starts with its size ("20x11:…"), a chart is only cells.
 */
export const isCenterpieceChart = (motif: string) => parseCenterpiece(motif) !== null;

/** The garments a chart can be shown on. */
export const GARMENTS = ['Sweater', 'T-shirt', 'Slipover', 'Cardigan'];

/** A chart on a garment: a centerpiece worked once on the front, any other chart all over. */
export function chartDesign(motif: string, color: string, contrast: string, garment = 'Sweater'): Design {
	const d: Design = isCenterpieceChart(motif)
		? { ...DEFAULT_DESIGN, centerpiece: motif, color, contrast }
		: { ...DEFAULT_DESIGN, pattern: CUSTOM_PATTERN, motif, color, contrast };
	// Through `choose`, so a T-shirt gets its short sleeves.
	choose(d, 'garment', GARMENTS.includes(garment) ? garment : 'Sweater');
	return d;
}

/** A shared chart's size in words: "12 × 16", "24 × 32 · fine" or "20 × 11 centerpiece". */
export function chartSize(motif: string) {
	const cp = parseCenterpiece(motif);
	if (cp) return `${cp.w} × ${cp.h} centerpiece`;
	const tile = tileOfMotif(motif);
	return `${tile.st} × ${tile.rows}${tile.fine ? ' · fine' : ''}`;
}

/** What a #motif=… link carries, or undefined if it is not one. Colours outside the palette are left out. */
export function readMotifHash(hash: string): { motif: string; color?: string; contrast?: string } | undefined {
	const q = new URLSearchParams(hash.replace(/^#/, ''));
	const motif = q.get('motif');
	if (!validMotif(motif)) return undefined;
	const color = q.get('color');
	const contrast = q.get('contrast');
	return { motif, ...(isPaletteColor(color) && { color }), ...(isPaletteColor(contrast) && { contrast }) };
}
