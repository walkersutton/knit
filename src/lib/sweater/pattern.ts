import { measure, type Design } from './garment';
import { yarnWeights } from './options';
import { chart, TILE_ROWS, TILE_ST } from './yarn';

/**
 * Turns a design into a written, top-down raglan knitting pattern.
 *
 * Every measurement comes from `measure()`, so the pattern describes the garment the 3D view shows.
 *
 * Step text marks stitch counts as **n**; the UI renders those in bold.
 */

export type Step = { text: string; count?: string };
export type PatternSection = { id: string; title: string; steps: Step[] };
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
export type Pattern =
	| { ok: false; reason: string }
	| {
			ok: true;
			title: string;
			level: string;
			materials: [string, string][];
			gauge: string;
			measurements: [string, string][];
			abbreviations: [string, string][];
			sections: PatternSection[];
			/** Fair Isle chart, rows top to bottom in knitting order; true = contrast colour. */
			chart: boolean[][] | null;
			counts: Counts;
	  };

// ── Stitch patterns ─────────────────────────────────────────────────────
const RIB: Record<string, { rep: number; name: string; work: string }> = {
	'1×1': { rep: 2, name: '1×1 rib', work: '*k1, p1; rep from * to end' },
	'2×2': { rep: 4, name: '2×2 rib', work: '*k2, p2; rep from * to end' },
	'2×1': { rep: 3, name: '2×1 rib', work: '*k2, p1; rep from * to end' },
	Twisted: { rep: 2, name: 'twisted 1×1 rib', work: '*k1 tbl, p1; rep from * to end' },
	Stockinette: { rep: 1, name: 'stockinette', work: 'knit' }
};
const ribOf = (key: string) => RIB[key] ?? RIB['1×1'];

/** Smaller needle for ribbing, by gauge. */
const RIB_NEEDLE: Record<number, string> = { 28: 'US 1½ (2.5 mm)', 22: 'US 4 (3.5 mm)', 18: 'US 6 (4 mm)', 13: 'US 9 (5.5 mm)' };

// ── Small helpers ───────────────────────────────────────────────────────
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (...ns: number[]) => ns.reduce((a, b) => (a / gcd(a, b)) * b, 1);
/** Nearest multiple of m (at least m). */
const toMult = (n: number, m: number) => Math.max(m, Math.round(n / m) * m);
/** Ramanujan's ellipse perimeter for half-axes a, b. */
const ellipse = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
const B = (n: number) => `**${n}**`;
const sts = (n: number) => `${B(n)} st${n === 1 ? '' : 's'}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function inches(cm: number) {
	const q = Math.round((cm / 2.54) * 4) / 4;
	const whole = Math.floor(q);
	const frac = ['', '¼', '½', '¾'][Math.round((q - whole) * 4)];
	return whole ? `${whole}${frac}` : frac || '0';
}
/** "6 cm (2¼ in)" */
export const len = (cm: number) => `${cm < 10 ? Math.round(cm * 2) / 2 : Math.round(cm)} cm (${inches(cm)} in)`;

/** Closest stitch count to n that is a multiple of rep, and how to get there on a set-up round. */
function fitTo(n: number, rep: number) {
	if (rep <= 1 || n % rep === 0) return n;
	const down = Math.floor(n / rep) * rep;
	return down >= rep && n - down <= rep / 2 ? down : down + rep;
}

/** "decrease 6 sts evenly (k2tog about every 9th and 10th st)" */
function evenly(from: number, to: number) {
	const d = to - from;
	if (d > 0) return `increase ${sts(d)} evenly (M1 about every ${Math.max(1, Math.floor(from / d))} sts)`;
	return `decrease ${sts(-d)} evenly (k2tog about every ${Math.max(2, Math.floor(from / -d))} sts)`;
}

// ── Materials (also used by the bottom bar) ─────────────────────────────
export function estimate(d: Design) {
	const yarn = yarnWeights.find((w) => w.gauge === d.gauge) ?? yarnWeights[2];
	const m = measure(d);
	const fairIsle = d.pattern === 'Fair isle';
	// Fabric area (cm²): body, sleeves below the underarm, sleeve tops in the yoke, collar.
	const sleeveBody = m.sleeveBody + m.cuffLen;
	const area =
		m.chest * m.L +
		(m.hasSleeves ? 2 * (0.8 * m.upperArm * sleeveBody + 0.6 * m.upperArm * (m.L - m.ya)) : 0) +
		ellipse(m.N, m.Nd) * m.collarH;
	// About 0.125 yd per cm² at worsted gauge (an adult M worsted sweater takes ~1,150 yd); finer
	// yarn takes proportionally more. Stranded colourwork carries the unused colour behind the work.
	const yards = Math.round(area * 0.125 * (m.gauge / 18) * (fairIsle ? 1.2 : 1));
	let share = 0;
	if (d.pattern === 'Stripes') share = 5 / TILE_ROWS;
	if (fairIsle) {
		let on = 0;
		for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) on += +chart('Fair isle', i, j);
		share = on / (TILE_ROWS * TILE_ST);
	}
	const contrastYards = share ? Math.max(20, Math.round(yards * share * 1.1)) : 0;
	const mainYards = yards - Math.round(yards * share);
	const skeins = (y: number) => Math.ceil(y / yarn.yardage);
	const level =
		d.neckline === 'V-neck' || d.neckline === 'I-cord' || d.sleeveShape === 'Puff' || d.slits !== 'None' || d.hemFinish === 'Folded hem' || d.hemFinish === 'I-cord' || fairIsle
			? 'Intermediate'
			: 'Beginner';
	return { yarn, yards: mainYards + contrastYards, mainYards, contrastYards, skeins: skeins(mainYards) + (contrastYards ? skeins(contrastYards) : 0), mainSkeins: skeins(mainYards), contrastSkeins: contrastYards ? skeins(contrastYards) : 0, level };
}

// ── Edges: hems, cuffs ──────────────────────────────────────────────────
/** Steps to finish an open edge of n sts with the chosen finish. */
function edgeSteps(finish: string, ribKey: string, depth: number, n: number, flat: boolean, k: number): Step[] {
	const u = flat ? 'row' : 'round';
	const steps: Step[] = [];
	if (finish === 'Ribbed') {
		const rib = ribOf(ribKey);
		const to = fitTo(n, rib.rep);
		if (to !== n) steps.push({ text: `Next ${u}: ${evenly(n, to)}.`, count: sts(to) });
		steps.push({ text: `Change to the smaller needle. Work in ${rib.name} (${rib.work}${flat ? '; on WS rows work the sts as they appear' : ''}) for ${len(depth)}.` });
		steps.push({ text: `Bind off loosely in pattern.` });
	} else if (finish === 'Folded hem') {
		steps.push({ text: `Knit ${len(depth)}.` });
		steps.push({ text: `Turning ${u}: ${flat ? 'knit 1 WS row' : 'purl 1 round'}.` });
		steps.push({ text: `${flat ? 'Work in stockinette' : 'Knit'} ${len(depth)} more, then bind off loosely. Fold the edge to the inside along the turning ${u} and sew it down loosely.` });
	} else if (finish === 'Rolled edge') {
		steps.push({ text: `${flat ? 'Work in stockinette' : 'Knit'} ${len(2 * k)} more, then bind off loosely. The edge rolls to the right side on its own.` });
	} else {
		steps.push({
			text: `I-cord bind-off: cast on ${sts(3)} at the start of the left needle. *K2, ssk (the last cord st together with 1 st of the ${flat ? 'piece' : 'round'}), slip the 3 sts back to the left needle; rep from * until all sts are bound off. ${flat ? 'Bind off the 3 cord sts.' : 'Graft or sew the cord ends together.'}`
		});
	}
	return steps;
}

// ── The pattern ─────────────────────────────────────────────────────────
type Kind = 'all' | 'body' | 'sleeve' | 'plain';
type Row = { flat: boolean; rs: boolean; kind: Kind; neck: boolean; co: number };

export function writePattern(d: Design): Pattern {
	const m = measure(d);
	if (!m.hasSleeves) return { ok: false, reason: 'Written patterns for slipovers are coming soon. Sweaters, T-shirts and cardigans with raglan sleeves are ready now.' };
	if (!m.raglan) return { ok: false, reason: 'Written patterns for set-in sleeves are coming soon. Choose Raglan construction to get the full pattern.' };

	const { k, stPerCm, rowPerCm } = m;
	const cardigan = d.garment === 'Cardigan';
	const vNeck = d.neckline === 'V-neck';
	const fairIsle = d.pattern === 'Fair isle';
	const stripes = d.pattern === 'Stripes';
	const slits = !cardigan && m.slitH > 0;
	const rowsOf = (cm: number) => Math.max(0, Math.round(cm * rowPerCm));
	const stsOf = (cm: number) => cm * stPerCm;

	// ── Finished circumferences (cm) ──
	const chestCm = m.chest;
	const neckCm = ellipse(m.N, m.Nd);
	const upperArmCm = m.upperArm;
	const sleeveBody = m.sleeveBody; // underarm to start of cuff
	const l0 = m.tubeLen - sleeveBody; // the model's sleeve coordinate at the underarm
	/** Sleeve stitch count x cm below the underarm, following the 3D sleeve's outline. */
	const sleeveAt = (x: number, top: number) => (top * m.sleeveR(l0 + x)) / m.armR(l0);

	// ── Starting counts ──
	const hemRib = ribOf(d.bodyRib);
	const hemRep = d.hemFinish === 'Ribbed' ? hemRib.rep : 1;
	const bodyMult = lcm(4, cardigan ? 1 : slits ? 2 * hemRep : hemRep, fairIsle ? TILE_ST : 1);
	const bodyTarget = toMult(stsOf(chestCm), bodyMult);
	const upperTarget = stsOf(upperArmCm);
	let u = toMult(stsOf(0.04 * chestCm), 2); // underarm cast-on
	const neckSts = Math.round(stsOf(neckCm));
	const S0 = Math.max(2, Math.round(0.13 * neckSts));
	const B0 = Math.max(cardigan ? 8 : 4, toMult((neckSts - 2 * S0) / 2, 2));
	// Cardigan fronts stop half a band short of centre; the bands overlap there.
	const band = cardigan ? Math.min(B0 - 4, Math.max(2, toMult(stsOf(3.4 * Math.sqrt(k)), 2))) : 0;
	const F0 = cardigan || vNeck ? 4 : B0; // V and cardigan fronts start with 2 sts each side
	const neckPerSide = cardigan ? (B0 - band) / 2 - 2 : vNeck ? B0 / 2 - 2 : 0;
	const castOn = F0 + B0 + 2 * S0;

	// ── Yoke plan ──
	const raise = m.dropF - m.dropB;
	const srPairs = !cardigan && !vNeck && raise >= 1 ? Math.max(1, Math.round(rowsOf(raise) / 2)) : 0;
	const srRows = 2 * srPairs;
	let neckRows = 0;
	if (cardigan || vNeck) {
		neckRows = Math.max(3, rowsOf(raise));
		if (neckRows % 2 === 0) neckRows++; // end the neck section on a RS row
	}
	const yokeRowsPlanned = rowsOf(m.L - m.dropB - m.ya);
	let Ry = Math.max(yokeRowsPlanned, srRows + 6, neckRows + 6);
	const flatAt = (i: number) => cardigan || (vNeck && i < neckRows);
	/**
	 * Where increases can go. "Easy" slots give the usual raglan rhythm: every RS row when flat, every
	 * other round in the round. "Fast" slots are the rounds in between, used only when the yoke is short.
	 */
	const slots = () => {
		const easy: number[] = [];
		const fast: number[] = [];
		let parity = -1;
		for (let i = srRows; i < Ry; i++) {
			if (flatAt(i)) {
				if (i % 2 === 0) easy.push(i);
				continue;
			}
			if (parity < 0) parity = i % 2;
			(i % 2 === parity ? easy : fast).push(i);
		}
		return { easy, fast };
	};
	let nb = 0;
	let ns = 0;
	const need = () => {
		nb = Math.max(0, (bodyTarget / 2 - u - B0) / 2);
		ns = Math.max(0, Math.round((upperTarget - u - S0) / 2));
	};
	need();
	// Prefer the usual rhythm: widen the underarm cast-on a little first. Only if every slot is
	// still not enough, lengthen the yoke.
	while (Math.max(nb, ns) > slots().easy.length && u + 2 <= stsOf(0.06 * chestCm)) {
		u += 2;
		need();
	}
	while (Math.max(nb, ns) > slots().easy.length + slots().fast.length) Ry++;
	const rows: Row[] = [];
	for (let i = 0; i < Ry; i++) rows.push({ flat: flatAt(i), rs: !flatAt(i) || i % 2 === 0, kind: 'plain', neck: false, co: 0 });
	const { easy, fast } = slots();
	const a = Math.max(nb, ns);
	// Fill the easy slots from the top; any extra increases go every round at the bottom of the yoke.
	const extra = Math.max(0, a - easy.length);
	const chosen = [...easy.slice(0, a), ...fast.slice(fast.length - extra)].sort((x, y) => x - y);
	chosen.forEach((i, j) => (rows[i].kind = j < Math.min(nb, ns) ? 'all' : nb > ns ? 'body' : 'sleeve'));
	const incSlots = easy.length + fast.length;
	// Neck increases, spread over the RS rows of the neck section; any left over are cast on.
	let neckCo = 0;
	if (neckRows) {
		const rs: number[] = [];
		for (let i = 0; i < neckRows; i += 2) rs.push(i);
		const incs = Math.min(neckPerSide, rs.length);
		// A steady rhythm (every RS row, every 2nd RS row, …), counted back from the last row.
		const every = incs ? Math.max(1, Math.floor(rs.length / incs)) : 1;
		for (let j = 0; j < incs; j++) rows[rs[rs.length - 1 - j * every]].neck = true;
		neckCo = neckPerSide - incs;
		if (cardigan && neckCo) rows[neckRows - 2].co = rows[neckRows - 1].co = neckCo;
	}

	// ── Walk the yoke, tracking counts ──
	let back = B0;
	let front = F0;
	let sleeve = S0;
	const countText = (flat: boolean) =>
		`${flat ? `${B(front / 2)} each front` : `${B(front)} front`}, ${B(back)} back, ${B(sleeve)} each sleeve (${sts(front + back + 2 * sleeve)})`;
	const apply = (r: Row) => {
		if (r.kind === 'all' || r.kind === 'body') (back += 2), (front += 2);
		if (r.kind === 'all' || r.kind === 'sleeve') sleeve += 2;
		if (r.neck) front += 2;
		front += r.co;
	};
	const NAMES = { all: 'raglan inc', body: 'body inc', sleeve: 'sleeve inc' };
	const label = (r: Row) => {
		let s: string;
		if (r.flat && !r.rs) s = 'purl row';
		else if (r.kind === 'plain') s = r.neck ? 'neck inc row' : r.flat ? 'knit row' : 'knit round';
		else s = `${NAMES[r.kind]} ${r.flat ? 'row' : 'round'}${r.neck ? ' with neck incs' : ''}`;
		return s + (r.co ? `, then cast on ${sts(r.co)}` : '');
	};
	/** Compress a run of rows into "Rounds 1–24: inc round, knit round; work these 2 rounds 12 times." lines. */
	const schedule = (from: number, to: number, flat: boolean, numberFrom = from): Step[] => {
		const out: Step[] = [];
		const word = flat ? 'Row' : 'Round';
		let i = from;
		while (i < to) {
			let best = { n: 1, reps: 1 };
			for (let n = 1; n <= 4; n++) {
				let reps = 1;
				while (i + (reps + 1) * n <= to && rows.slice(i + reps * n, i + (reps + 1) * n).every((r, x) => label(r) === label(rows[i + x]))) reps++;
				if (reps > 1 && n * reps > best.n * best.reps) best = { n, reps };
			}
			const { n, reps } = best;
			const span = n * reps;
			const unit = rows.slice(i, i + n).map(label);
			const first = i - numberFrom + 1;
			const range = span === 1 ? `${word} ${first}` : `${word}s ${first}–${first + span - 1}`;
			const text = reps > 1 ? `${range}: ${unit.join(', ')}${n > 1 ? `; work these ${n} ${word.toLowerCase()}s ${reps} times` : ` × ${reps}`}.` : `${range}: ${cap(unit.join(', '))}.`;
			for (let x = i; x < i + span; x++) apply(rows[x]);
			// Between the two cardigan cast-on rows the fronts differ, so show only the total there.
			const lopsided = rows[i + span - 1].co > 0 && !rows[i + span - 1].rs;
			out.push({ text: text.replace(/: (\w)/, (_, c) => `: ${c.toUpperCase()}`), count: lopsided ? sts(front + back + 2 * sleeve) : countText(flat) });
			i += span;
		}
		return out;
	};

	const est = estimate(d);
	const rowGauge = Math.round(rowPerCm * 10.16);
	const sections: PatternSection[] = [];
	const R = cardigan ? 'row' : 'round';

	// ── Colourwork notes ──
	const colour: Step[] = [];
	if (stripes)
		colour.push({
			text: `Stripes: in every stockinette section (yoke, body, sleeves) work a 16-${R} repeat of 11 ${R}s main colour, then 5 ${R}s contrast colour. Carry the unused colour up the inside at the start of the ${R}${cardigan ? '' : ' and use a jogless join'}. Start the stripes once the neck shaping is done.`
		});
	if (fairIsle)
		colour.push({
			text: `Fair Isle: in every stockinette section (yoke, body, sleeves) work the chart, a ${TILE_ST}-st, ${TILE_ROWS}-${R} repeat, reading rows from top to bottom (the sweater is knit top down). Start once the neck shaping is done. Work new yoke increases into the chart as they appear. On the body the repeat fits exactly; on the sleeves centre it on the top of the arm and let it break at the underarm. Keep floats loose, and catch any float longer than 5 sts.`
		});
	if (colour.length) sections.push({ id: 'colour', title: stripes ? 'Stripes' : 'Colourwork', steps: colour });

	// ── Yoke ──
	const yoke: Step[] = [];
	const markers = 'markers (pm)';
	if (cardigan || vNeck)
		yoke.push({
			text: `With the main needle, cast on ${sts(2)} (front), pm, ${sts(S0)} (sleeve), pm, ${sts(B0)} (back), pm, ${sts(S0)} (sleeve), pm, ${sts(2)} (front). Do not join; work back and forth.`,
			count: sts(castOn)
		});
	else
		yoke.push({
			text: `With the main needle, cast on ${sts(castOn)} loosely. Join to work in the round without twisting. Set up the ${markers}: k${B0 / 2} (half the back), pm, k${S0} (sleeve), pm, k${F0} (front), pm, k${S0} (sleeve), pm, k${B0 / 2} (rest of the back). Place a different marker for the beginning of round (BOR) at centre back.`,
			count: `${B(F0)} front, ${B(B0)} back, ${B(S0)} each sleeve`
		});
	yoke.push({ text: `Raglan inc ${cardigan ? 'row (RS)' : vNeck ? 'row (RS) or round' : 'round'}: *knit to 1 st before marker, M1R, k1, sm, k1, M1L; rep from * 3 more times, knit to end. 8 sts increased.` });
	if (rows.some((r) => r.kind === 'body'))
		yoke.push({ text: `Body inc ${cardigan ? 'row (RS)' : 'round'}: increases on the back and front only. *Knit to 1 st before marker, M1R, k1, sm, knit to next marker, sm, k1, M1L; rep from * once more, knit to end. 4 sts increased.` });
	if (rows.some((r) => r.kind === 'sleeve'))
		yoke.push({ text: `Sleeve inc ${cardigan ? 'row (RS)' : 'round'}: increases on the sleeves only. *Knit to marker, sm, k1, M1L, knit to 1 st before next marker, M1R, k1, sm; rep from * once more, knit to end. 4 sts increased.` });
	if (neckRows)
		yoke.push({ text: `Neck incs: on rows marked "with neck incs", start the row with k1, M1L and end it with M1R, k1 (instead of knitting the last st). 2 more sts increased. A "neck inc row" has only these.` });

	if (srPairs) {
		const t = Math.max(1, Math.round(F0 * 0.06));
		const step = srPairs > 1 ? Math.min(4, Math.max(1, Math.floor((F0 / 2 - 2 - t) / (srPairs - 1)))) : 0;
		yoke.push({
			text: `Raise the back neck with German short rows (no increases yet). Short row 1 (RS): knit across the back and sleeve to the front marker, sm, k${t}, turn. Short row 2 (WS): make a double stitch (MDS), purl back across the sleeve, the back (past BOR) and the other sleeve to the other front marker, sm, p${t}, turn.`
		});
		if (srPairs > 1)
			yoke.push({
				text: `Short rows 3–${srRows}: MDS, work to the double stitch, work it as one st, then ${step} more st${step > 1 ? 's' : ''}, turn. (Knit on RS rows, purl on WS rows.) ${srPairs - 1 > 1 ? `Work ${srPairs - 1} more pairs of short rows.` : 'Work 1 more pair.'}`
			});
		yoke.push({ text: `Next row (RS): MDS, knit to BOR, working each double stitch as one st. From now on work in rounds; work the last double stitch as one st when you reach it.` });
	}

	if (cardigan) {
		yoke.push({ text: `Shape the front neck:` });
		yoke.push(...schedule(0, neckRows, true));
		yoke.push({ text: `Continue the raglan, working flat:` });
		yoke.push(...schedule(neckRows, Ry, true, 0));
	} else if (vNeck) {
		yoke.push({ text: `Shape the V-neck, working flat:` });
		yoke.push(...schedule(0, neckRows, true));
		const join = 2 * neckCo;
		yoke.push({
			text: `Join: ${join ? `cast on ${sts(join / 2)}, pm for BOR, cast on ${sts(join / 2)}` : 'pm for BOR'}, then join to the first st to work in the round. BOR is at centre front.`,
			count: ((front += join), countText(false))
		});
		yoke.push({ text: `Continue in the round:` });
		yoke.push(...schedule(neckRows, Ry, false));
	} else yoke.push(...schedule(srRows, Ry, false));
	if (Ry > yokeRowsPlanned)
		yoke.push({ text: `The yoke needs a few extra ${R}s to fit all the increases, so it measures about ${len(Ry / rowPerCm)} at centre back instead of ${len(yokeRowsPlanned / rowPerCm)}.` });
	yoke.push({
		text: `Divide ${cardigan ? 'row (RS)' : 'round'}: *knit to the next sleeve marker, remove it, slip the ${sts(sleeve)} of the sleeve to waste yarn, remove the next marker, cast on ${sts(u / 2)}, pm (side), cast on ${sts(u / 2)}; rep from * once more, knit to end.`,
		count: sts(front + back + 2 * u)
	});
	sections.push({ id: 'yoke', title: 'Yoke', steps: yoke });

	// ── Body ──
	const body: Step[] = [];
	const bodySts = front + back + 2 * u;
	const rolled = d.hemFinish === 'Rolled edge' ? 2 * k : 0;
	const bodyLen = m.ya - m.hemH - rolled;
	const fabric = cardigan ? 'Work in stockinette (knit RS rows, purl WS rows)' : 'Knit every round';
	if (slits) {
		const half = bodySts / 2;
		body.push({ text: `${fabric} until the body measures ${len(bodyLen - m.slitH)} from the underarm.` });
		body.push({
			text: `Side slits: from here the back and front are finished separately, flat. Keep the front sts on hold. Work the back sts back and forth, knitting the first 2 and last 2 sts of every row for a neat slit edge, for ${len(m.slitH)}.`,
			count: sts(half)
		});
		body.push(...edgeSteps(d.hemFinish, d.bodyRib, m.hemH, half, true, k));
		body.push({ text: `Work the front sts the same way.` });
	} else {
		body.push({ text: `${fabric} until the body measures ${len(bodyLen)} from the underarm${cardigan ? ', ending with a WS row' : ''}.` });
		body.push(...edgeSteps(d.hemFinish, d.bodyRib, m.hemH, bodySts, cardigan, k));
	}
	sections.push({ id: 'body', title: 'Body', steps: body });

	// ── Sleeves ──
	const sl: Step[] = [];
	const top = sleeve + u;
	sl.push({
		text: `Move the ${sts(sleeve)} of one sleeve to the shorter needle (or DPNs / magic loop). Starting at the centre of the underarm cast-on, pick up and knit ${sts(u / 2)}, knit the sleeve sts, pick up and knit ${sts(u / 2)} from the rest of the cast-on. Pm for BOR.`,
		count: sts(top)
	});
	const sleeveRows = rowsOf(sleeveBody);
	let cur = top;
	if (d.sleeveShape === 'Straight') {
		const end = toMult(sleeveAt(sleeveBody, top), 2);
		const decs = Math.max(0, Math.round((top - end) / 2));
		const lead = rowsOf(2.5 * k);
		const avail = sleeveRows - lead - rowsOf(2.5 * k);
		if (decs > 0 && avail >= decs) {
			const every = Math.max(1, Math.floor(avail / decs));
			sl.push({ text: `Knit ${B(lead)} rounds.` });
			sl.push({ text: `Dec round: k1, k2tog, knit to the last 3 sts, ssk, k1. 2 sts decreased.` });
			sl.push({ text: `Work a dec round ${every === 1 ? 'every round' : `every ${B(every)} rounds`}, ${B(decs)} times in all.`, count: sts((cur = top - 2 * decs)) });
		}
		sl.push({ text: `Knit until the sleeve measures ${len(sleeveBody)} from the underarm.` });
	} else {
		// Balloon and puff sleeves: follow the 3D outline with evenly spaced increases / decreases.
		const every = Math.max(2, rowsOf(3 * Math.sqrt(k)));
		let last = 0;
		for (let r = 0; r <= sleeveRows; r += every) {
			const want = toMult(sleeveAt(r / rowPerCm, top), 2);
			const change = Math.abs(want - cur) >= Math.max(4, cur * 0.06);
			if (!change) continue;
			const to = Math.max(Math.ceil(cur / 2), want);
			if (r > last) sl.push({ text: `Knit ${B(r - last)} round${r - last > 1 ? 's' : ''}.` });
			sl.push({ text: `Next round: ${evenly(cur, to)}.`, count: sts(to) });
			cur = to;
			last = r + 1;
		}
		sl.push({ text: `Knit until the sleeve measures ${len(sleeveBody)} from the underarm.` });
	}
	const sleeveEndSts = cur;
	// Cuff: rib draws in a little more than plain fabric.
	const cuffRib = ribOf(d.sleeveRib);
	const ribbedCuff = d.cuffFinish === 'Ribbed';
	let cuffSts = Math.max(Math.ceil(cur / 2), Math.round(((top * m.cuffR) / m.armR(l0)) * (ribbedCuff && d.sleeveRib !== 'Stockinette' ? 0.9 : 1)));
	if (ribbedCuff) cuffSts = fitTo(cuffSts, cuffRib.rep);
	if (Math.abs(cuffSts - cur) >= 2 || (ribbedCuff && cuffSts !== cur)) sl.push({ text: `Cuff set-up round: ${evenly(cur, cuffSts)}.`, count: sts(cuffSts) });
	else cuffSts = cur;
	sl.push(...edgeSteps(d.cuffFinish, d.sleeveRib, m.cuffLen, cuffSts, false, k));
	sl.push({ text: `Work the second sleeve the same way.` });
	sections.push({ id: 'sleeves', title: 'Sleeves', steps: sl });

	// ── Neckband ──
	const nk: Step[] = [];
	const neckRib = ribOf(d.neckRib);
	const edgeV = Math.round(0.75 * neckRows); // pick up 3 sts for every 4 rows along a shaped edge
	let neckband = 0;
	if (cardigan) {
		const pick = castOn + 2 * edgeV + 2 * neckCo;
		neckband = d.neckline === 'I-cord' ? pick : fitTo(pick, neckRib.rep);
		nk.push({ text: `With RS facing and the smaller needle, start at the right front neck edge and pick up and knit about ${sts(pick)} around the neck: 1 st in every cast-on st and 3 sts for every 4 rows along the shaped edges.` });
		if (d.neckline === 'I-cord') nk.push(...edgeSteps('I-cord', d.neckRib, 0, pick, true, k));
		else {
			if (neckband !== pick) nk.push({ text: `Next row (WS): ${evenly(pick, neckband)}.`, count: sts(neckband) });
			nk.push({ text: `Work in ${neckRib.name} (RS: ${neckRib.work}; WS: work sts as they appear) for ${len(m.collarH)}. Bind off loosely in pattern.` });
		}
	} else if (d.neckline === 'I-cord') {
		neckband = castOn + (vNeck ? 2 * edgeV + 2 * neckCo : 0);
		nk.push({ text: `With RS facing, start at centre back and pick up and knit 1 st in every cast-on st around the neck.`, count: sts(neckband) });
		nk.push(...edgeSteps('I-cord', d.neckRib, 0, neckband, false, k));
	} else if (vNeck) {
		const pick = castOn - 4 + 2 * edgeV + 2 * neckCo + 1;
		neckband = pick;
		nk.push({
			text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st, 3 sts for every 4 rows down each side of the V, and 1 st at the point of the V (mark this centre st).`,
			count: `about ${sts(pick)}`
		});
		nk.push({ text: `Every round: work in ${neckRib.name} to 1 st before the centre st, s2kp (centre double decrease), work in rib to end. Line the rib up so it is the same on both sides of the centre st.` });
		nk.push({ text: `Continue until the band measures ${len(m.collarH)}. Bind off loosely in pattern.` });
	} else {
		const pick = castOn;
		neckband = fitTo(pick, neckRib.rep);
		const what = d.neckline === 'Turtleneck' ? 'turtleneck' : d.neckline === 'Mock neck' ? 'mock neck' : 'neckband';
		nk.push({ text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st around the neck.`, count: sts(pick) });
		if (neckband !== pick) nk.push({ text: `Next round: ${evenly(pick, neckband)}.`, count: sts(neckband) });
		nk.push({ text: `Work in ${neckRib.name} (${neckRib.work}) until the ${what} measures ${len(m.collarH)}.${d.neckline === 'Turtleneck' ? ' Change to the main needle halfway so the collar folds over easily.' : ''}` });
		nk.push({ text: `Bind off loosely in pattern, using a stretchy bind-off so it fits over the head.` });
	}
	sections.push({ id: 'neck', title: d.neckline === 'Turtleneck' || d.neckline === 'Mock neck' ? 'Collar' : 'Neckband', steps: nk });

	// ── Cardigan front bands ──
	let buttons = 0;
	let buttonMm = 0;
	if (cardigan) {
		const bandRib = ribOf(d.bodyRib);
		const edgeCm = m.L - m.dropF + m.collarH;
		const pick = fitTo(Math.round(stsOf(edgeCm)), bandRib.rep);
		const bandCm = band / stPerCm;
		const yTop = m.L - m.dropF + 1.2 * k;
		buttons = Math.max(3, Math.round(yTop / (8.5 * Math.sqrt(k))));
		buttonMm = Math.round(19 * Math.sqrt(k));
		const holes = Array.from({ length: buttons }, (_, b) => Math.max(2, Math.round(((2.5 * k + ((yTop - 2.9 * k) * b) / (buttons - 1)) / edgeCm) * pick)));
		const fb: Step[] = [];
		fb.push({ text: `Button band: with RS facing and the smaller needle, pick up and knit ${sts(pick)} along one front edge, from the top of the neckband down to the hem (about 3 sts for every 4 rows).`, count: sts(pick) });
		fb.push({ text: `Work in ${bandRib.name} (RS: ${bandRib.work}; WS: work sts as they appear) for ${len(bandCm)}. Bind off loosely in pattern.` });
		fb.push({ text: `Buttonhole band: pick up ${sts(pick)} along the other front edge, from the hem up to the top of the neckband. Work in rib as for the button band until it measures ${len(bandCm / 2)}.` });
		fb.push({
			text: `Buttonhole row (RS): make ${B(buttons)} buttonholes, each ${buttonMm > 15 ? 'by binding off 2 sts (cast them back on over the gap on the next row)' : 'with a yo, k2tog'}, at sts ${holes.map((h) => B(h)).join(', ')} counted from the hem. Work the rest of the row in rib.`
		});
		fb.push({ text: `Continue in rib until the band matches the button band. Bind off loosely in pattern.` });
		sections.push({ id: 'bands', title: 'Front bands', steps: fb });
	}

	// ── Finishing ──
	sections.push({
		id: 'finishing',
		title: 'Finishing',
		steps: [
			{ text: `Use the yarn tails to close any small gaps at the underarms. Weave in all ends.` },
			{ text: `Wet block: soak, squeeze out the water, and lay flat to the finished measurements to dry.${cardigan ? ` Sew the ${B(buttons)} buttons to the button band opposite the buttonholes.` : ''}` }
		]
	});

	// ── Front matter ──
	const yarn = est.yarn;
	const circ = chestCm > 70 ? '80 cm (32 in)' : chestCm > 48 ? '60 cm (24 in)' : '40 cm (16 in)';
	const materials: [string, string][] = [
		[
			'Yarn',
			`${yarn.label} weight. Main colour: about ${est.mainYards} yd (${Math.round(est.mainYards * 0.9144)} m), ${est.mainSkeins} × ${yarn.yardage} yd skeins` +
				(est.contrastYards ? `. Contrast colour: about ${est.contrastYards} yd (${Math.round(est.contrastYards * 0.9144)} m), ${est.contrastSkeins} skein${est.contrastSkeins > 1 ? 's' : ''}` : '')
		],
		['Main needle', `${yarn.needle} circular, ${circ} long, plus DPNs or a long circular for magic loop (sleeves)`],
		['Smaller needle', `${RIB_NEEDLE[yarn.gauge] ?? 'two sizes smaller than the main needle'}, for ribbing and bands`],
		['Notions', `4 stitch markers plus 1 in a different colour (BOR), waste yarn, tapestry needle${cardigan ? `, ${buttons} buttons about ${buttonMm} mm across` : ''}`]
	];
	const measurements: [string, string][] = [
		['Chest', len((bodySts + band) / stPerCm)],
		['Length, back neck to hem', len(m.L)],
		['Yoke depth at centre back', len(Ry / rowPerCm)],
		['Upper arm', len(top / stPerCm)],
		['Sleeve length from underarm', len(sleeveBody + m.cuffLen)],
		['Cuff', len(cuffSts / stPerCm)]
	];
	const abbreviations: [string, string][] = [
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
	if (srPairs) abbreviations.push(['MDS', 'make double stitch (German short rows): slip 1 purlwise with yarn in front, pull the yarn over the needle to the back so the st shows two legs']);
	if (vNeck) abbreviations.push(['s2kp', 'slip 2 together knitwise, k1, pass the 2 slipped sts over (2 sts decreased, centred)']);
	if (cardigan && buttonMm <= 15) abbreviations.push(['yo', 'yarn over']);

	const wearer = d.wearer === 'Adult' ? '' : `${d.wearer} `;
	return {
		ok: true,
		title: `${wearer}${d.neckline} raglan ${d.garment.toLowerCase()}, size ${d.size}`,
		level: est.level,
		materials,
		gauge: `${yarn.gauge} sts and ${rowGauge} ${cardigan ? 'rows' : 'rounds'} = 10 cm (4 in) in stockinette on the main needle, after blocking. Knit a swatch and change needle size if needed: the stitch counts depend on matching the stitch gauge.`,
		measurements,
		abbreviations,
		sections,
		chart: fairIsle ? Array.from({ length: TILE_ROWS }, (_, j) => Array.from({ length: TILE_ST }, (_, i) => chart('Fair isle', i, j))) : null,
		counts: {
			castOn,
			back0: B0,
			front0: F0,
			sleeve0: S0,
			underarm: u,
			back,
			front,
			sleeve,
			bodySts,
			upperSts: top,
			sleeveEndSts,
			cuffSts,
			hemSts: bodySts,
			neckbandSts: neckband,
			band,
			neckPerSide,
			shortRowPairs: srPairs,
			yokeRows: Ry,
			yokeRowsPlanned,
			incRows: a,
			incSlots
		}
	};
}

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
	out.push('ABBREVIATIONS', ...p.abbreviations.map(([a, b]) => `${a}: ${b}`));
	return out.join('\n');
}
