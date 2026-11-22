import { colors } from './options';

/** How a catalogue page is ordered: newest first, or by the number of likes. */
export type Sort = 'new' | 'loved';
export const parseSort = (value: unknown): Sort => (value === 'loved' ? 'loved' : 'new');

/** One facet in the catalogue's rail: a question ("Size") with its answers and how many items each would leave. */
export type Facet = { key: string; label: string; value: string; options: { value: string; label: string; count: number; swatch?: string }[] };
/** What a facet is made of: the key a row stores it under, its heading, how to word a value, and the order to list them in. */
export type FacetSpec = { key: string; label: string; words?: Record<string, string>; order?: string[]; swatch?: boolean };

const PALETTE_ORDER = colors.map((c) => String(c.value));
export const isPaletteColour = (value: string) => PALETTE_ORDER.includes(value);
const colourName = (hex: string) => colors.find((c) => c.value === hex)?.label ?? hex;

/** Whether a row survives every chosen value, leaving out one facet (so its own counts show what choosing it would leave). */
const keeps = (row: Record<string, string>, values: Record<string, string>, except?: string) => Object.entries(values).every(([key, value]) => !value || key === except || row[key] === value);

/**
 * The rail for a set of rows (each row holds one value per facet). Counts are what each answer would leave given the
 * other chosen facets, so an answer that would show nothing reads 0. A chosen answer is always listed.
 */
export function buildFacets(rows: Record<string, string>[], specs: FacetSpec[], values: Record<string, string>): Facet[] {
	return specs.map((spec) => {
		const present = [...new Set(rows.map((row) => row[spec.key]).filter(Boolean))];
		if (values[spec.key] && !present.includes(values[spec.key])) present.push(values[spec.key]);
		const rank = (value: string) => {
			const order = spec.swatch ? PALETTE_ORDER : spec.order;
			const at = order?.indexOf(value) ?? -1;
			return at < 0 ? Infinity : at;
		};
		const options = present
			.map((value) => ({
				value,
				label: spec.swatch ? colourName(value) : (spec.words?.[value] ?? value),
				count: rows.filter((row) => row[spec.key] === value && keeps(row, values, spec.key)).length,
				swatch: spec.swatch ? value : undefined
			}))
			.sort((a, b) => rank(a.value) - rank(b.value) || b.count - a.count || a.label.localeCompare(b.label));
		return { key: spec.key, label: spec.label, value: values[spec.key] ?? '', options };
	});
}

/** "3d ago", "2w ago", "5mo ago": how long since something was shared. */
export function ago(from: string | Date, now = Date.now()) {
	const days = Math.max(0, Math.floor((now - new Date(from).getTime()) / 86_400_000));
	return days < 1 ? 'today' : days < 7 ? `${days}d ago` : days < 60 ? `${Math.round(days / 7)}w ago` : `${Math.round(days / 30)}mo ago`;
}
