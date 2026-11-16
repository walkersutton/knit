import type { Design } from './garment';

export type Option = { label: string; value: string | number };
export type Field = {
	key: keyof Design;
	label: string;
	kind: 'choice' | 'color';
	options: Option[];
	show?: (d: Design) => boolean;
};
export type Group = { id: string; label: string; fields: Field[]; show?: (d: Design) => boolean };
export type Section = { id: string; label: string; groups: Group[] };

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ label, value: label }));
const sleeved = (d: Design) => d.garment !== 'Slipover';

export const RIBS = ['1×1', '2×2', '2×1', 'Twisted', 'Stockinette'];
const finishes = opts('Ribbed', 'Folded hem', 'Rolled edge', 'I-cord');
const ribLengths = opts('Short', 'Regular', 'Long');

export const colors: Option[] = [
	{ label: 'Brick', value: '#c8543e' },
	{ label: 'Clay', value: '#d99172' },
	{ label: 'Mustard', value: '#e8bd53' },
	{ label: 'Cream', value: '#faf3dc' },
	{ label: 'Oatmeal', value: '#d8c9b0' },
	{ label: 'Sage', value: '#78917a' },
	{ label: 'Forest', value: '#2f5a48' },
	{ label: 'Sky', value: '#9dbfe0' },
	{ label: 'Denim', value: '#465e9d' },
	{ label: 'Plum', value: '#665181' },
	{ label: 'Rose', value: '#b45c89' },
	{ label: 'Charcoal', value: '#302c32' }
];

/**
 * Yarn weight sets the standard gauge (stitches per 4 in), the needles that give it (mm: `needle`
 * for the fabric, `rib` for ribbing and bands) and the skein size.
 */
export const yarnWeights = [
	{ label: 'Fingering', gauge: 28, needle: 3.25, rib: 2.5, yardage: 400 },
	{ label: 'DK', gauge: 22, needle: 4, rib: 3.5, yardage: 220 },
	{ label: 'Worsted', gauge: 18, needle: 5, rib: 4, yardage: 200 },
	{ label: 'Bulky', gauge: 13, needle: 6.5, rib: 5.5, yardage: 120 }
];

export const sections: Section[] = [
	{
		id: 'design',
		label: 'Design',
		groups: [
			{
				id: 'garment',
				label: 'Garment',
				fields: [
					{ key: 'garment', label: 'Type', kind: 'choice', options: opts('Sweater', 'T-shirt', 'Slipover', 'Cardigan') },
					{ key: 'construction', label: 'Construction', kind: 'choice', options: opts('Raglan', 'Set-in'), show: sleeved },
					{ key: 'wearer', label: 'Made for', kind: 'choice', options: opts('Adult', 'Junior', 'Kid', 'Baby') }
				]
			},
			{
				id: 'fit',
				label: 'Size & fit',
				fields: [
					{ key: 'size', label: 'Size', kind: 'choice', options: opts('XS', 'S', 'M', 'L', 'XL') },
					{ key: 'fit', label: 'Fit', kind: 'choice', options: opts('Fitted', 'Relaxed', 'Oversized') },
					{ key: 'bodyLength', label: 'Body length', kind: 'choice', options: opts('Cropped', 'Regular', 'Long') }
				]
			},
			{
				id: 'neck',
				label: 'Neckline',
				fields: [{ key: 'neckline', label: 'Shape', kind: 'choice', options: opts('Crew', 'V-neck', 'Boat', 'I-cord', 'Mock neck', 'Turtleneck') }]
			},
			{
				id: 'sleeves',
				label: 'Sleeves',
				show: sleeved,
				fields: [
					{ key: 'sleeveLength', label: 'Length', kind: 'choice', options: opts('Short', '3/4', 'Full') },
					{ key: 'sleeveShape', label: 'Shape', kind: 'choice', options: opts('Straight', 'Balloon', 'Puff') }
				]
			}
		]
	},
	{
		id: 'details',
		label: 'Details',
		groups: [
			{
				id: 'body',
				label: 'Body',
				fields: [
					{ key: 'hemFinish', label: 'Hem finish', kind: 'choice', options: finishes },
					{ key: 'bodyRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS), show: (d) => d.hemFinish === 'Ribbed' },
					{ key: 'bodyRibLength', label: 'Rib length', kind: 'choice', options: ribLengths, show: (d) => d.hemFinish === 'Ribbed' },
					{ key: 'slits', label: 'Side slits', kind: 'choice', options: opts('None', 'Short', 'Long') }
				]
			},
			{
				id: 'neckband',
				label: 'Neckline',
				show: (d) => d.neckline !== 'I-cord',
				fields: [
					{ key: 'neckRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS) },
					{
						key: 'neckDepth',
						label: 'Band depth',
						kind: 'choice',
						options: opts('Narrow', 'Regular', 'Wide'),
						show: (d) => d.neckline === 'Crew' || d.neckline === 'V-neck' || d.neckline === 'Boat'
					}
				]
			},
			{
				id: 'cuffs',
				label: 'Sleeves',
				show: sleeved,
				fields: [
					{ key: 'cuffFinish', label: 'Cuff finish', kind: 'choice', options: finishes },
					{ key: 'sleeveRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS), show: (d) => d.cuffFinish === 'Ribbed' },
					{ key: 'cuffLength', label: 'Rib length', kind: 'choice', options: ribLengths, show: (d) => d.cuffFinish === 'Ribbed' }
				]
			}
		]
	},
	{
		id: 'yarn',
		label: 'Yarn',
		groups: [
			{
				id: 'yarn',
				label: 'Yarn & color',
				fields: [
					{
						key: 'gauge',
						label: 'Yarn weight',
						kind: 'choice',
						options: yarnWeights.map(({ label, gauge }) => ({ label, value: gauge }))
					},
					{ key: 'color', label: 'Color', kind: 'color', options: colors },
					{ key: 'pattern', label: 'Pattern', kind: 'choice', options: opts('Solid', 'Stripes', 'Fair isle') },
					{ key: 'contrast', label: 'Pattern color', kind: 'color', options: colors, show: (d) => d.pattern !== 'Solid' }
				]
			}
		]
	}
];

export const visible = (group: Group, d: Design) => (group.show && !group.show(d) ? [] : group.fields.filter((f) => !f.show || f.show(d)));

export function choose(d: Design, key: keyof Design, value: string | number) {
	(d as Record<string, unknown>)[key] = value;
	if (key === 'garment' && value === 'T-shirt') d.sleeveLength = 'Short';
	if (key === 'garment' && value !== 'T-shirt' && d.sleeveLength === 'Short') d.sleeveLength = 'Full';
}

export const labelOf = (field: Field, d: Design) => field.options.find((o) => o.value === d[field.key])?.label ?? String(d[field.key]);

export const summary = (d: Design) => `${d.wearer} ${d.size} · ${d.construction === 'Raglan' && d.garment !== 'Slipover' ? `Raglan ${d.garment.toLowerCase()}` : d.garment}`;
