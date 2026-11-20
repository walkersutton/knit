import type { Design } from './garment';
import { PATTERNS } from './motifs';
import { LIMITS } from './fit';
import { mainSizes, pickNeedles } from './needles';
import { yarnWeights } from './options';

/** Test fixtures: the default design, every single-option variation of it, and a seeded random spread. */
export const baseDesign: Design = {
	wearer: 'Adult', garment: 'Sweater', construction: 'Raglan', size: 'M', custom: null, fit: 'Relaxed', bodyLength: 'Regular',
	sleeveLength: 'Full', neckline: 'Crew', sleeveShape: 'Straight', hemFinish: 'Ribbed', bodyRib: '1×1',
	bodyRibLength: 'Regular', slits: 'None', neckRib: '1×1', neckDepth: 'Regular', cuffFinish: 'Ribbed',
	sleeveRib: '1×1', cuffLength: 'Regular', pattern: 'Solid', motif: '', motifScale: 'Auto', stripeWidth: 'Regular', centerpiece: '', centerpieceY: 0.25, centerpieceAt: 'Centre', color: '#465e9d', contrast: '#faf3dc', gauge: 18,
	needle: 0, ribNeedle: 0,
	hatLength: 'Slouchy', crown: 'Spiral', pomPom: 'None', brimFinish: 'Ribbed', brimRib: '1×1', brimLength: 'Regular',
	sockLength: 'Crew', shoeSize: '', heel: 'Flap', toe: 'Grafted', sockRib: '1×1', sockCuff: 'Regular',
	scarfWidth: 'Regular', scarfLength: 'Regular', scarfEnds: 'Plain', fringe: 'None'
};

const RIBS = ['1×1', '2×2', '2×1', 'Twisted', 'Stockinette'];
const FINISHES = ['Ribbed', 'Folded hem', 'Rolled edge', 'I-cord'];
const LENGTHS = ['Short', 'Regular', 'Long'];

export const choices: Partial<Record<keyof Design, (string | number)[]>> = {
	wearer: ['Adult', 'Junior', 'Kid', 'Baby'],
	garment: ['Sweater', 'T-shirt', 'Slipover', 'Cardigan', 'Beanie', 'Socks', 'Scarf'],
	construction: ['Raglan', 'Set-in'],
	size: ['XS', 'S', 'M', 'L', 'XL'],
	fit: ['Fitted', 'Relaxed', 'Oversized'],
	bodyLength: ['Cropped', 'Regular', 'Long'],
	sleeveLength: ['Short', '3/4', 'Full'],
	neckline: ['Crew', 'V-neck', 'Boat', 'I-cord', 'Mock neck', 'Turtleneck'],
	sleeveShape: ['Straight', 'Balloon', 'Puff'],
	hemFinish: FINISHES,
	bodyRib: RIBS,
	bodyRibLength: LENGTHS,
	slits: ['None', 'Short', 'Long'],
	neckRib: RIBS,
	neckDepth: ['Narrow', 'Regular', 'Wide'],
	cuffFinish: FINISHES,
	sleeveRib: RIBS,
	cuffLength: LENGTHS,
	hatLength: ['Snug', 'Slouchy'],
	crown: ['Spiral', 'Gathered'],
	pomPom: ['None', 'Pom-pom'],
	brimFinish: ['Ribbed', 'Folded', 'Rolled'],
	brimRib: RIBS,
	brimLength: LENGTHS,
	sockLength: ['Ankle', 'Crew', 'Knee'],
	heel: ['Flap', 'Short row'],
	toe: ['Grafted', 'Round'],
	sockRib: RIBS,
	sockCuff: LENGTHS,
	scarfWidth: ['Narrow', 'Regular', 'Wide'],
	scarfLength: ['Short', 'Regular', 'Long'],
	scarfEnds: ['Plain', 'Ribbed'],
	fringe: ['None', 'Short', 'Long'],
	pattern: PATTERNS.filter((p) => p !== 'Custom'),
	gauge: [28, 22, 18, 13],
	motifScale: ['Auto', 'Small', 'Large'],
	stripeWidth: ['Pinstripe', 'Narrow', 'Regular', 'Wide', 'Bold']
};

export function singleVariations(): Design[] {
	const out: Design[] = [baseDesign];
	for (const [key, values] of Object.entries(choices)) for (const v of values) if (v !== baseDesign[key as keyof Design]) out.push({ ...baseDesign, [key]: v });
	return out;
}

/** Every yarn weight on every main needle it can be knitted on, as a knitter who owns only that size would get it. */
export function needleVariations(): Design[] {
	return yarnWeights.flatMap((w) => mainSizes(w.gauge).map((mm) => ({ ...baseDesign, gauge: w.gauge, ...pickNeedles(w.gauge, [mm]) })));
}

/** Custom fits: every garment shape worn by bodies from a baby to a very large adult, at the extremes and in between. */
export function customVariations(): Design[] {
	const bodies = [
		{ chest: LIMITS.chest.min, length: LIMITS.length.min, arm: LIMITS.arm.min },
		{ chest: 56, length: 36, arm: 26 },
		{ chest: 96, length: 56, arm: 44 },
		{ chest: 117, length: 70, arm: 49 },
		{ chest: LIMITS.chest.max, length: LIMITS.length.max, arm: LIMITS.arm.max }
	];
	return bodies.flatMap((custom) =>
		['Fitted', 'Relaxed', 'Oversized'].flatMap((fit) =>
			['Short', '3/4', 'Full'].flatMap((sleeveLength) => [18, 28, 13].map((gauge) => ({ ...baseDesign, size: 'Custom', custom, fit, sleeveLength, gauge })))
		)
	);
}

export function randomDesigns(n: number, seed = 1): Design[] {
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	return Array.from({ length: n }, () => {
		const d = { ...baseDesign } as Record<string, unknown>;
		for (const [key, values] of Object.entries(choices)) d[key] = values[Math.floor(rnd() * values.length)];
		return d as Design;
	});
}
