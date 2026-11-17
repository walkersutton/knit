import { CUSTOM, clamp, round } from './fit';
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

/** A random garment: its shape, size, finishes and yarn. Always a design the pattern can be written for. */
export function randomDesign(rnd: () => number = Math.random): Design {
	const pick = <T>(options: T[]): T => options[Math.floor(rnd() * options.length)];
	const weighted = <T>(options: Weighted<T>): T => {
		let r = rnd() * options.reduce((sum, [, w]) => sum + w, 0);
		for (const [value, w] of options) if ((r -= w) < 0) return value;
		return options[0][0];
	};

	const garment = weighted<string>([['Sweater', 45], ['Cardigan', 20], ['T-shirt', 20], ['Slipover', 15]]);
	const sleeved = garment !== 'Slipover';

	// Size: usually a standard one for an adult, junior, kid or baby; sometimes a body of its own.
	const custom = rnd() < 0.25;
	const wearer = custom ? 'Adult' : weighted<string>([['Adult', 60], ['Junior', 15], ['Kid', 15], ['Baby', 10]]);
	const chest = round(56 + rnd() * 74);
	const body = custom
		? { chest: clamp('chest', chest), length: clamp('length', round(chest * (0.5 + rnd() * 0.18))), arm: clamp('arm', round(chest * (0.4 + rnd() * 0.1))) }
		: null;

	const color = pick(colors);
	const contrast = pick(colors.filter((c) => c !== color));
	const hemFinish = weighted<string>([['Ribbed', 60], ['Folded hem', 15], ['Rolled edge', 15], ['I-cord', 10]]);
	const cuffFinish = rnd() < 0.7 ? hemFinish : weighted<string>([['Ribbed', 60], ['Folded hem', 15], ['Rolled edge', 15], ['I-cord', 10]]);
	const rib = () => weighted<string>([['1×1', 40], ['2×2', 30], ['2×1', 10], ['Twisted', 10], ['Stockinette', 10]]);
	const length = () => pick(['Short', 'Regular', 'Regular', 'Long']);

	return {
		wearer,
		garment,
		construction: pick(['Raglan', 'Set-in']),
		size: custom ? CUSTOM : pick(['XS', 'S', 'M', 'L', 'XL']),
		custom: body,
		fit: weighted<string>([['Fitted', 25], ['Relaxed', 45], ['Oversized', 30]]),
		bodyLength: weighted<string>([['Cropped', 25], ['Regular', 55], ['Long', 20]]),
		sleeveLength: garment === 'T-shirt' ? 'Short' : sleeved ? weighted<string>([['Full', 70], ['3/4', 30]]) : 'Full',
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
		pattern: weighted<string>([['Solid', 30], ['Stripes', 30], ['Fair isle', 40]]),
		color: color.value as string,
		contrast: contrast.value as string,
		gauge: pick(yarnWeights).gauge,
		needle: 0,
		ribNeedle: 0
	};
}

const colorName = (hex: string) => colors.find((c) => c.value === hex)?.label ?? 'Wool';

/** "Sage Striped Turtleneck Cardigan" */
export function designName(d: Design): string {
	const pattern = d.pattern === 'Stripes' ? 'Striped' : d.pattern === 'Fair isle' ? 'Fair isle' : '';
	const neck = ['Crew', 'I-cord'].includes(d.neckline) ? '' : d.neckline;
	return [colorName(d.color), pattern, neck, d.garment].filter(Boolean).join(' ');
}

/** "Adult M · Raglan sweater · Worsted" */
export function designDetail(d: Design): string {
	const weight = yarnWeights.find((w) => w.gauge === d.gauge)?.label;
	return [summary(d), weight].filter(Boolean).join(' · ');
}
