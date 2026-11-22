import { CUSTOM, standardBody } from './fit';
import { familyOf, isSleeveless, isTop } from './family';
import type { Design } from './garment';
import { CUSTOM_PATTERN, PATTERNS, starterMotif, validMotif } from './motifs';
import { footFromShoe, SHOE_SIZES } from './shoes';

/** `hint` says what the choice means, behind the field's "?"; `group` heads it in a drop-down list. */
export type Option = { label: string; value: string | number; hint?: string; group?: string };
export type Field = {
	key: keyof Design;
	label: string;
	/** Buttons, colour swatches, or a drop-down list for long lists of options. */
	kind: 'choice' | 'color' | 'select';
	options: Option[];
	show?: (d: Design) => boolean;
};
export type Group = { id: string; label: string; fields: Field[]; show?: (d: Design) => boolean };
export type Section = { id: string; label: string; groups: Group[] };

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ label, value: label }));
const sleeved = (d: Design) => isTop(d) && !isSleeveless(d);
const standard = (d: Design) => d.size !== CUSTOM;
const hat = (d: Design) => familyOf(d) === 'hat';
const sock = (d: Design) => familyOf(d) === 'sock';
const scarf = (d: Design) => familyOf(d) === 'scarf';

export const RIBS = ['1×1', '2×2', '2×1', 'Twisted', 'Stockinette'];
const finishes = opts('Ribbed', 'Folded hem', 'Rolled edge', 'I-cord');
const ribLengths = opts('Short', 'Regular', 'Long');
const brimFinishes = opts('Ribbed', 'Folded', 'Rolled');

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
				fields: [{ key: 'garment', label: 'Type', kind: 'choice', options: opts('Sweater', 'T-shirt', 'Slipover', 'Cardigan', 'Vest', 'Beanie', 'Socks', 'Scarf') }]
			},
			{
				id: 'construction',
				label: 'Construction',
				show: sleeved,
				fields: [{ key: 'construction', label: 'Sleeves', kind: 'choice', options: opts('Raglan', 'Set-in') }]
			},
			{
				id: 'wearer',
				label: 'Made for',
				fields: [{ key: 'wearer', label: 'Made for', kind: 'choice', options: opts('Adult', 'Junior', 'Kid', 'Baby'), show: standard }]
			},
			{
				id: 'beanie',
				label: 'Beanie',
				show: hat,
				fields: [
					{ key: 'hatLength', label: 'Depth', kind: 'choice', options: opts('Snug', 'Slouchy') },
					{ key: 'crown', label: 'Crown', kind: 'choice', options: opts('Spiral', 'Gathered') },
					{ key: 'pomPom', label: 'Top', kind: 'choice', options: opts('None', 'Pom-pom') }
				]
			},
			{
				id: 'socks',
				label: 'Socks',
				show: sock,
				fields: [
					{ key: 'sockLength', label: 'Length', kind: 'choice', options: opts('Ankle', 'Crew', 'Knee') },
					{ key: 'shoeSize', label: 'Shoe size', kind: 'select', options: SHOE_SIZES },
					{
						key: 'heel',
						label: 'Heel',
						kind: 'choice',
						options: [
							{
								label: 'Flap',
								value: 'Flap',
								hint: 'A flap knitted back and forth up the back of the heel, then turned into a cup, with stitches picked up along its sides. Hard-wearing, and roomy over a high instep. The classic heel.'
							},
							{
								label: 'Short row',
								value: 'Short row',
								hint: 'Shaped with German short rows: turning before the end of each row to narrow the heel, then working back out to widen it again. Nothing to pick up. Quicker, with a shallower, rounder cup like a shop-bought sock. Best for lower insteps.'
							}
						]
					},
					{
						key: 'toe',
						label: 'Toe',
						kind: 'choice',
						options: [
							{
								label: 'Grafted',
								value: 'Grafted',
								hint: 'Decreases at both sides make a flat wedge, and the last stitches are grafted together with Kitchener stitch. The join is invisible and smooth against the toes. Grafting takes a little practice.'
							},
							{
								label: 'Round',
								value: 'Round',
								hint: 'Decreases spread evenly round the toe, closer together near the end, then the last few stitches are drawn closed with the yarn. A rounded tip, with no grafting to learn.'
							}
						]
					}
				]
			},
			{
				id: 'scarf',
				label: 'Scarf',
				show: scarf,
				fields: [
					{ key: 'scarfWidth', label: 'Width', kind: 'choice', options: opts('Narrow', 'Regular', 'Wide') },
					{ key: 'scarfLength', label: 'Length', kind: 'choice', options: opts('Short', 'Regular', 'Long') },
					{ key: 'scarfEnds', label: 'Ends', kind: 'choice', options: opts('Plain', 'Ribbed') },
					{ key: 'fringe', label: 'Fringe', kind: 'choice', options: opts('None', 'Short', 'Long') }
				]
			},
			{
				id: 'fit',
				label: 'Size & fit',
				show: isTop,
				fields: [
					{ key: 'size', label: 'Size', kind: 'choice', options: opts('XS', 'S', 'M', 'L', 'XL', CUSTOM) },
					{ key: 'fit', label: 'Fit', kind: 'choice', options: opts('Fitted', 'Relaxed', 'Oversized') },
					{ key: 'bodyLength', label: 'Body length', kind: 'choice', options: opts('Cropped', 'Regular', 'Long'), show: standard }
				]
			},
			{
				id: 'neck',
				label: 'Neckline',
				show: isTop,
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
				show: isTop,
				fields: [
					{ key: 'hemFinish', label: 'Hem finish', kind: 'choice', options: finishes },
					{ key: 'bodyRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS), show: (d) => d.hemFinish === 'Ribbed' },
					{ key: 'bodyRibLength', label: 'Rib length', kind: 'choice', options: ribLengths, show: (d) => d.hemFinish === 'Ribbed' },
					{ key: 'slits', label: 'Side slits', kind: 'choice', options: opts('None', 'Short', 'Long') }
				]
			},
			{
				id: 'brim',
				label: 'Brim',
				show: hat,
				fields: [
					{ key: 'brimFinish', label: 'Brim finish', kind: 'choice', options: brimFinishes },
					{ key: 'brimRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS), show: (d) => d.brimFinish === 'Ribbed' },
					{ key: 'brimLength', label: 'Brim depth', kind: 'choice', options: ribLengths, show: (d) => d.brimFinish === 'Ribbed' }
				]
			},
			{
				id: 'sockDetails',
				label: 'Cuff',
				show: sock,
				fields: [
					{ key: 'sockRib', label: 'Rib structure', kind: 'choice', options: opts(...RIBS) },
					{ key: 'sockCuff', label: 'Cuff depth', kind: 'choice', options: ribLengths }
				]
			},
			{
				id: 'neckband',
				label: 'Neckline',
				show: (d) => isTop(d) && d.neckline !== 'I-cord',
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
					{ key: 'pattern', label: 'Pattern', kind: 'choice', options: opts(...PATTERNS) },
					{
						key: 'stripeWidth',
						label: 'Stripe width',
						kind: 'choice',
						show: (d) => d.pattern === 'Stripes',
						options: [
							{ label: 'Pinstripe', value: 'Pinstripe', hint: 'One row of the pattern colour every 4 rows: fine lines.' },
							{ label: 'Narrow', value: 'Narrow', hint: 'Two rows of each colour: even, closely spaced stripes.' },
							{ label: 'Regular', value: 'Regular', hint: '5 rows of the pattern colour, then 11 of the main colour.' },
							{ label: 'Wide', value: 'Wide', hint: '8 rows of each colour: even, broad stripes.' },
							{ label: 'Bold', value: 'Bold', hint: '16 rows of each colour: big blocks of colour. Bolder still on thick yarn.' }
						]
					},
					{
						key: 'motifScale',
						label: 'Motif size',
						kind: 'choice',
						show: (d) => d.pattern !== 'Solid' && d.pattern !== 'Stripes' && d.pattern !== CUSTOM_PATTERN,
						options: [
							{ label: 'Auto', value: 'Auto', hint: 'Small on bulky, worsted and DK yarn; Large on fingering, where small motifs would come out tiny.' },
							{
								label: 'Small',
								value: 'Small',
								hint: 'Each motif on the standard 12 × 16 chart: small, closely packed repeats with blocky shapes. Bold on thick yarn, tiny on thin yarn.'
							},
							{
								label: 'Large',
								value: 'Large',
								hint: 'Each motif redrawn on a 24 × 32 chart: twice the stitches each way, with rounder curves and thinner lines. Looks best on DK or fingering; very big on bulky yarn.'
							}
						]
					},
					{ key: 'contrast', label: 'Pattern color', kind: 'color', options: colors, show: (d) => d.pattern !== 'Solid' }
				]
			}
		]
	}
];

export const visible = (group: Group, d: Design) => (group.show && !group.show(d) ? [] : group.fields.filter((f) => !f.show || f.show(d)));

export function choose(d: Design, key: keyof Design, value: string | number) {
	(d as Record<string, unknown>)[key] = value;
	// Custom starts from the standard size they were looking at, so the numbers are never blank.
	if (key === 'size' && value === CUSTOM && !d.custom) d.custom = standardBody(d.wearer, d.size === CUSTOM ? 'M' : d.size);
	if (key === 'pattern' && value === 'Custom' && !validMotif(d.motif)) d.motif = starterMotif();
	if (key === 'garment') {
		// Centerpieces are placed on torsos; accessories keep their repeating charts only.
		if (!isTop(d)) d.centerpiece = '';
		if (d.garment === 'T-shirt') d.sleeveLength = 'Short';
		else if (isTop(d) && d.sleeveLength === 'Short' && d.garment !== 'Cardigan') d.sleeveLength = 'Full';
	}
}

export const labelOf = (field: Field, d: Design) => field.options.find((o) => o.value === d[field.key])?.label ?? String(d[field.key]);

/** The bare foot a shoe size fits, as "26.5 cm / 10.4 in", or '' when no size is set. */
export function footLabel(d: Design) {
	const cm = footFromShoe(d.shoeSize);
	return cm === null ? '' : `fits a ${cm} cm / ${Math.round((cm / 2.54) * 10) / 10} in foot`;
}

export const summary = (d: Design) => {
	const family = familyOf(d);
	if (family === 'hat') return `${d.wearer} beanie`;
	if (family === 'sock') return d.shoeSize ? `${d.wearer} socks, shoe size ${d.shoeSize}` : `${d.wearer} socks`;
	if (family === 'scarf') return `${d.wearer} scarf`;
	const size = d.size === CUSTOM && d.custom ? `Custom ${d.custom.chest} cm chest` : `${d.wearer} ${d.size}`;
	return `${size} · ${d.construction === 'Raglan' && !isSleeveless(d) ? `Raglan ${d.garment.toLowerCase()}` : d.garment}`;
};
