import { measure, type Design } from './garment';
import { tileFor } from './motifs';
import {
	BASE_ABBREVIATIONS,
	B,
	MDS_ABBREVIATION,
	SLEEVES_INTRO,
	TIPS,
	bandsSection,
	bodySection,
	cap,
	chartOf,
	colourSection,
	edgeSteps,
	ellipse,
	estimate,
	evenly,
	finishingSection,
	fitTo,
	isColourwork,
	gaugeText,
	lcm,
	len,
	materialsOf,
	ribOf,
	scale,
	sleeveTail,
	sts,
	toMult,
	type Counts,
	type Measures,
	type Pattern,
	type PatternSection,
	type Step,
	type Tally
} from './patternKit';
import { writeSetIn } from './setin';

export { estimate, isColourwork, len, patternText } from './patternKit';
export type { Counts, Pattern, PatternSection, SetInCounts, Step, Tally } from './patternKit';

/**
 * Turns a design into a written, top-down knitting pattern: raglan here, set-in sleeves in `setin.ts`.
 *
 * Every measurement comes from `measure()`, so the pattern describes the garment the 3D view shows.
 */
export function writePattern(d: Design): Pattern {
	const m = measure(d);
	// A slipover has no sleeves for a raglan to feed, so it is always worked with the set-in shoulders.
	return m.raglan ? writeRaglan(d, m) : writeSetIn(d, m);
}

// ── The raglan pattern ──────────────────────────────────────────────────
type Kind = 'all' | 'body' | 'sleeve' | 'plain';
type Row = { flat: boolean; rs: boolean; kind: Kind; neck: boolean; co: number };

function writeRaglan(d: Design, m: Measures): Pattern {
	const { k, stPerCm, rowPerCm } = m;
	const cardigan = d.garment === 'Cardigan';
	const vNeck = d.neckline === 'V-neck';
	const fairIsle = isColourwork(d.pattern);
	const slits = !cardigan && m.slitH > 0;
	const tile = tileFor(d.pattern, m.gauge);
	const { rowsOf, stsOf } = scale(m);

	// ── Finished circumferences (cm) ──
	const chestCm = m.chest;
	const neckCm = ellipse(m.N, m.Nd);
	const upperArmCm = m.upperArm;
	const sleeveBody = m.sleeveBody; // underarm to start of cuff

	// ── Starting counts ──
	const hemRib = ribOf(d.bodyRib);
	const hemRep = d.hemFinish === 'Ribbed' ? hemRib.rep : 1;
	const bodyMult = lcm(4, cardigan ? 1 : slits ? 2 * hemRep : hemRep, fairIsle ? tile.st : 1);
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
		const word: Tally['unit'] = flat ? 'Row' : 'Round';
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
			const tally: Tally = { unit: word, first, rows: rows.slice(i, i + span).map((r) => cap(label(r))) };
			for (let x = i; x < i + span; x++) apply(rows[x]);
			// Between the two cardigan cast-on rows the fronts differ, so show only the total there.
			const lopsided = rows[i + span - 1].co > 0 && !rows[i + span - 1].rs;
			out.push({ text: text.replace(/: (\w)/, (_, c) => `: ${c.toUpperCase()}`), count: lopsided ? sts(front + back + 2 * sleeve) : countText(flat), tally, adds: span / rowPerCm });
			i += span;
		}
		return out;
	};

	const est = estimate(d);
	const sections: PatternSection[] = [];
	const R = cardigan ? 'row' : 'round';

	// ── Colourwork notes ──
	const colourNotes = colourSection(d, m, { flat: cardigan, start: 'the neck shaping is done', yoke: 'yoke', grow: 'new yoke increases' });
	if (colourNotes) sections.push(colourNotes);

	// ── Yoke ──
	const yoke: Step[] = [];
	const markers = 'markers (pm)';
	if (cardigan || vNeck)
		yoke.push({
			text: `With the main needle, cast on ${sts(2)} (front), pm, ${sts(S0)} (sleeve), pm, ${sts(B0)} (back), pm, ${sts(S0)} (sleeve), pm, ${sts(2)} (front). Do not join; work back and forth.`,
			count: sts(castOn),
			tip: `A long-tail cast-on works well. You start by working back and forth in rows, because the front of the neck sits lower than the back; the two front edges grow ${cardigan ? 'towards the centre' : 'towards each other until they meet'}. The right side (RS) is the smooth outside of the sweater, the wrong side (WS) is the bumpy inside.`
		});
	else
		yoke.push({
			text: `With the main needle, cast on ${sts(castOn)} loosely. Join to work in the round without twisting. Set up the ${markers}: k${B0 / 2} (half the back), pm, k${S0} (sleeve), pm, k${F0} (front), pm, k${S0} (sleeve), pm, k${B0 / 2} (rest of the back). Place a different marker for the beginning of round (BOR) at centre back.`,
			count: `${B(F0)} front, ${B(B0)} back, ${B(S0)} each sleeve`,
			tip: `A long-tail cast-on works well. Cast on over a needle one size bigger so the neck stretches over a head. Before you join, lay the needle flat and check that the cast-on edge is not twisted around it: the bottom of every stitch should point to the middle of the circle. There are too few stitches to reach around the long needle at first, so use magic loop (or a 40 cm needle) until the yoke has grown.`
		});
	yoke.push({
		text: `Raglan inc ${cardigan ? 'row (RS)' : vNeck ? 'row (RS) or round' : 'round'}: *knit to 1 st before marker, M1R, k1, sm, k1, M1L; rep from * 3 more times, knit to end. 8 sts increased.`,
		note: true,
		tip: `This is a recipe you will use in the steps below, not a step of its own. Every marker gets one new stitch on each side of it. Those pairs of increases draw the four diagonal raglan lines from the neck to the underarms.`
	});
	if (rows.some((r) => r.kind === 'body'))
		yoke.push({
			note: true,
			text: `Body inc ${cardigan ? 'row (RS)' : 'round'}: increases on the back and front only. *Knit to 1 st before marker, M1R, k1, sm, knit to next marker, sm, k1, M1L; rep from * once more, knit to end. 4 sts increased.`,
			tip: `Another recipe. It is used near the end of the yoke, once the sleeves are wide enough but the body still needs to grow.`
		});
	if (rows.some((r) => r.kind === 'sleeve'))
		yoke.push({
			note: true,
			text: `Sleeve inc ${cardigan ? 'row (RS)' : 'round'}: increases on the sleeves only. *Knit to marker, sm, k1, M1L, knit to 1 st before next marker, M1R, k1, sm; rep from * once more, knit to end. 4 sts increased.`,
			tip: `Another recipe. It is used near the end of the yoke, once the body is wide enough but the sleeves still need to grow.`
		});
	if (neckRows)
		yoke.push({
			note: true,
			tip: `These extra increases at the two front edges slowly bring the fronts ${cardigan ? 'towards the centre' : 'together'} to shape the neckline.`,
			text: `Neck incs: on rows marked "with neck incs", start the row with k1, M1L and end it with M1R, k1 (instead of knitting the last st). 2 more sts increased. A "neck inc row" has only these.`
		});

	if (srPairs) {
		const t = Math.max(1, Math.round(F0 * 0.06));
		const step = srPairs > 1 ? Math.min(4, Math.max(1, Math.floor((F0 / 2 - 2 - t) / (srPairs - 1)))) : 0;
		yoke.push({
			text: `Raise the back neck with German short rows (no increases yet). Short row 1 (RS): knit across the back and sleeve to the front marker, sm, k${t}, turn. Short row 2 (WS): make a double stitch (MDS), purl back across the sleeve, the back (past BOR) and the other sleeve to the other front marker, sm, p${t}, turn.`,
			tip: `Short rows are part-rows: you turn around before the end, which adds height at the back of the neck only, so the sweater does not ride up at your throat. On a first sweater you can skip all the short-row steps and go straight to Round 1. The stitch counts stay the same; the neck just sits a little higher at the front.`
		});
		if (srPairs > 1)
			yoke.push({
				text: `Short rows 3–${srRows}: MDS, work to the double stitch, work it as one st, then ${step} more st${step > 1 ? 's' : ''}, turn. (Knit on RS rows, purl on WS rows.) ${srPairs - 1 > 1 ? `Work ${srPairs - 1} more pairs of short rows.` : 'Work 1 more pair.'}`
			});
		yoke.push({ text: `Next row (RS): MDS, knit to BOR, working each double stitch as one st. From now on work in rounds; work the last double stitch as one st when you reach it.` });
	}

	if (cardigan) {
		yoke.push({ text: `Shape the front neck:`, note: true });
		yoke.push(...schedule(0, neckRows, true));
		yoke.push({ text: `Continue the raglan, working flat:`, note: true });
		yoke.push(...schedule(neckRows, Ry, true, 0));
	} else if (vNeck) {
		yoke.push({ text: `Shape the V-neck, working flat:`, note: true });
		yoke.push(...schedule(0, neckRows, true));
		const join = 2 * neckCo;
		yoke.push({
			text: `Join: ${join ? `cast on ${sts(join / 2)}, pm for BOR, cast on ${sts(join / 2)}` : 'pm for BOR'}, then join to the first st to work in the round. BOR is at centre front.`,
			count: ((front += join), countText(false)),
			tip: `From here on you knit in circles instead of back and forth, so every round is knit: no more purl rows. Check that the work is not twisted before you join.`
		});
		yoke.push({ text: `Continue in the round:`, note: true });
		yoke.push(...schedule(neckRows, Ry, false));
	} else yoke.push(...schedule(srRows, Ry, false));
	if (Ry > yokeRowsPlanned)
		yoke.push({ note: true, text: `The yoke needs a few extra ${R}s to fit all the increases, so it measures about ${len(Ry / rowPerCm)} at centre back instead of ${len(yokeRowsPlanned / rowPerCm)}.` });
	yoke.push({
		text: `Divide ${cardigan ? 'row (RS)' : 'round'}: *knit to the next sleeve marker, remove it, slip the ${sts(sleeve)} of the sleeve to waste yarn, remove the next marker, cast on ${sts(u / 2)}, pm (side), cast on ${sts(u / 2)}; rep from * once more, knit to end.`,
		count: sts(front + back + 2 * u),
		tip: `This is where it starts to look like a sweater. Thread waste yarn onto the tapestry needle, run it through the sleeve stitches and slide them off the needle; they wait there until you knit the sleeves. Cast on the underarm stitches with a backward loop. Then try it on: the yoke should reach your underarms comfortably.`
	});
	const firstTally = yoke.find((s) => s.tally);
	if (firstTally) firstTally.tip = `Tick off each ${R} as you finish it, so you always know which kind comes next. When the step is done, count your stitches against the numbers below it. If one section is a stitch short, add an increase there on the next ${R}.`;
	sections.push({
		id: 'yoke',
		title: 'Yoke',
		intro: `The yoke is everything from the neck down to the underarms. You start with a small ${cardigan || vNeck ? 'strip' : 'ring'} of stitches at the neck and keep adding stitches along four diagonal lines until it is wide enough to go around the chest and both arms. The markers show where those lines are.`,
		steps: yoke
	});

	// ── Body ──
	const bodySts = front + back + 2 * u;
	sections.push(bodySection(d, m, bodySts, `The sleeve stitches wait on waste yarn while you knit the body ${cardigan ? 'straight down' : 'as one plain tube'} to the hem. No shaping, no counting.`));

	// ── Sleeves ──
	const sl: Step[] = [];
	const top = sleeve + u;
	sl.push({
		text: `Move the ${sts(sleeve)} of one sleeve to the shorter needle (or DPNs / magic loop). Starting at the centre of the underarm cast-on, pick up and knit ${sts(u / 2)}, knit the sleeve sts, pick up and knit ${sts(u / 2)} from the rest of the cast-on. Pm for BOR.`,
		count: sts(top),
		tip: `A sleeve is too narrow to stretch around the long needle, so use magic loop, double-pointed needles or a short circular needle. Slide the waiting stitches from the waste yarn back onto the needle first. ${TIPS.pickUp} Small holes at the corners of the underarm are normal; you close them with a yarn tail at the end.`
	});
	const { sleeveEndSts, cuffSts } = sleeveTail(d, m, top, sl);
	sections.push({ id: 'sleeves', title: 'Sleeves', intro: SLEEVES_INTRO, steps: sl, twice: ['First sleeve', 'Second sleeve'] });

	// ── Neckband ──
	const nk: Step[] = [];
	const neckRib = ribOf(d.neckRib);
	const edgeV = Math.round(0.75 * neckRows); // pick up 3 sts for every 4 rows along a shaped edge
	const neckTip = `${TIPS.pickUp} Go under both strands of each cast-on stitch.${neckRows ? ' “3 for every 4 rows” means: pick up a stitch in three row ends, then skip one.' : ''}`;
	let neckband = 0;
	if (cardigan) {
		const pick = castOn + 2 * edgeV + 2 * neckCo;
		neckband = d.neckline === 'I-cord' ? pick : fitTo(pick, neckRib.rep);
		nk.push({ text: `With RS facing and the smaller needle, start at the right front neck edge and pick up and knit about ${sts(pick)} around the neck: 1 st in every cast-on st and 3 sts for every 4 rows along the shaped edges.`, tip: neckTip });
		if (d.neckline === 'I-cord') nk.push(...edgeSteps('I-cord', d.neckRib, 0, pick, true, k));
		else {
			if (neckband !== pick) nk.push({ text: `Next row (WS): ${evenly(pick, neckband)}.`, count: sts(neckband) });
			nk.push({ text: `Work in ${neckRib.name} (RS: ${neckRib.work}; WS: work sts as they appear) for ${len(m.collarH)}. Bind off loosely in pattern.`, adds: m.collarH });
		}
	} else if (d.neckline === 'I-cord') {
		neckband = castOn + (vNeck ? 2 * edgeV + 2 * neckCo : 0);
		nk.push({ text: `With RS facing, start at centre back and pick up and knit 1 st in every cast-on st around the neck.`, count: sts(neckband), tip: neckTip });
		nk.push(...edgeSteps('I-cord', d.neckRib, 0, neckband, false, k));
	} else if (vNeck) {
		const pick = castOn - 4 + 2 * edgeV + 2 * neckCo + 1;
		neckband = pick;
		nk.push({
			text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st, 3 sts for every 4 rows down each side of the V, and 1 st at the point of the V (mark this centre st).`,
			count: `about ${sts(pick)}`,
			tip: neckTip
		});
		nk.push({ text: `Every round: work in ${neckRib.name} to 1 st before the centre st, s2kp (centre double decrease), work in rib to end. Line the rib up so it is the same on both sides of the centre st.` });
		nk.push({ text: `Continue until the band measures ${len(m.collarH)}. Bind off loosely in pattern.`, adds: m.collarH });
	} else {
		const pick = castOn;
		neckband = fitTo(pick, neckRib.rep);
		const what = d.neckline === 'Turtleneck' ? 'turtleneck' : d.neckline === 'Mock neck' ? 'mock neck' : 'neckband';
		nk.push({ text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st around the neck.`, count: sts(pick), tip: neckTip });
		if (neckband !== pick) nk.push({ text: `Next round: ${evenly(pick, neckband)}.`, count: sts(neckband), tip: TIPS.evenly });
		nk.push({ text: `Work in ${neckRib.name} (${neckRib.work}) until the ${what} measures ${len(m.collarH)}.${d.neckline === 'Turtleneck' ? ' Change to the main needle halfway so the collar folds over easily.' : ''}`, adds: m.collarH });
		nk.push({ text: `Bind off loosely in pattern, using a stretchy bind-off so it fits over the head.`, tip: `Before you cut the yarn, check that the neck goes over your head. If it is tight, undo the bind-off and work it more loosely.` });
	}
	sections.push({
		id: 'neck',
		title: d.neckline === 'Turtleneck' || d.neckline === 'Mock neck' ? 'Collar' : 'Neckband',
		intro: `The neck edge is finished last: you pick up stitches around the opening you cast on at the very start and knit a band upwards from it.`,
		steps: nk
	});

	// ── Cardigan front bands ──
	let buttons = 0;
	let buttonMm = 0;
	if (cardigan) {
		const bands = bandsSection(d, m, band);
		buttons = bands.buttons;
		buttonMm = bands.buttonMm;
		sections.push(bands.section);
	}

	// ── Finishing ──
	sections.push(finishingSection(cardigan, buttons));

	// ── Front matter ──
	const notions = `4 stitch markers plus 1 in a different colour (BOR), waste yarn, tapestry needle${cardigan ? `, ${buttons} buttons about ${buttonMm} mm across` : ''}`;
	const measurements: [string, string][] = [
		['Chest', len((bodySts + band) / stPerCm)],
		['Length, back neck to hem', len(m.L)],
		['Yoke depth at centre back', len(Ry / rowPerCm)],
		['Upper arm', len(top / stPerCm)],
		['Sleeve length from underarm', len(sleeveBody + m.cuffLen)],
		['Cuff', len(cuffSts / stPerCm)]
	];
	const abbreviations: [string, string][] = [...BASE_ABBREVIATIONS];
	if (srPairs) abbreviations.push(MDS_ABBREVIATION);
	if (vNeck) abbreviations.push(['s2kp', 'slip 2 together knitwise, k1, pass the 2 slipped sts over (2 sts decreased, centred)']);
	if (cardigan && buttonMm <= 15) abbreviations.push(['yo', 'yarn over']);

	const custom = d.size === 'Custom';
	const wearer = custom || d.wearer === 'Adult' ? '' : `${d.wearer} `;
	return {
		ok: true,
		construction: 'Raglan',
		sleeveless: false,
		title: `${wearer}${d.neckline} raglan ${d.garment.toLowerCase()}, ${custom ? 'custom fit' : `size ${d.size}`}`,
		level: est.level,
		materials: materialsOf(d, m, notions),
		gauge: gaugeText(m, cardigan),
		measurements,
		abbreviations,
		sections,
		...chartOf(d, m.gauge),
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
