import type { Design } from './garment';
import { yarnWeights } from './options';

/** Needle sizes a knitter can say they own: metric diameter and the US size. */
export const NEEDLES: { mm: number; us: string }[] = [
	{ mm: 2, us: '0' },
	{ mm: 2.25, us: '1' },
	{ mm: 2.5, us: '1½' },
	{ mm: 2.75, us: '2' },
	{ mm: 3, us: '2½' },
	{ mm: 3.25, us: '3' },
	{ mm: 3.5, us: '4' },
	{ mm: 3.75, us: '5' },
	{ mm: 4, us: '6' },
	{ mm: 4.5, us: '7' },
	{ mm: 5, us: '8' },
	{ mm: 5.5, us: '9' },
	{ mm: 6, us: '10' },
	{ mm: 6.5, us: '10½' },
	{ mm: 7, us: '10¾' }
];

/** "US 8 (5 mm)" */
export function needleLabel(mm: number) {
	const us = NEEDLES.find((n) => n.mm === mm)?.us;
	return us ? `US ${us} (${mm} mm)` : `${mm} mm`;
}

type Needled = Pick<Design, 'gauge' | 'needle' | 'ribNeedle'>;

export const weightOf = (gauge: number) => yarnWeights.find((w) => w.gauge === gauge) ?? yarnWeights[2];

/** A main needle may be this much thinner or thicker than the standard one before the fabric turns stiff or sloppy. */
const MAIN_RANGE = 0.16;
/** The ribbing needle is thinner than the main one, but no thinner than this fraction of it. */
const RIB_MIN = 0.7;

/** The size in ascending `sizes` closest to `target` (the thinner of two equally close), or 0 if there are none. */
const nearest = (target: number, sizes: number[]) => sizes.reduce((best, mm) => (!best || Math.abs(mm - target) < Math.abs(best - target) ? mm : best), 0);

/** Main needle sizes a yarn weight can be knitted on. */
export function mainSizes(weight: number) {
	const std = weightOf(weight).needle;
	return NEEDLES.map((n) => n.mm).filter((mm) => Math.abs(mm / std - 1) <= MAIN_RANGE);
}

/** The usual ribbing needle to go with a main needle: about two sizes down. */
function ribFor(weight: number, main: number) {
	const yarn = weightOf(weight);
	if (main === yarn.needle) return yarn.rib;
	return nearest(
		(main * yarn.rib) / yarn.needle,
		NEEDLES.map((n) => n.mm).filter((mm) => mm < main)
	);
}

/** The needles a design is knitted on, in mm, with the standard ones filled in. */
export function needlesOf(d: Needled) {
	const main = d.needle || weightOf(d.gauge).needle;
	return { main, rib: d.ribNeedle || ribFor(d.gauge, main) };
}

/**
 * Stitches per 4 in on the design's main needle. The same yarn on a thinner needle makes smaller
 * stitches, roughly in proportion to the needle's diameter.
 */
export function stitchGauge(d: Pick<Design, 'gauge' | 'needle'>) {
	const std = weightOf(d.gauge).needle;
	return d.needle && d.needle !== std ? Math.round((d.gauge * std) / d.needle) : d.gauge;
}

/**
 * Chooses the needles for a yarn weight from the sizes a knitter owns: the main needle closest to
 * the standard one, and the ribbing needle closest to two sizes below it. A needle they do not own
 * in a workable size is left at 0, the standard.
 */
export function pickNeedles(weight: number, owned: number[]): Pick<Design, 'needle' | 'ribNeedle'> {
	const std = weightOf(weight).needle;
	const main =
		nearest(
			std,
			mainSizes(weight).filter((mm) => owned.includes(mm))
		) || std;
	const rib = ribFor(weight, main);
	const mine = nearest(
		rib,
		[...owned].sort((x, y) => x - y).filter((mm) => mm < main && mm / main >= RIB_MIN)
	);
	return { needle: main === std ? 0 : main, ribNeedle: mine && mine !== rib ? mine : 0 };
}

/** Owned sizes from saved data: only sizes on the list, in order, each once. */
export const cleanNeedles = (value: unknown) => (Array.isArray(value) ? NEEDLES.map((n) => n.mm).filter((mm) => value.includes(mm)) : []);
