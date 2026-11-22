import { measure, type Design } from './garment';
import { familyOf, opensFront, type GarmentFamily } from './family';
import { needleLabel, needlesOf, weightOf } from './needles';
import { contrastShare, longestFloat, stripeOf, tileFor, tileOf } from './motifs';
import { bodyBoxOf, centerpieceOf, countOn, dropRows, longestStrand, offsetSts, rowsOf, type BodyBox, type Centerpiece } from './centerpiece';

/**
 * What the raglan and set-in pattern writers share: the shape of a pattern, small knitting helpers,
 * the yarn estimate, and the parts of a sweater that are worked the same either way (body, sleeve
 * taper, cuffs, bands, finishing).
 *
 * Every measurement comes from `measure()`, so a pattern describes the garment the 3D view shows.
 *
 * Step text marks stitch counts as **n**; the UI renders those in bold.
 */

/** Rounds (or rows) to tick off one at a time: what each one is, and the number of the first. */
export type Tally = { unit: 'Round' | 'Row'; first: number; rows: string[] };
export type Step = {
	text: string;
	/** Stitches on the needles once the step is done. */
	count?: string;
	/** A definition or heading to read, not a step to tick off. */
	note?: boolean;
	/** Extra help for the beginner view. */
	tip?: string;
	tally?: Tally;
	/** Length of fabric this step knits, in cm down the piece its section makes. The 3D view uses it to show the work so far. */
	adds?: number;
};
export type PatternSection = {
	id: string;
	title: string;
	/** What this part of the garment is, for the beginner view. */
	intro: string;
	steps: Step[];
	/** Set when the section is worked twice: names for the two passes. */
	twice?: [string, string];
	/** Which 3D piece this section knits; for a section worked twice, each pass gets a `1`/`2` suffix. */
	piece?: string;
};
export type Counts = {
	castOn: number;
	back0: number;
	front0: number;
	sleeve0: number;
	underarm: number;
	back: number;
	front: number;
	sleeve: number;
	bodySts: number;
	upperSts: number;
	sleeveEndSts: number;
	cuffSts: number;
	hemSts: number;
	neckbandSts: number;
	band: number;
	neckPerSide: number;
	shortRowPairs: number;
	yokeRows: number;
	yokeRowsPlanned: number;
	incRows: number;
	incSlots: number;
};
/** The numbers a set-in pattern is built from, for tests and for the numbers in the text. */
export type SetInCounts = {
	/** Back at the shoulders (strap, back neck, strap) and where it ends, at the underarm. */
	castOn: number;
	back: number;
	/** Both fronts together at the underarm (the back, less the band overlap on a cardigan). */
	front: number;
	backNeck: number;
	strap: number;
	/** Increases at each armhole edge. */
	armholeIncs: number;
	shoulderPairs: number;
	underarm: number;
	bodySts: number;
	upperSts: number;
	sleeveEndSts: number;
	cuffSts: number;
	hemSts: number;
	neckbandSts: number;
	band: number;
	neckPerSide: number;
	capPairs: number;
	backRows: number;
	frontRows: number;
};
type Done = {
	ok: true;
	title: string;
	level: string;
	materials: [string, string][];
	gauge: string;
	measurements: [string, string][];
	abbreviations: [string, string][];
	sections: PatternSection[];
	/** Colourwork chart, rows top to bottom in knitting order; true = contrast colour. */
	chart: boolean[][] | null;
	/** Name of the charted pattern, e.g. "Fair Isle". */
	chartName: string;
	/** The centerpiece, worked once on the front of the body (same layout as `chart`); null for none. */
	centerpiece: boolean[][] | null;
	/** A slipover: no sleeves, so armhole edgings in their place. */
	sleeveless: boolean;
	/** The shape family, so the page can describe hats and socks without calling them tops. */
	family: GarmentFamily;
	/** Front stitches on the rows above the underarm a centerpiece can rise into (see `BodyBox.yoke`). */
	yokeFront: number[];
};
export type AccessoryCounts = Record<string, number>;
export type Pattern =
	| { ok: false; reason: string }
	| (Done & { construction: 'Raglan'; counts: Counts })
	| (Done & { construction: 'Set-in'; counts: SetInCounts })
	| (Done & { construction: 'Beanie' | 'Socks' | 'Scarf'; counts: AccessoryCounts });

// ── Stitch patterns ─────────────────────────────────────────────────────
const RIB: Record<string, { rep: number; name: string; work: string }> = {
	'1×1': { rep: 2, name: '1×1 rib', work: '*k1, p1; rep from * to end' },
	'2×2': { rep: 4, name: '2×2 rib', work: '*k2, p2; rep from * to end' },
	'2×1': { rep: 3, name: '2×1 rib', work: '*k2, p1; rep from * to end' },
	Twisted: { rep: 2, name: 'twisted 1×1 rib', work: '*k1 tbl, p1; rep from * to end' },
	Stockinette: { rep: 1, name: 'stockinette', work: 'knit' }
};
export const ribOf = (key: string) => RIB[key] ?? RIB['1×1'];

// ── Small helpers ───────────────────────────────────────────────────────
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const lcm = (...ns: number[]) => ns.reduce((a, b) => (a / gcd(a, b)) * b, 1);
/** Nearest multiple of m (at least m). */
export const toMult = (n: number, m: number) => Math.max(m, Math.round(n / m) * m);
/** Ramanujan's ellipse perimeter for half-axes a, b. */
export const ellipse = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
export const B = (n: number) => `**${n}**`;
export const sts = (n: number) => `${B(n)} st${n === 1 ? '' : 's'}`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function inches(cm: number) {
	const q = Math.round((cm / 2.54) * 4) / 4;
	const whole = Math.floor(q);
	const frac = ['', '¼', '½', '¾'][Math.round((q - whole) * 4)];
	return whole ? `${whole}${frac}` : frac || '0';
}
/** "6 cm (2¼ in)" */
export const len = (cm: number) => `${cm < 10 ? Math.round(cm * 2) / 2 : Math.round(cm)} cm (${inches(cm)} in)`;

/** Closest stitch count to n that is a multiple of rep, and how to get there on a set-up round. */
export function fitTo(n: number, rep: number) {
	if (rep <= 1 || n % rep === 0) return n;
	const down = Math.floor(n / rep) * rep;
	return down >= rep && n - down <= rep / 2 ? down : down + rep;
}

/** "decrease 6 sts evenly (k2tog about every 9th and 10th st)" */
export function evenly(from: number, to: number) {
	const d = to - from;
	if (d > 0) return `increase ${sts(d)} evenly (M1 about every ${Math.max(1, Math.floor(from / d))} sts)`;
	return `decrease ${sts(-d)} evenly (k2tog about every ${Math.max(2, Math.floor(from / -d))} sts)`;
}

/** The stripe repeat in words, e.g. "a 16-round repeat of 11 rounds main colour, then 5 rounds contrast colour". */
export function stripeRepeat(d: Design, unit: string) {
	const [on, period] = stripeOf(d.stripeWidth);
	const n = (k: number) => `${k} ${unit}${k === 1 ? '' : 's'}`;
	return `a ${period}-${unit} repeat of ${n(period - on)} main colour, then ${n(on)} contrast colour`;
}

/** Patterns worked as stranded colourwork from a chart (everything except plain and stripes). */
export const isColourwork = (pattern: string) => pattern !== 'Solid' && pattern !== 'Stripes';

/** The chart a colourwork design is knit from, and what the pattern calls it. */
export function chartOf(d: Design, gauge: number) {
	const cp = centerpieceOf(d);
	const centerpiece = cp ? rowsOf(cp) : null;
	if (!isColourwork(d.pattern)) return { chart: null, chartName: '', centerpiece };
	return { chart: tileOf(d.pattern, d.motif, tileFor(d, gauge)), chartName: d.pattern === 'Fair isle' ? 'Fair Isle' : d.pattern, centerpiece };
}

// ── Materials (also used by the bottom bar) ─────────────────────────────
export function estimate(d: Design) {
	const yarn = weightOf(d.gauge);
	const m = measure(d);
	const family = familyOf(d);
	const fairIsle = isColourwork(d.pattern);
	// Fabric area (cm²). Accessories use their own simple surface areas; tops keep the original model.
	let area: number;
	if (family === 'hat') area = m.chest * m.L + (m.pom ? 20 : 0);
	else if (family === 'sock') area = 2 * (m.chest! * m.legLen! + 0.8 * m.chest! * m.footLen!);
	else if (family === 'scarf') area = m.scarfW! * m.scarfL! + 2 * m.scarfW! * (m.fringeLen ?? 0) * 0.5;
	else {
		const sleeveBody = m.sleeveBody + m.cuffLen;
		area =
			m.chest * m.L +
			(m.hasSleeves ? 2 * (0.8 * m.upperArm * sleeveBody + 0.6 * m.upperArm * (m.L - m.ya)) : 0) +
			ellipse(m.N, m.Nd) * m.collarH;
	}
	// About 0.125 yd per cm² at worsted gauge (an adult M worsted sweater takes ~1,150 yd); finer
	// yarn, or the same yarn knitted tighter on a thinner needle, takes proportionally more. Stranded colourwork carries the unused colour behind the work.
	const yards = Math.round(area * 0.125 * (m.gauge / 18) * (fairIsle ? 1.2 : 1));
	let share = 0;
	if (d.pattern === 'Stripes') share = stripeOf(d.stripeWidth)[0] / stripeOf(d.stripeWidth)[1];
	if (fairIsle) share = contrastShare(d.pattern, d.motif, tileFor(d, m.gauge));
	// A centerpiece is stranded colourwork over a patch of the front: yarn for the stitches it paints, and a little more for carrying it.
	const cp = centerpieceOf(d);
	const patchYards = cp ? Math.round((countOn(cp) / (m.stPerCm * m.rowPerCm)) * 0.125 * (m.gauge / 18) * 1.3) : 0;
	const contrastYards = share || cp ? Math.max(20, Math.round(yards * share * 1.1) + patchYards) : 0;
	const mainYards = yards - Math.round(yards * share);
	const skeins = (y: number) => Math.ceil(y / yarn.yardage);
	const level =
		family === 'sock'
			? d.heel === 'Short row' || d.toe === 'Round' || fairIsle
				? 'Intermediate'
				: 'Beginner'
			: family === 'hat'
				? d.crown === 'Gathered' || fairIsle
					? 'Intermediate'
					: 'Beginner'
				: family === 'scarf'
					? fairIsle
						? 'Intermediate'
						: 'Beginner'
					: (m.hasSleeves && !m.raglan) || d.neckline === 'V-neck' || d.neckline === 'I-cord' || d.sleeveShape === 'Puff' || d.slits !== 'None' || d.hemFinish === 'Folded hem' || d.hemFinish === 'I-cord' || fairIsle || Boolean(cp)
						? 'Intermediate'
						: 'Beginner';
	return { yarn, needles: needlesOf(d), gauge: m.gauge, yards: mainYards + contrastYards, mainYards, contrastYards, skeins: skeins(mainYards) + (contrastYards ? skeins(contrastYards) : 0), mainSkeins: skeins(mainYards), contrastSkeins: contrastYards ? skeins(contrastYards) : 0, level };
}

// ── Beginner tips used in more than one place ──
export const TIPS = {
	evenly: `Spread these out around the whole edge. The spacing does not have to be exact; ending with the right number of stitches is what matters.`,
	rib: `Rib is columns of knit and purl stitches, which makes a stretchy edge. Bring the yarn to the front between the needles before a purl stitch and to the back before a knit stitch. After the first time around you can read your knitting: knit the stitches that look like a V, purl the ones with a bump.`,
	bindOff: `“In pattern” means knit the knit stitches and purl the purl stitches as you bind them off. Keep it loose. If the edge pulls in, undo it and bind off again with a needle one or two sizes bigger.`,
	pickUp: `To pick up and knit: push the needle tip through the edge of the fabric, wrap the yarn around it and pull a loop through. Each loop is one new stitch.`
};

// ── Edges: hems, cuffs ──────────────────────────────────────────────────
/** Steps to finish an open edge of n sts with the chosen finish. */
export function edgeSteps(finish: string, ribKey: string, depth: number, n: number, flat: boolean, k: number): Step[] {
	const u = flat ? 'row' : 'round';
	const steps: Step[] = [];
	if (finish === 'Ribbed') {
		const rib = ribOf(ribKey);
		const to = fitTo(n, rib.rep);
		if (to !== n) steps.push({ text: `Next ${u}: ${evenly(n, to)}.`, count: sts(to), tip: TIPS.evenly });
		steps.push({
			text: `Change to the smaller needle. Work in ${rib.name} (${rib.work}${flat ? '; on WS rows work the sts as they appear' : ''}) for ${len(depth)}.`,
			tip: rib.rep > 1 ? TIPS.rib : undefined,
			adds: depth
		});
		steps.push({ text: `Bind off loosely in pattern.`, tip: TIPS.bindOff });
	} else if (finish === 'Folded hem') {
		steps.push({ text: `Knit ${len(depth)}.`, adds: depth });
		steps.push({ text: `Turning ${u}: ${flat ? 'knit 1 WS row' : 'purl 1 round'}.`, tip: `This one ${u} of bumps makes a crease, so the hem folds in a straight line.` });
		steps.push({ text: `${flat ? 'Work in stockinette' : 'Knit'} ${len(depth)} more, then bind off loosely. Fold the edge to the inside along the turning ${u} and sew it down loosely.` });
	} else if (finish === 'Rolled edge') {
		steps.push({ text: `${flat ? 'Work in stockinette' : 'Knit'} ${len(2 * k)} more, then bind off loosely. The edge rolls to the right side on its own.`, adds: 2 * k });
	} else {
		steps.push({
			text: `I-cord bind-off: cast on ${sts(3)} at the start of the left needle. *K2, ssk (the last cord st together with 1 st of the ${flat ? 'piece' : 'round'}), slip the 3 sts back to the left needle; rep from * until all sts are bound off. ${flat ? 'Bind off the 3 cord sts.' : 'Graft or sew the cord ends together.'}`,
			tip: `This makes a small round cord along the edge. It is slow, and much easier to follow after watching it done once.`,
			adds: 0.6 * Math.sqrt(k)
		});
	}
	return steps;
}

// ── Parts worked the same in every construction ─────────────────────────
export type Measures = ReturnType<typeof measure>;

/** Stitches and rows per length, for this design's gauge. */
export function scale(m: Measures) {
	return {
		rowsOf: (cm: number) => Math.max(0, Math.round(cm * m.rowPerCm)),
		stsOf: (cm: number) => cm * m.stPerCm
	};
}

/** Stripes and charted colourwork: how the colour is carried through every stockinette section. */
export function colourSection(d: Design, m: Measures, how: { flat: boolean; start: string; yoke: string; grow: string }): PatternSection | null {
	const stripes = d.pattern === 'Stripes';
	const fairIsle = isColourwork(d.pattern);
	if (!stripes && !fairIsle) return null;
	const tile = tileFor(d, m.gauge);
	const R = how.flat ? 'row' : 'round';
	const steps: Step[] = [];
	if (stripes)
		steps.push({
			note: true,
			text: `Stripes: in every stockinette section (${how.yoke}, body${m.hasSleeves ? ', sleeves' : ''}) work ${stripeRepeat(d, R)}. Carry the unused colour up the inside at the start of the ${R}${how.flat ? '' : ' and use a jogless join'}. Start the stripes once ${how.start}.`
		});
	const chartName = d.pattern === 'Fair isle' ? 'Fair Isle' : `Colourwork (${d.pattern === 'Custom' ? 'your own chart' : d.pattern.toLowerCase()})`;
	const floatMax = fairIsle ? longestFloat(d.pattern, d.motif, tile) : 0;
	if (fairIsle)
		steps.push({
			note: true,
			tip: `Knit a plain sweater first if you can. Colourwork pulls the fabric tighter than plain knitting, so swatch in the chart pattern and go up a needle size if your stitches come out smaller.`,
			text: `${chartName}: in every stockinette section (${how.yoke}, body${m.hasSleeves ? ', sleeves' : ''}) work the chart, a ${tile.st}-st, ${tile.rows}-${R} repeat, reading rows from top to bottom (the sweater is knit top down). Start once ${how.start}. Work ${how.grow} into the chart as they appear. On the body the repeat fits exactly.${m.hasSleeves ? ' On the sleeves centre it on the top of the arm and let it break at the underarm.' : ''} Keep floats loose, and catch any float longer than 5 sts.${floatMax > 5 ? ` This chart carries the yarn up to ${floatMax} sts, so catch those floats as you go.` : ''}`
		});
	return { id: 'colour', title: stripes ? 'Stripes' : 'Colourwork', intro: `This applies to the whole garment. Read it now and come back to it when you reach the plain knitting after the neck.`, steps };
}

/** From the underarm down to the hem. `bodySts` are on the needle; a cardigan is worked flat. */
export function bodySection(d: Design, m: Measures, bodySts: number, intro: string, frontSts?: number, cpDrop?: number): PatternSection {
	const { k } = m;
	const cardigan = opensFront(d);
	const slits = !cardigan && m.slitH > 0;
	const body: Step[] = [];
	const rolled = d.hemFinish === 'Rolled edge' ? 2 * k : 0;
	const bodyLen = Math.max(0, m.ya - m.hemH - rolled);
	const fabric = cardigan ? 'Work in stockinette (knit RS rows, purl WS rows)' : 'Knit every round';
	const bodyTip = `The long, easy stretch. Measure with the work lying flat, straight down from the underarm cast-on, without stretching it. Because you knit from the top down you can try it on at any point, and stop earlier or later to change the length.`;
	// The part worked in the round: all of the body, or down to the slits. A centerpiece is worked inside it.
	const round = (length: number): Step[] => {
		const cp = centerpieceOf(d);
		return cp ? centerpieceSteps(d, m, cp, bodySts, length, fabric, bodyTip, frontSts, cpDrop) : [{ text: `${fabric} until the body measures ${len(length)} from the underarm${cardigan ? ', ending with a WS row' : ''}.`, tip: bodyTip, adds: length }];
	};
	if (slits) {
		const half = bodySts / 2;
		body.push(...round(Math.max(0, bodyLen - m.slitH)));
		body.push({
			text: `Side slits: from here the back and front are finished separately, flat. Keep the front sts on hold. Work the back sts back and forth, knitting the first 2 and last 2 sts of every row for a neat slit edge, for ${len(m.slitH)}.`,
			count: sts(half),
			adds: m.slitH,
			tip: `Leave the front stitches resting on the needle cable, or move them to waste yarn, while you work the back.`
		});
		body.push(...edgeSteps(d.hemFinish, d.bodyRib, m.hemH, half, true, k));
		body.push({ text: `Work the front sts the same way.` });
	} else {
		body.push(...round(bodyLen));
		body.push(...edgeSteps(d.hemFinish, d.bodyRib, m.hemH, bodySts, cardigan, k));
	}
	return {
		id: 'body',
		title: 'Body',
		intro,
		steps: body
	};
}

/**
 * The body knitted down to `length` cm below the underarm with the centerpiece worked on the front: plain
 * knitting down to the picture, one round per chart row, then plain knitting again. `drop` is where
 * the writer placed the picture (see `centerpiecePlan`); when it began up in the yoke, the body only
 * finishes it.
 */
function centerpieceSteps(d: Design, m: Measures, cp: Centerpiece, bodySts: number, length: number, fabric: string, bodyTip: string, frontSts?: number, cpDrop?: number): Step[] {
	const rowsPerCm = m.rowPerCm;
	const drop = cpDrop ?? dropRows(cp, d.centerpieceY, bodyBoxOf(d, m), d.centerpieceAt);
	if (drop < 0) return centerpieceRest(cp, m, Math.min(cp.h, -drop), length, fabric, bodyTip);
	const before = drop / rowsPerCm;
	const picture = cp.h / rowsPerCm;
	const after = Math.max(0, length - before - picture);
	const across = Math.min(cp.w, frontSts ?? bodySts);
	// The round runs right to left across the front, so the viewer's right (the wearer's left chest) is reached first.
	const off = offsetSts(d.centerpieceAt, bodyBoxOf(d, m));
	const span = frontSts ?? bodySts;
	const left = Math.min(Math.max(0, span - across), Math.max(0, Math.floor((span - across) / 2 - off)));
	const right = bodySts - left - across;
	const spot = off > 0 ? ' over the left chest' : off < 0 ? ' over the right chest' : '';
	const where = frontSts === undefined ? 'the front is the half of the round opposite BOR (which is at centre back)' : 'the front is the first part of the round, starting at BOR';
	const plain = d.pattern === 'Solid' ? 'in main colour' : d.pattern === 'Stripes' ? 'in your stripes' : 'in your pattern';
	const strand = longestStrand(cp);
	const steps: Step[] = [];
	if (drop > 0) steps.push({ text: `${fabric} until the body measures ${len(before)} from the underarm.`, tip: bodyTip, adds: before });
	steps.push({
		text: `Centerpiece set-up round${spot}: knit ${sts(left)}, pm, work row 1 of the centerpiece chart over the next ${sts(across)}, pm, then knit the remaining ${sts(right)} ${plain}.`,
		count: sts(bodySts),
		tip: `${cap(where)}. The picture goes ${off ? `${off > 0 ? 'on the wearer\'s left' : 'on the wearer\'s right'} of` : 'in the middle of'} it, so count carefully from BOR: the ${left} stitches before the first marker run from BOR to the left edge of the picture. Row 1 is the top row of the chart, read right to left, as every row is.`
	});
	steps.push({
		text: `Work the rest of the chart, one chart row per round: knit to the first marker, work the chart row, knit to BOR ${plain}. Slip the markers as you come to them.`,
		note: true,
		tip: `Stranded colourwork: carry the colour you are not using loosely behind the work. In the picture, ${strand > 5 ? `the yarn is carried over up to ${strand} stitches, so catch any float longer than 5 sts by twisting the two yarns together at the back` : `no float is longer than ${strand} st${strand === 1 ? '' : 's'}`}. Outside the markers, keep working as before.`
	});
	steps.push({
		text: `Work chart rows 2–${cp.h}, one per round. Row ${cp.h} is the bottom of the picture.`,
		count: sts(bodySts),
		tally: { unit: 'Round', first: 2, rows: Array.from({ length: cp.h - 1 }, (_, j) => `Chart row ${j + 2}`) },
		adds: Math.max(0, picture - 1 / rowsPerCm)
	});
	steps.push({ text: `Remove both markers.${after > 0.2 ? ` ${fabric} until the body measures ${len(length)} from the underarm.` : ''}`, adds: Math.max(0, after + 1 / rowsPerCm), tip: after > 0.2 ? undefined : `The picture ends right where the body does.` });
	return steps;
}

/** The body below a centerpiece that began in the yoke: the chart rows still to work, then plain knitting. */
function centerpieceRest(cp: Centerpiece, m: Measures, done: number, length: number, fabric: string, bodyTip: string): Step[] {
	const left = cp.h - done;
	if (left <= 0) return [{ text: `${fabric} until the body measures ${len(length)} from the underarm.`, tip: bodyTip, adds: length }];
	const picture = left / m.rowPerCm;
	const after = Math.max(0, length - picture);
	return [
		{
			text: left === 1 ? `Work chart row ${cp.h}, the bottom of the centerpiece, between the chart markers.` : `Keep working the centerpiece between the chart markers: chart rows ${done + 1}–${cp.h}, one per round. Row ${cp.h} is the bottom of the picture.`,
			tally: { unit: 'Round', first: 1, rows: Array.from({ length: left }, (_, j) => `Chart row ${done + 1 + j}`) },
			adds: picture,
			tip: `The picture began up in the yoke and carries on here, so the markers are already in place. Outside them, knit as before.`
		},
		{ text: `Remove the chart markers.${after > 0.2 ? ` ${fabric} until the body measures ${len(length)} from the underarm.` : ''}`, adds: after, tip: after > 0.2 ? bodyTip : `The picture ends right where the body does.` }
	];
}

/**
 * Where a writer puts the centerpiece, given the front's width on the yoke rows above the underarm
 * (nearest first, the underarm join round being the first). `up` is how many of those rows the
 * picture reaches into: 0 when it sits wholly in the body.
 */
export function centerpiecePlan(d: Design, m: Measures, yoke: number[]) {
	const cp = centerpieceOf(d);
	const box: BodyBox = { ...bodyBoxOf(d, m), yoke };
	const drop = cp ? dropRows(cp, d.centerpieceY, box, d.centerpieceAt) : 0;
	return { cp, box, drop, up: Math.max(0, -drop) };
}

/**
 * The yoke step that starts a centerpiece placed above the underarm, worked just before the row (or
 * round) that has chart row 1. `front` is the front's stitch count then; `up` counts the rows from that
 * one down to and including the underarm join, so the chart may carry on into the body.
 */
export function centerpieceYokeStart(d: Design, cp: Centerpiece, box: BodyBox, front: number, up: number, flat: boolean, grow: string): Step {
	const off = offsetSts(d.centerpieceAt, box);
	const across = Math.min(cp.w, front);
	const right = Math.min(Math.max(0, front - across), Math.max(0, Math.floor((front - across) / 2 - off)));
	const left = front - right - across;
	const spot = off > 0 ? ' over the left chest' : off < 0 ? ' over the right chest' : ', in the middle';
	const R = flat ? 'row' : 'round';
	const ends = cp.h < up ? `After chart row ${cp.h}, the bottom of the picture, remove the chart markers and carry on as before.` : cp.h === up ? `The last chart row falls on the underarm ${flat ? 'join' : 'divide'} ${R}.` : `The picture is ${cp.h} rows tall, so it carries on into the body.`;
	return {
		text: `Centerpiece: start it on the next ${R}${spot}. As you work across the front, place 2 chart markers: ${sts(right)} in from the front's right-hand edge (as you look at the right side), then ${sts(across)} for the picture, leaving ${sts(left)} to its left edge. Work row 1 of the centerpiece chart between them. From then on, work the next chart row between the markers on every ${R}, alongside the ${R}s below. ${ends}`,
		tip: `Count the front stitches as they are before this ${R}: any ${grow} on it sit at the edges of the front, outside the chart markers, and do not change where the picture goes. Row 1 is the top row of the chart.${flat ? ' On RS rows read the chart right to left and knit; on WS rows read it left to right and purl, in whichever colour each stitch shows.' : ' Read each chart row right to left.'} Carry the colour you are not using loosely behind the work, catching any float longer than 5 sts.`
	};
}

/** Words for the underarm join when the centerpiece is part-way through then (`up` as for `centerpieceYokeStart`). */
export const centerpieceAtJoin = (cp: Centerpiece | null, up: number) => (cp && up > 0 && cp.h >= up ? ` As you cross the front, work chart row ${up} of the centerpiece between the chart markers${cp.h === up ? ', then remove them' : ''}.` : '');

/**
 * The sleeve from the underarm down: taper (or balloon / puff shaping), the plain stretch and the cuff.
 * `top` sts are on the needle at the underarm. Adds to `sl`; returns the counts the pattern reports.
 */
export function sleeveTail(d: Design, m: Measures, top: number, sl: Step[]) {
	const { k, rowPerCm, sleeveBody } = m;
	const { rowsOf } = scale(m);
	const l0 = m.tubeLen - sleeveBody; // the model's sleeve coordinate at the underarm
	/** Sleeve stitch count x cm below the underarm, following the 3D sleeve's outline. */
	const sleeveAt = (x: number, top: number) => (top * m.sleeveR(l0 + x)) / m.armR(l0);
	const sleeveRows = rowsOf(sleeveBody);
	const plainRounds = (n: number): Tally | undefined => (n > 0 ? { unit: 'Round', first: 1, rows: Array.from({ length: n }, () => 'Knit round') } : undefined);
	/** Rounds of the sleeve worked so far, so the "knit until" step knows how much is left for it. */
	let worked = 0;
	const rounds = (n: number) => ((worked += n), n / rowPerCm);
	const rest = () => Math.max(0, sleeveBody - worked / rowPerCm);
	const untilTip = `Try it on to check the length. Write down how many rounds you knit here, so the second sleeve comes out the same.`;
	let cur = top;
	if (d.sleeveShape === 'Straight') {
		const end = toMult(sleeveAt(sleeveBody, top), 2);
		const decs = Math.max(0, Math.round((top - end) / 2));
		const lead = rowsOf(2.5 * k);
		const avail = sleeveRows - lead - rowsOf(2.5 * k);
		if (decs > 0 && avail >= decs) {
			const every = Math.max(1, Math.floor(avail / decs));
			sl.push({ text: `Knit ${B(lead)} rounds.`, tally: plainRounds(lead), adds: rounds(lead) });
			sl.push({
				text: `Dec round: k1, k2tog, knit to the last 3 sts, ssk, k1. 2 sts decreased.`,
				note: true,
				tip: `A recipe for the next step. The two decreases sit either side of the underarm, and narrow the sleeve towards the wrist.`
			});
			sl.push({
				text: `Work a dec round ${every === 1 ? 'every round' : `every ${B(every)} rounds`}, ${B(decs)} times in all.`,
				count: sts((cur = top - 2 * decs)),
				tally: { unit: 'Round', first: 1, rows: Array.from({ length: (decs - 1) * every + 1 }, (_, j) => (j % every ? 'Knit round' : 'Dec round')) },
				adds: rounds((decs - 1) * every + 1),
				tip: `Start with a dec round, then knit plain rounds in between. The counter shows which rounds are dec rounds.`
			});
		}
		sl.push({ text: `Knit until the sleeve measures ${len(sleeveBody)} from the underarm.`, tip: untilTip, adds: rest() });
	} else {
		// Balloon and puff sleeves: follow the 3D outline with evenly spaced increases / decreases.
		const every = Math.max(2, rowsOf(3 * Math.sqrt(k)));
		let last = 0;
		for (let r = 0; r <= sleeveRows; r += every) {
			const want = toMult(sleeveAt(r / rowPerCm, top), 2);
			const change = Math.abs(want - cur) >= Math.max(4, cur * 0.06);
			if (!change) continue;
			const to = Math.max(Math.ceil(cur / 2), want);
			if (r > last) sl.push({ text: `Knit ${B(r - last)} round${r - last > 1 ? 's' : ''}.`, tally: plainRounds(r - last), adds: rounds(r - last) });
			sl.push({ text: `Next round: ${evenly(cur, to)}.`, count: sts(to), tip: TIPS.evenly, adds: rounds(1) });
			cur = to;
			last = r + 1;
		}
		sl.push({ text: `Knit until the sleeve measures ${len(sleeveBody)} from the underarm.`, tip: untilTip, adds: rest() });
	}
	const sleeveEndSts = cur;
	// Cuff: rib draws in a little more than plain fabric.
	const cuffRib = ribOf(d.sleeveRib);
	const ribbedCuff = d.cuffFinish === 'Ribbed';
	let cuffSts = Math.max(Math.ceil(cur / 2), Math.round(((top * m.cuffR) / m.armR(l0)) * (ribbedCuff && d.sleeveRib !== 'Stockinette' ? 0.9 : 1)));
	if (ribbedCuff) cuffSts = fitTo(cuffSts, cuffRib.rep);
	if (Math.abs(cuffSts - cur) >= 2 || (ribbedCuff && cuffSts !== cur)) sl.push({ text: `Cuff set-up round: ${evenly(cur, cuffSts)}.`, count: sts(cuffSts), tip: TIPS.evenly });
	else cuffSts = cur;
	sl.push(...edgeSteps(d.cuffFinish, d.sleeveRib, m.cuffLen, cuffSts, false, k));
	sl.push({ text: `Work the second sleeve the same way.`, note: true });
	return { sleeveEndSts, cuffSts };
}

export const SLEEVES_INTRO = `Each sleeve is a narrower tube, knit from the underarm down to the cuff. You make two, one after the other, the same way.`;

/** Cardigan button and buttonhole bands. `band` is how many sts each front stops short of centre. */
export function bandsSection(d: Design, m: Measures, band: number) {
	const { k, stPerCm } = m;
	const { stsOf } = scale(m);
	const bandRib = ribOf(d.bodyRib);
	const edgeCm = m.L - m.dropF + m.collarH;
	const pick = fitTo(Math.round(stsOf(edgeCm)), bandRib.rep);
	const bandCm = band / stPerCm;
	const yTop = m.L - m.dropF + 1.2 * k;
	const buttons = Math.max(3, Math.round(yTop / (8.5 * Math.sqrt(k))));
	const buttonMm = Math.round(19 * Math.sqrt(k));
	const holes = Array.from({ length: buttons }, (_, b) => Math.max(2, Math.round(((2.5 * k + ((yTop - 2.9 * k) * b) / (buttons - 1)) / edgeCm) * pick)));
	const fb: Step[] = [];
	fb.push({ text: `Button band: with RS facing and the smaller needle, pick up and knit ${sts(pick)} along one front edge, from the top of the neckband down to the hem (about 3 sts for every 4 rows).`, count: sts(pick), tip: `${TIPS.pickUp} “3 for every 4 rows” means: pick up a stitch in three row ends, then skip one.` });
	fb.push({ text: `Work in ${bandRib.name} (RS: ${bandRib.work}; WS: work sts as they appear) for ${len(bandCm)}. Bind off loosely in pattern.`, adds: bandCm });
	fb.push({ text: `Buttonhole band: pick up ${sts(pick)} along the other front edge, from the hem up to the top of the neckband. Work in rib as for the button band until it measures ${len(bandCm / 2)}.`, adds: bandCm / 2 });
	fb.push({
		text: `Buttonhole row (RS): make ${B(buttons)} buttonholes, each ${buttonMm > 15 ? 'by binding off 2 sts (cast them back on over the gap on the next row)' : 'with a yo, k2tog'}, at sts ${holes.map((h) => B(h)).join(', ')} counted from the hem. Work the rest of the row in rib.`,
		tip: `Before you start, lay the buttons along the finished button band to see the spacing, and mark the buttonhole stitches with removable markers or scraps of yarn.`
	});
	fb.push({ text: `Continue in rib until the band matches the button band. Bind off loosely in pattern.`, adds: bandCm / 2 });
	const section: PatternSection = {
		id: 'bands',
		title: 'Front bands',
		intro: `Two ribbed strips down the front edges: one holds the buttons, the other has the buttonholes.`,
		steps: fb
	};
	return { section, buttons, buttonMm };
}

export function finishingSection(cardigan: boolean, buttons: number): PatternSection {
	return {
		id: 'finishing',
		title: 'Finishing',
		intro: `The last hour of work, and the one that makes the sweater look finished.`,
		steps: [
			{
				text: `Use the yarn tails to close any small gaps at the underarms. Weave in all ends.`,
				tip: `Thread each tail onto the tapestry needle and run it through the backs of the stitches on the inside for about 5 cm, then trim it.`
			},
			{
				tip: `Blocking evens out your stitches and lets the fabric relax to its real size. It makes a bigger difference than you would expect, so do not skip it.`,
				text: `Wet block: soak, squeeze out the water, and lay flat to the finished measurements to dry.${cardigan ? ` Sew the ${B(buttons)} buttons to the button band opposite the buttonholes.` : ''}`
			}
		]
	};
}

/** Needles and yarn lines of the Materials list, with the notions the construction needs. */
export function materialsOf(d: Design, m: Measures, notions: string): [string, string][] {
	const est = estimate(d);
	const yarn = est.yarn;
	const family = familyOf(d);
	const circ = family === 'sock' ? '40 cm (16 in), or DPNs' : m.chest > 70 ? '80 cm (32 in)' : m.chest > 48 ? '60 cm (24 in)' : '40 cm (16 in)';
	return [
		[
			'Yarn',
			`${yarn.label} weight. Main colour: about ${est.mainYards} yd (${Math.round(est.mainYards * 0.9144)} m), ${est.mainSkeins} × ${yarn.yardage} yd skeins` +
				(est.contrastYards ? `. Contrast colour: about ${est.contrastYards} yd (${Math.round(est.contrastYards * 0.9144)} m), ${est.contrastSkeins} skein${est.contrastSkeins > 1 ? 's' : ''}` : '')
		],
		['Main needle', `${needleLabel(est.needles.main)}${family === 'scarf' ? ' straight' : ` circular, ${circ} long`}${m.hasSleeves ? ', plus DPNs or a long circular for magic loop (sleeves)' : ''}`],
		['Smaller needle', `${needleLabel(est.needles.rib)}, for ribbing and bands`],
		['Notions', notions]
	];
}

export function gaugeText(m: Measures, cardigan: boolean) {
	const rowGauge = Math.round(m.rowPerCm * 10.16);
	return `${m.gauge} sts and ${rowGauge} ${cardigan ? 'rows' : 'rounds'} = 10 cm (4 in) in stockinette on the main needle, after blocking. Knit a swatch and change needle size if needed: the stitch counts depend on matching the stitch gauge.`;
}

export const BASE_ABBREVIATIONS: [string, string][] = [
	['k / p', 'knit / purl'],
	['k2tog', 'knit 2 together (1 st decreased, leans right)'],
	['ssk', 'slip, slip, knit the 2 slipped sts together (1 st decreased, leans left)'],
	['M1L / M1R', 'make 1 left / right: lift the bar between sts and knit it through the back / front loop'],
	['pm / sm', 'place marker / slip marker'],
	['BOR', 'beginning of round'],
	['RS / WS', 'right side / wrong side'],
	['tbl', 'through the back loop'],
	['rep', 'repeat']
];
export const MDS_ABBREVIATION: [string, string] = ['MDS', 'make double stitch (German short rows): slip 1 purlwise with yarn in front, pull the yarn over the needle to the back so the st shows two legs'];

/** Plain-text version of a pattern, for download or copy. */
export function patternText(p: Pattern): string {
	if (!p.ok) return p.reason;
	const plain = (s: string) => s.replace(/\*\*(\d+)\*\*/g, '$1');
	const out = [p.title.toUpperCase(), `Skill: ${p.level}`, ''];
	out.push('MATERIALS', ...p.materials.map(([a, b]) => `${a}: ${b}`), '', 'GAUGE', p.gauge, '', 'FINISHED MEASUREMENTS', ...p.measurements.map(([a, b]) => `${a}: ${b}`), '');
	for (const s of p.sections) {
		out.push(s.title.toUpperCase());
		for (const st of s.steps) out.push(`- ${plain(st.text)}${st.count ? `  [${plain(st.count)}]` : ''}`);
		out.push('');
	}
	if (p.chart) out.push('CHART (X = contrast, read top to bottom, right to left)', ...p.chart.map((row, j) => `${String(j + 1).padStart(2)} ${row.map((c) => (c ? 'X' : '.')).join('')}`), '');
	if (p.centerpiece) out.push('CENTERPIECE CHART (X = contrast, worked once on the front, read top to bottom, right to left)', ...p.centerpiece.map((row, j) => `${String(j + 1).padStart(2)} ${row.map((c) => (c ? 'X' : '.')).join('')}`), '');
	out.push('ABBREVIATIONS', ...p.abbreviations.map(([a, b]) => `${a}: ${b}`));
	return out.join('\n');
}
