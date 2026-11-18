/**
 * The knitter's own colourwork charts, kept in this browser. Both designers live at /design, with the
 * charts and the sweater patterns listed in one sidebar. The chart designer edits a chart; the sweater
 * designer picks one for its Custom pattern. A chart travels in a link: /design#motif=…&color=…&contrast=…
 * opens the sweater designer with it, and adding tool=chart opens the chart designer on it instead.
 */
import { starterMotif, validMotif } from './motifs';
import { colors } from './options';

export type SavedPattern = { id: string; name: string; motif: string };
export type Library = { patterns: SavedPattern[]; color: string; contrast: string };

const KEY = 'knit-it:patterns:v1';
/** The sweater designer's saved state, read here only for its colours. */
const DESIGN_KEY = 'knit-it:v1';
const PALETTE = new Set(colors.map((c) => String(c.value)));
const DEFAULT_COLORS = { color: '#465e9d', contrast: '#faf3dc' };

export const newId = () => Math.random().toString(36).slice(2, 10);
export const isPaletteColor = (c: unknown): c is string => typeof c === 'string' && PALETTE.has(c);

/** A library from whatever was stored: broken entries are dropped and there is always one chart to edit. */
export function parseLibrary(raw: unknown, design?: unknown): Library {
	const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const d = design && typeof design === 'object' ? (design as Record<string, unknown>) : {};
	const patterns: SavedPattern[] = [];
	for (const p of Array.isArray(r.patterns) ? r.patterns : []) {
		if (p && typeof p.id === 'string' && typeof p.name === 'string' && validMotif(p.motif)) patterns.push({ id: p.id, name: p.name.slice(0, 40), motif: p.motif });
	}
	if (!patterns.length) patterns.push({ id: newId(), name: 'My pattern', motif: starterMotif() });
	// Until the knitter picks colours here, preview in the sweater's own.
	const color = isPaletteColor(r.color) ? r.color : isPaletteColor(d.color) ? d.color : DEFAULT_COLORS.color;
	const contrast = isPaletteColor(r.contrast) ? r.contrast : isPaletteColor(d.contrast) ? d.contrast : DEFAULT_COLORS.contrast;
	return { patterns, color, contrast };
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

/** What a #motif=… link carries, or undefined if it is not one. Colours outside the palette are left out. */
export function readMotifHash(hash: string): { motif: string; color?: string; contrast?: string } | undefined {
	const q = new URLSearchParams(hash.replace(/^#/, ''));
	const motif = q.get('motif');
	if (!validMotif(motif)) return undefined;
	const color = q.get('color');
	const contrast = q.get('contrast');
	return { motif, ...(isPaletteColor(color) && { color }), ...(isPaletteColor(contrast) && { contrast }) };
}
