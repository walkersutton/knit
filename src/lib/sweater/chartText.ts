/**
 * A custom chart as plain text, to keep in a note or send to a friend, who pastes it back in:
 *
 *   Knit It pattern: Hearts
 *   Main colour: Denim (#465e9d)
 *   Pattern colour: Cream (#faf3dc)
 *   # = pattern colour, . = main colour
 *   ............
 *   ..##....##..
 *   …16 rows of 12 stitches, top row first (a fine chart is 32 rows of 24)
 *
 * Reading it back is forgiving, because people retype charts by hand and chat apps mangle spacing:
 * any of `# X x 1 ■ █ ●` is a pattern stitch, any of `. - _ 0 □ ○ ·` is a main-colour stitch, spaces
 * inside a row are ignored, and every line that is not a chart row or a header line is skipped.
 * A colour can be given by name or by hex, and only the palette's colours are accepted.
 */
import { tileOfMotif, validMotif, FINE_TILE, STANDARD_TILE } from './motifs';
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
	const { st, rows: n } = tileOfMotif(motif);
	for (let j = 0; j < n; j++) rows.push([...motif.slice(j * st, (j + 1) * st)].map((c) => (c === '1' ? '#' : '.')).join(''));
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
	// The compact form: the 192 (or 576) noughts and ones on their own.
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
		else if (/^[-_]+$/.test(line) && line.length !== STANDARD_TILE.st && line.length !== FINE_TILE.st) continue; // a divider, not a row
		else if (line && ROW.test(line)) rows.push([...line.replace(/\s+/g, '')].map((c) => (ON.includes(c) ? '1' : '0')).join(''));
	}
	if (!rows.length) return { ok: false, error: `No chart found. Each row should be ${STANDARD_TILE.st} stitches (or ${FINE_TILE.st} for a fine chart) of # and . characters.` };
	// The first row says which size this chart is; every other row has to agree.
	const size = rows[0].length === FINE_TILE.st ? FINE_TILE : STANDARD_TILE;
	const wrong = rows.findIndex((r) => r.length !== size.st);
	if (wrong >= 0) return { ok: false, error: `Row ${wrong + 1} has ${rows[wrong].length} stitches. Every row needs ${size.st}.` };
	if (rows.length !== size.rows) return { ok: false, error: `Found ${rows.length} rows. A chart needs ${size.rows} rows.` };
	if (!chart.color) delete chart.color;
	if (!chart.contrast) delete chart.contrast;
	return { ok: true, chart: { ...chart, motif: rows.join('') } };
}
