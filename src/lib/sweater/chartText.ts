/**
 * A custom chart as plain text, to keep in a note or send to a friend, who pastes it back in:
 *
 *   Knit It pattern: Hearts
 *   Main colour: Denim (#465e9d)
 *   Pattern colour: Cream (#faf3dc)
 *   # = pattern colour, . = main colour
 *   ............
 *   ..##....##..
 *   …16 rows of 12 stitches, top row first
 *
 * Reading it back is forgiving, because people retype charts by hand and chat apps mangle spacing:
 * any of `# X x 1 ■ █ ●` is a pattern stitch, any of `. - _ 0 □ ○ ·` is a main-colour stitch, spaces
 * inside a row are ignored, and every line that is not a chart row or a header line is skipped.
 * A colour can be given by name or by hex, and only the palette's colours are accepted.
 */
import { TILE_ROWS, TILE_ST, validMotif } from './motifs';
import { colors } from './options';

const ON = '#Xx1■█●';
const OFF = '.-_0□○·';
const ROW = new RegExp(`^[${escape(ON + OFF)}\\s]+$`);

function escape(s: string) {
	return s.replace(/[-\\^\]]/g, '\\$&');
}

const colorName = (hex: string) => colors.find((c) => c.value === hex)?.label ?? hex;

/** Finds a palette colour in "Denim", "#465e9d" or "Denim (#465e9d)". */
function paletteColor(text: string): string | undefined {
	const hex = text.match(/#[0-9a-f]{6}\b/i)?.[0].toLowerCase();
	if (hex) return colors.some((c) => c.value === hex) ? hex : undefined;
	const word = text.trim().toLowerCase();
	return colors.find((c) => c.label.toLowerCase() === word)?.value as string | undefined;
}

export function chartToText(name: string, motif: string, color: string, contrast: string) {
	const rows: string[] = [];
	for (let j = 0; j < TILE_ROWS; j++) rows.push([...motif.slice(j * TILE_ST, (j + 1) * TILE_ST)].map((c) => (c === '1' ? '#' : '.')).join(''));
	return [
		`Knit It pattern: ${name}`,
		`Main colour: ${colorName(color)} (${color})`,
		`Pattern colour: ${colorName(contrast)} (${contrast})`,
		'# = pattern colour, . = main colour',
		...rows
	].join('\n');
}

export type ParsedChart = { motif: string; name?: string; color?: string; contrast?: string };

/** Reads a chart back from text. Fails with a sentence that says what is wrong with it. */
export function parseChartText(text: string): { ok: true; chart: ParsedChart } | { ok: false; error: string } {
	const trimmed = text.trim();
	if (!trimmed) return { ok: false, error: 'Paste a chart first.' };
	// The compact form: the 192 noughts and ones on their own.
	const bare = trimmed.replace(/\s+/g, '');
	if (validMotif(bare)) return { ok: true, chart: { motif: bare } };

	const chart: Partial<ParsedChart> = {};
	const rows: string[] = [];
	for (const raw of trimmed.split(/\r?\n/)) {
		const line = raw.trim();
		const header = line.match(/^(?:knit it )?pattern(?: name)?:\s*(.+)$/i);
		const main = line.match(/^main colou?r:\s*(.+)$/i);
		const contrast = line.match(/^(?:pattern|contrast) colou?r:\s*(.+)$/i);
		if (main) chart.color = paletteColor(main[1]);
		else if (contrast) chart.contrast = paletteColor(contrast[1]);
		else if (header) chart.name = header[1].trim().slice(0, 40) || undefined;
		else if (/^[-_]+$/.test(line) && line.length !== TILE_ST) continue; // a divider, not a row
		else if (line && ROW.test(line)) rows.push([...line.replace(/\s+/g, '')].map((c) => (ON.includes(c) ? '1' : '0')).join(''));
	}
	if (!rows.length) return { ok: false, error: `No chart found. Each row should be ${TILE_ST} stitches of # and . characters.` };
	const wrong = rows.findIndex((r) => r.length !== TILE_ST);
	if (wrong >= 0) return { ok: false, error: `Row ${wrong + 1} has ${rows[wrong].length} stitches. Every row needs ${TILE_ST}.` };
	if (rows.length !== TILE_ROWS) return { ok: false, error: `Found ${rows.length} rows. A chart needs ${TILE_ROWS} rows.` };
	if (!chart.color) delete chart.color;
	if (!chart.contrast) delete chart.contrast;
	return { ok: true, chart: { ...chart, motif: rows.join('') } };
}
