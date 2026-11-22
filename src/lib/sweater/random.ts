import { DEFAULT_DESIGN } from './defaults';
import type { Design } from './garment';
import { colors, summary, yarnWeights } from './options';

/** A small seedable generator, so a given seed always gives the same sweater. */
export function seeded(seed: number): () => number {
	let a = Math.imul(seed, 2654435761) ^ 0x9e3779b9;
	const next = () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	for (let i = 0; i < 4; i++) next(); // nearby seeds start out correlated
	return next;
}

type Weighted<T> = [T, number][];

/** A random garment: its shape, finishes and yarn. Always a design the pattern can be written for. */
export function randomDesign(rnd: () => number = Math.random): Design {
	const pick = <T>(options: T[]): T => options[Math.floor(rnd() * options.length)];
	const weighted = <T>(options: Weighted<T>): T => {
		let r = rnd() * options.reduce((sum, [, w]) => sum + w, 0);
		for (const [value, w] of options) if ((r -= w) < 0) return value;
		return options[0][0];
	};

	const garment = weighted<string>([['Sweater', 30], ['Cardigan', 14], ['T-shirt', 14], ['Slipover', 10], ['Beanie', 12], ['Socks', 10], ['Scarf', 10]]);
	const sleeved = !['Slipover', 'Beanie', 'Socks', 'Scarf'].includes(garment);

	// Size is always a medium adult: rolling changes the design, not how big it is.

	const color = pick(colors);
	const contrast = pick(colors.filter((c) => c !== color));
	const hemFinish = weighted<string>([['Ribbed', 60], ['Folded hem', 15], ['Rolled edge', 15], ['I-cord', 10]]);
	const cuffFinish = rnd() < 0.7 ? hemFinish : weighted<string>([['Ribbed', 60], ['Folded hem', 15], ['Rolled edge', 15], ['I-cord', 10]]);
	const rib = () => weighted<string>([['1×1', 40], ['2×2', 30], ['2×1', 10], ['Twisted', 10], ['Stockinette', 10]]);
	const length = () => pick(['Short', 'Regular', 'Regular', 'Long']);

	const pattern = weighted<string>([['Solid', 25], ['Stripes', 20], ['Fair isle', 20], ...['Checks', 'Dots', 'Diamonds', 'Chevron', 'Hearts', 'Snowflakes'].map((p): [string, number] => [p, 5])]);

	return {
		...DEFAULT_DESIGN,
		wearer: 'Adult',
		garment,
		construction: pick(['Raglan', 'Set-in']),
		size: 'M',
		custom: null,
		fit: weighted<string>([['Fitted', 25], ['Relaxed', 45], ['Oversized', 30]]),
		bodyLength: weighted<string>([['Cropped', 25], ['Regular', 55], ['Long', 20]]),
		sleeveLength: garment === 'T-shirt' ? 'Short' : garment === 'Cardigan' ? weighted<string>([['Full', 60], ['3/4', 25], ['Short', 15]]) : sleeved ? weighted<string>([['Full', 70], ['3/4', 30]]) : 'Full',
		neckline: pick(['Crew', 'V-neck', 'Boat', 'I-cord', 'Mock neck', 'Turtleneck']),
		sleeveShape: weighted<string>([['Straight', 55], ['Balloon', 25], ['Puff', 20]]),
		hemFinish,
		bodyRib: rib(),
		bodyRibLength: length(),
		slits: weighted<string>([['None', 60], ['Short', 25], ['Long', 15]]),
		neckRib: rib(),
		neckDepth: pick(['Narrow', 'Regular', 'Wide']),
		cuffFinish,
		sleeveRib: rib(),
		cuffLength: length(),
		pattern,
		motif: '',
		centerpiece: '',
		centerpieceY: 0.25,
		centerpieceAt: 'Centre',
		color: color.value as string,
		contrast: contrast.value as string,
		gauge: pick(yarnWeights).gauge,
		needle: 0,
		ribNeedle: 0,
		hatLength: pick(['Snug', 'Slouchy']),
		crown: pick(['Spiral', 'Gathered']),
		pomPom: weighted<string>([['None', 70], ['Pom-pom', 30]]),
		brimFinish: pick(['Ribbed', 'Folded', 'Rolled']),
		brimRib: rib(),
		brimLength: length(),
		sockLength: pick(['Ankle', 'Crew', 'Knee']),
		shoeSize: '',
		heel: pick(['Flap', 'Short row']),
		toe: pick(['Grafted', 'Round']),
		sockRib: rib(),
		sockCuff: length(),
		scarfWidth: pick(['Narrow', 'Regular', 'Wide']),
		scarfLength: pick(['Short', 'Regular', 'Long']),
		scarfEnds: pick(['Plain', 'Ribbed']),
		fringe: pick(['None', 'Short', 'Long'])
	};
}

const colorName = (hex: string) => colors.find((c) => c.value === hex)?.label ?? 'Wool';

/** "Sage Striped Turtleneck Cardigan" */
export function designName(d: Design): string {
	const pattern = d.pattern === 'Stripes' ? 'Striped' : d.pattern === 'Solid' ? '' : d.pattern === 'Custom' ? 'Patterned' : d.pattern;
	const neck = ['Crew', 'I-cord', 'Beanie', 'Socks', 'Scarf'].includes(d.neckline) || ['Beanie', 'Socks', 'Scarf'].includes(d.garment) ? '' : d.neckline;
	return [colorName(d.color), pattern, neck, d.garment].filter(Boolean).join(' ');
}

/** "Adult M · Raglan sweater · Worsted" */
export function designDetail(d: Design): string {
	const weight = yarnWeights.find((w) => w.gauge === d.gauge)?.label;
	return [summary(d), weight].filter(Boolean).join(' · ');
}
