import type { Design } from './garment';
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
	type Measures,
	type Pattern,
	type PatternSection,
	type Step,
	type Tally
} from './patternKit';

/**
 * A top-down, seamless set-in sleeve pattern.
 *
 * The back is cast on across the shoulders and worked flat down to the underarm. The two front
 * straps are picked up along the shoulder cast-on edge and worked down to the underarm, joining at
 * the neck (or not, on a cardigan). Back and front are then joined with an underarm cast-on, the body
 * is worked down to the hem, and each sleeve is picked up around its armhole, with a short-row cap,
 * and knit down to the cuff. There is nothing to sew.
 *
 * Which hand is which: rows are worked with the right side facing, from the right to the left as seen
 * from the front (so from the wearer's left to right on the front, right to left on the back). The two
 * front straps are mirror images, so their rows run the opposite way round and are written out for
 * each strap.
 */

type Hand = 'left' | 'right';
type RowKind = 'short' | 'return' | 'full';
/** One row of a front strap. */
type StrapRow = { i: number; rs: boolean; kind: RowKind; x: number; ds: boolean; neck: boolean; arm: boolean; co: number };

/** n evenly spread picks from a list (n <= list.length, so all distinct). */
const spread = <T>(n: number, list: T[]): T[] => (n <= 0 ? [] : Array.from({ length: n }, (_, j) => list[Math.min(list.length - 1, Math.floor(((j + 0.5) * list.length) / n))]));
/** "**3**, **5** and **8**" */
const list = (ns: number[]) => (ns.length < 2 ? ns.map(B).join('') : `${ns.slice(0, -1).map(B).join(', ')} and ${B(ns[ns.length - 1])}`);
const range = (from: number, to: number, by = 1) => {
	const out: number[] = [];
	for (let i = from; i <= to; i += by) out.push(i);
	return out;
};

/**
 * Compress a run of rows into "Rows 30–45: inc row, purl row, knit row, purl row; work these 4 rows 4 times."
 * `countAfter(j)` is the stitch count once the row with index j (in `labels`) is done.
 */
function runs(labels: string[], first: number, unit: Tally['unit'], countAfter: (j: number) => string, adds: (rows: number) => number): Step[] {
	const out: Step[] = [];
	const word = unit.toLowerCase();
	let i = 0;
	while (i < labels.length) {
		let best = { n: 1, reps: 1 };
		for (let n = 1; n <= 8; n++) {
			let reps = 1;
			while (i + (reps + 1) * n <= labels.length && labels.slice(i + reps * n, i + (reps + 1) * n).every((l, x) => l === labels[i + x])) reps++;
			if (reps > 1 && n * reps > best.n * best.reps) best = { n, reps };
		}
		const { n, reps } = best;
		const span = n * reps;
		const part = labels.slice(i, i + n);
		const at = first + i;
		const rangeText = span === 1 ? `${unit} ${at}` : `${unit}s ${at}–${at + span - 1}`;
		const body = reps > 1 ? `${part.join(', ')}${n > 1 ? `; work these ${n} ${word}s ${reps} times` : ` × ${reps}`}` : part.join(', ');
		out.push({
			text: `${rangeText}: ${cap(body)}.`,
			count: countAfter(i + span - 1),
			tally: { unit, first: at, rows: labels.slice(i, i + span).map(cap) },
			adds: adds(span)
		});
		i += span;
	}
	return out;
}

export function writeSetIn(d: Design, m: Measures): Pattern {
	const { k, stPerCm, rowPerCm } = m;
	const { rowsOf, stsOf } = scale(m);
	const cardigan = d.garment === 'Cardigan';
	const vNeck = d.neckline === 'V-neck';
	const fairIsle = isColourwork(d.pattern);
	const tile = tileFor(d.pattern, m.gauge);
	const slits = !cardigan && m.slitH > 0;
	const R = cardigan ? 'row' : 'round';
	const slip = !m.hasSleeves; // a slipover: no sleeves, a rolled edge round each armhole instead

	// ── Stitch counts ──
	const hemRib = ribOf(d.bodyRib);
	const hemRep = d.hemFinish === 'Ribbed' ? hemRib.rep : 1;
	const bodyMult = lcm(4, cardigan ? 1 : slits ? 2 * hemRep : hemRep, fairIsle ? tile.st : 1);
	const bodySts = toMult(stsOf(m.chest), bodyMult);
	const u = toMult(stsOf(0.04 * m.chest), 2); // underarm cast-on, per underarm
	// The back neck opening, in sts across the cast-on edge.
	const bn = Math.max(cardigan ? 8 : 6, Math.min(toMult(stsOf(2 * m.N), 2), (bodySts - 2 * u) / 2 - 4));
	// Cardigan fronts stop half a band short of centre; the bands overlap there.
	const band = cardigan ? Math.max(4, Math.min(toMult(stsOf(3.4 * Math.sqrt(k)), 4), Math.floor((bn - 4) / 4) * 4)) : 0;
	const back = (bodySts - 2 * u + band) / 2; // back sts at the underarm
	const front = back - band; // both fronts together
	// Each shoulder: a strap of sts either side of the neck, and the armhole edge widens below it.
	const half = (back - bn) / 2;
	const strap = Math.max(2, Math.min(Math.round(stsOf(m.S - m.N)), half));
	const ai = half - strap; // increases at each armhole edge
	let top = toMult(stsOf(m.upperArm), 2); // sleeve sts at the armhole (a slipover: sts picked up around the armhole)
	const castOn = back - 2 * ai;

	// ── Row plan ──
	const slopeRows = rowsOf(m.L - m.ys);
	const T = Math.max(1, Math.min(strap, Math.round(slopeRows / 2))); // pairs of short rows per shoulder
	// x sts left unworked at the armhole end of each short row, growing towards the neck.
	const xBack = range(1, T).map((p) => Math.round((p * strap) / T));
	const xFront = xBack.map((x) => Math.min(x, strap - 1));
	const armTotal = 2 * Math.round(rowsOf(m.ys - m.ya) / 2); // rows at the armhole edge, shoulder to underarm
	if (slip) top = u + 2 * Math.max(2, Math.round(0.75 * armTotal)); // 3 sts for every 4 rows up and down the armhole edge
	const plain = Math.max(armTotal - 2 * T - 2, 2 * ai, 2); // rows across the full width after the shoulders (even)
	const backRows = 4 * T + 2 + plain;
	const frontRows = 4 * T + 1 + plain; // the front starts with a WS row, so it has an odd number
	// Armhole increases in the last `plain` rows: RS rows only.
	const backInc = new Set(spread(ai, range(4 * T + 3, backRows - 1, 2)));
	const frontInc = new Set(spread(ai, range(4 * T + 2, 4 * T + plain, 2)));

	// Front neck. The straps join (or not) on RS row J, a few rows below the shoulder.
	const J = Math.min(frontRows - 1, Math.max(2 * T + 2, 2 * Math.round(rowsOf(m.dropF) / 2)));
	const wantInc = cardigan ? (bn - band) / 2 : vNeck ? (bn - 2) / 2 : Math.max(1, Math.round(bn / 4));
	const neckRs = range(2, J - 2, 2);
	const nInc = Math.min(wantInc, neckRs.length);
	const neckInc = new Set(spread(nInc, neckRs));
	const neckCo = cardigan ? wantInc - nInc : 0; // cardigan: extra sts cast on at each front edge
	const centre = cardigan ? 0 : bn - 2 * nInc; // pullover: sts cast on between the straps

	const sections: PatternSection[] = [];
	const colour = colourSection(d, m, { flat: cardigan, start: 'the neck shaping is done', yoke: 'back and front', grow: 'new armhole increases' });
	if (colour) sections.push(colour);

	// ── Back ──
	const back0: Step[] = [];
	const incRecipe = `Armhole inc row (RS): k1, M1L, knit to the last st, M1R, k1. 2 sts increased.`;
	const addsOf = (rows: number) => rows / rowPerCm;
	back0.push({
		text: `With the main needle, cast on ${sts(castOn)} loosely: ${sts(strap)} for each shoulder strap and ${sts(bn)} for the back of the neck. Do not join; work back and forth. The first row is a RS row.`,
		count: sts(castOn),
		tip: `A long-tail cast-on works well. You knit the back first, from the shoulders down. The cast-on edge is the top of the sweater: the shoulders, and the back of the neck between them. The right side (RS) is the smooth outside, the wrong side (WS) is the bumpy inside.`
	});
	back0.push({ text: incRecipe, note: true, tip: `A recipe for a later step. The two increases widen the back at the armholes, so it grows from the width of your shoulders to the width of your chest.` });
	const rowsRight: string[] = [];
	for (let p = 1; p <= T; p++) rowsRight.push(`Short row (RS): knit to the last ${xBack[p - 1]} sts, turn`, `Short row (WS): MDS, purl to the end`);
	const rowsLeft: string[] = [];
	for (let p = 1; p <= T; p++) rowsLeft.push(`Short row (WS): purl to the last ${xBack[p - 1]} sts, turn`, `Short row (RS): MDS, knit to the end`);
	back0.push({
		text: `Slope the shoulders with German short rows: they make the back neck sit higher than the shoulder points. First the shoulder at the end of the RS rows (the wearer's left). Work ${T} pairs of rows (${2 * T} rows): on each RS row knit to the last X sts, turn; on each WS row MDS, purl to the end. X is ${list(xBack)} for the successive pairs.`,
		tally: { unit: 'Row', first: 1, rows: rowsRight },
		count: sts(castOn),
		adds: addsOf(2 * T),
		tip: `Short rows are part-rows: you turn around before the end, which adds height at the neck but not at the shoulder point. “MDS” makes a double stitch: after you turn, slip the first stitch purlwise with the yarn in front, then pull the yarn over the needle to the back. The stitch now shows two legs; you knit or purl them together as one stitch later. The stitch counts do not change.`
	});
	back0.push({ text: `Row ${2 * T + 1} (RS): knit across all sts, working each double stitch as one st.`, count: sts(castOn), adds: addsOf(1) });
	back0.push({
		text: `Now slope the shoulder at the start of the RS rows (the wearer's right). Work ${T} pairs of rows (${2 * T} rows): on each WS row purl to the last X sts, turn; on each RS row MDS, knit to the end. X is ${list(xBack)} for the successive pairs.`,
		tally: { unit: 'Row', first: 2 * T + 2, rows: rowsLeft },
		count: sts(castOn),
		adds: addsOf(2 * T)
	});
	back0.push({ text: `Row ${4 * T + 2} (WS): purl across all sts, working each double stitch as one st.`, count: sts(castOn), adds: addsOf(1) });
	{
		const labels = range(4 * T + 3, backRows).map((i) => (i % 2 === 1 ? (backInc.has(i) ? 'armhole inc row' : 'knit row') : 'purl row'));
		let w = castOn;
		const after = labels.map((l) => (l === 'armhole inc row' ? (w += 2) : w));
		back0.push(...runs(labels, 4 * T + 3, 'Row', (j) => sts(after[j]), addsOf));
	}
	back0.push({
		text: `Leave the ${sts(back)} of the back on hold (waste yarn, or a spare circular needle). The back is ${backRows} rows long, about ${len(backRows / rowPerCm)} at the neck edge.`,
		tip: `Thread the stitches onto a length of scrap yarn so they cannot unravel, or slide them onto the cable of a spare circular needle.`
	});

	// ── Front straps ──
	const strapRows = (hand: Hand, last: number): StrapRow[] =>
		range(1, last).map((i) => {
			const left = hand === 'left';
			const blockEnd = left ? 2 * T : 2 * T + 1;
			const rs = i % 2 === 0;
			let kind: RowKind = 'full';
			let x = 0;
			if (i <= blockEnd && (left || i > 1)) {
				const p = left ? Math.ceil(i / 2) : Math.floor(i / 2);
				x = xFront[p - 1];
				// The left strap's short rows are WS rows (they start at the neck edge); the right strap's are RS rows.
				kind = (i % 2 === 1) === left ? 'short' : 'return';
			}
			return { i, rs, kind, x, ds: i === blockEnd + 1, neck: rs && neckInc.has(i), arm: rs && frontInc.has(i), co: i === J ? neckCo : 0 };
		});
	/** Does a row of this strap start at the armhole edge? The left strap's RS rows do; the right strap's WS rows do. */
	const startsAtArmhole = (hand: Hand, r: StrapRow) => (hand === 'left') === r.rs;
	const strapLabel = (hand: Hand, r: StrapRow) => {
		const verb = r.rs ? 'knit' : 'purl';
		const start = startsAtArmhole(hand, r);
		const startInc = start ? r.arm : r.neck;
		const endInc = start ? r.neck : r.arm;
		let s: string;
		if (r.kind === 'short') s = `Short row (${r.rs ? 'RS' : 'WS'}): ${startInc ? 'k1, M1L, knit' : verb} to ${r.x} sts before the armhole edge, turn`;
		else if (r.kind === 'return') s = `Short row (${r.rs ? 'RS' : 'WS'}): MDS, ${endInc ? 'knit to the last st, M1R, k1' : `${verb} to the neck edge`}`;
		else if (r.arm || r.neck) s = r.arm && r.neck ? 'neck and armhole inc row' : r.arm ? 'armhole inc row' : 'neck inc row';
		else s = r.rs ? 'knit row' : 'purl row';
		if (r.ds && r.kind === 'full') s += ', working each double stitch as one st';
		if (r.co) s += `, then cast on ${sts(r.co)} at the neck edge`;
		return s;
	};
	const strapWidth = (i: number) => strap + [...neckInc].filter((n) => n <= i).length + [...frontInc].filter((n) => n <= i).length + (i >= J ? neckCo : 0);
	const recipe = (hand: Hand): Step => {
		const left = hand === 'left';
		return {
			note: true,
			text: `Armhole inc: ${left ? 'at the start of the row, k1, M1L' : 'at the end of the row, M1R, k1'}. Neck inc: ${left ? 'at the end of the row, knit to the last st, M1R, k1' : 'at the start of the row, k1, M1L, then knit'}. An “armhole inc row” has the armhole inc, a “neck inc row” the neck inc, and a “neck and armhole inc row” both (RS rows only). Each inc adds 1 st.`,
			tip: `Recipes for the steps below, not steps of their own. The armhole edge is the edge that runs down to the underarm; the neck edge is the one next to the neck opening. Every increase adds one stitch at that edge, so each front widens as it grows.`
		};
	};
	const strapSteps = (hand: Hand, last: number, counted: boolean): Step[] => {
		const left = hand === 'left';
		const rows = strapRows(hand, last);
		const labels = rows.map((r) => strapLabel(hand, r));
		const blockEnd = Math.min(last, left ? 2 * T : 2 * T + 1);
		const blockNeck = rows.filter((r) => r.i <= blockEnd && r.neck).map((r) => r.i);
		const out: Step[] = [];
		const name = left ? 'left' : 'right';
		out.push({
			text: `${cap(name)} front: with RS facing and the main needle, pick up and knit ${sts(strap)} along the ${name} shoulder, 1 st in each cast-on st, ${left ? 'from the armhole corner to the neck corner' : 'from the neck corner to the armhole corner'}. ${left ? 'Do not join; the next row is a WS row.' : 'The next row is a WS row.'}`,
			count: sts(strap),
			tip: `${TIPS.pickUp} The right side of the front faces you; the back hangs behind. Pick up through the cast-on edge, so the shoulder has no seam to sew.`
		});
		out.push(recipe(hand));
		const widths = rows.map((r) => strapWidth(r.i));
		const adds = (n: number) => (counted ? addsOf(n) : 0);
		out.push({
			text: `Rows 1–${blockEnd}: slope the ${name} shoulder with ${T} pairs of German short rows.${left ? '' : ' Row 1 is a plain WS row; the pairs follow it.'} On each pair, ${left ? 'on the WS row purl from the neck edge to X sts before the armhole edge, turn; on the RS row MDS, knit to the neck edge' : 'on the RS row knit from the neck edge to X sts before the armhole edge, turn; on the WS row MDS, purl to the neck edge'}. X is ${list(xFront)} for the successive pairs.${blockNeck.length ? ` Work the neck inc on the RS rows numbered ${list(blockNeck)}.` : ''}`,
			tally: { unit: 'Row', first: 1, rows: labels.slice(0, blockEnd).map(cap) },
			count: sts(widths[blockEnd - 1]),
			adds: adds(blockEnd),
			tip: `The same short rows as on the back, but on one strap. Stop short of the armhole edge each time, by more each time, so the neck side of the strap is taller than the armhole side. When you turn, make a double stitch (MDS) as you did on the back.`
		});
		if (last > blockEnd) out.push(...runs(labels.slice(blockEnd), blockEnd + 1, 'Row', (j) => sts(widths[blockEnd + j]), adds));
		return out;
	};

	// ── Yoke: back, then the two fronts, then joined at the underarm ──
	const yoke: Step[] = [...back0];
	if (cardigan) {
		yoke.push(...strapSteps('left', frontRows, true));
		yoke.push({ text: `Leave the ${sts(strapWidth(frontRows))} of the left front on hold.`, tip: `Waste yarn, or a spare needle.` });
		yoke.push(...strapSteps('right', frontRows, false));
		yoke.push({ text: `Leave the ${sts(strapWidth(frontRows))} of the right front on hold.` });
	} else {
		yoke.push(...strapSteps('left', J - 1, true));
		yoke.push({ text: `Leave the ${sts(strapWidth(J - 1))} of the left front on hold.`, tip: `Waste yarn, or a spare needle.` });
		yoke.push(...strapSteps('right', J - 1, false));
		const w = strapWidth(J - 1);
		const joinInc = frontInc.has(J);
		let total = 2 * w + centre + (joinInc ? 2 : 0);
		yoke.push({
			text: `Join the fronts: row ${J} (RS): work across the left front${joinInc ? ' (with an armhole inc at the start of the row)' : ''}, then cast on ${sts(centre)} for the front of the neck${vNeck ? ' (the point of the V)' : ''}, then work across the right front${joinInc ? ', ending with the armhole inc' : ''}. From here the front is one piece.`,
			count: sts(total),
			adds: addsOf(1),
			tip: `The two straps become one piece. Cast on with a backward loop, so the new stitches sit in the gap between the fronts. This is the bottom of the neck opening: from here the neck edge is finished, and only the armholes grow.`
		});
		const labels = range(J + 1, frontRows).map((i) => (i % 2 === 0 ? (frontInc.has(i) ? 'armhole inc row' : 'knit row') : 'purl row'));
		const after = labels.map((l) => (l === 'armhole inc row' ? (total += 2) : total));
		yoke.push(...runs(labels, J + 1, 'Row', (j) => sts(after[j]), addsOf));
	}
	// Join back and front.
	const underarmJoin: Step = cardigan
		? {
				text: `Join the body: with RS facing, work across the right front sts, then cast on ${sts(u)}, work across the ${sts(back)} of the back, then cast on ${sts(u)}, and work across the left front sts. Work flat from here.`,
				count: sts(bodySts),
				tip: `Slide all three pieces onto one long needle first. Cast on the underarm stitches with a backward loop. Then try it on: the armholes should reach comfortably under your arms.`
			}
		: {
				text: `Join the body: with RS facing, knit across the ${sts(front)} of the front, then cast on ${sts(u)}, knit across the ${sts(back)} of the back, then cast on ${sts(u)}. Pm for BOR at the start of the front (the left armhole). Join to work in the round without twisting.`,
				count: sts(bodySts),
				tip: `This is where it starts to look like a sweater. Slide the back stitches off the waste yarn onto the needle, then work around. Cast on the underarm stitches with a backward loop. Check that the work is not twisted before you join, then try it on.`
			};
	yoke.push(underarmJoin);
	const firstTally = yoke.find((s) => s.tally);
	if (firstTally) firstTally.tip = `${firstTally.tip ?? ''} Tick off each row as you finish it, so you always know which kind comes next.`.trim();
	sections.push({
		id: 'yoke',
		title: 'Back and front',
		intro: `Everything from the shoulders down to the underarms: the back first, then the two fronts picked up along the shoulders, then all joined into one tube. Nothing is sewn: the shoulders are a cast-on edge you pick up from.`,
		steps: yoke
	});

	// ── Body ──
	sections.push(bodySection(d, m, bodySts, `${cardigan ? 'The body is worked straight down' : 'The body is one plain tube'} to the hem. No shaping, no counting. ${slip ? 'The armhole edges come later, picked up around the openings.' : 'The sleeves come later, picked up around the armholes.'}`));

	// ── Sleeves ──
	const sl: Step[] = [];
	const e = (top - u) / 2; // sts along each side of the armhole
	const edgeRows = armTotal;
	const per = Math.max(1, Math.min(4, Math.round((4 * e) / edgeRows)));
	const capRows = rowsOf(m.sleeveLen - m.sleeveBody); // extra rows over the top of the sleeve
	const P = Math.max(1, Math.min(Math.round(capRows / 2), e));
	const hw = range(1, P).map((p) => Math.round((p * e) / P));
	let sleeveEndSts = 0;
	let cuffSts = 0;
	if (slip) {
		sl.push({
			text: `With RS facing and the main needle (or a short circular / DPNs), start at the centre of the underarm cast-on: pick up and knit ${sts(u / 2)}, then ${sts(e)} up the armhole edge to the shoulder (about 3 sts for every 4 rows), ${sts(e)} down the rest of the armhole edge, and ${sts(u / 2)} along the rest of the cast-on. Pm for BOR. Join to work in the round.`,
			count: sts(top),
			tip: `An armhole is too small to stretch around the long needle, so use magic loop, double-pointed needles or a short circular needle. ${TIPS.pickUp} Pick up one stitch in the middle of each edge stitch, so the armhole is neat. If it gathers or gapes, pick up a few more or a few fewer: you can even this out on the next round.`
		});
		sl.push(...edgeSteps('Rolled edge', d.bodyRib, 0, top, false, k));
		sl.push({ text: `Work the second armhole the same way.`, note: true });
		sections.push({ id: 'armholes', title: 'Armhole edges', intro: `A slipover has no sleeves. Each armhole gets a little edge, picked up around the opening, that rolls to the outside by itself. You make two, the same way.`, steps: sl, twice: ['First armhole', 'Second armhole'] });
	} else {
		sl.push({
			text: `With RS facing and the shorter needle (or DPNs / magic loop), start at the centre of the underarm cast-on: pick up and knit ${sts(u / 2)}, then ${sts(e)} up the armhole edge to the shoulder seam (about ${per} st${per > 1 ? 's' : ''} for every 4 rows), pm for the shoulder, ${sts(e)} down the rest of the armhole edge, and ${sts(u / 2)} along the rest of the cast-on. Pm for BOR. Join to work in the round.`,
			count: sts(top),
			tip: `A sleeve is too narrow to stretch around the long needle, so use magic loop, double-pointed needles or a short circular needle. ${TIPS.pickUp} Pick up one stitch in the middle of each edge stitch, so the armhole is neat. If the armhole gathers or gapes, pick up a few more or a few fewer: you can even this out on the next round.`
		});
		const capLabels: string[] = [];
		for (let p = 1; p <= P; p++) {
			capLabels.push(`Short row (RS): ${p > 1 ? 'MDS, ' : ''}knit to ${hw[p - 1]} sts past the shoulder marker, turn`);
			capLabels.push(`Short row (WS): MDS, purl to ${hw[p - 1]} sts past the shoulder marker, turn`);
		}
		sl.push({
			text: `Shape the sleeve cap with ${P} pairs of German short rows, working back and forth over the top of the sleeve, a little further each time. On each pair, on the RS row knit to H sts past the shoulder marker, turn; on the WS row MDS, purl to H sts past the marker, turn (from the second pair on, start each RS row with MDS too). H is ${list(hw)} for the successive pairs.`,
			tally: { unit: 'Row', first: 1, rows: capLabels },
			count: sts(top),
			adds: addsOf(2 * P),
			tip: `The cap makes the sleeve a little taller over the shoulder than it is under the arm, so it hangs down from the shoulder instead of sticking out sideways. Each short row goes a few stitches past the shoulder marker (counting from it, on whichever side you are heading for). On the last pair you reach the underarm stitches, and from then on the whole sleeve is worked in the round.`
		});
		sl.push({
			text: `Round ${2 * P + 1}: MDS, knit around to BOR, working each double stitch as one st. From now on work in the round.`,
			count: sts(top),
			adds: addsOf(1)
		});
		({ sleeveEndSts, cuffSts } = sleeveTail(d, m, top, sl));
		sections.push({ id: 'sleeves', title: 'Sleeves', intro: `${SLEEVES_INTRO} Each is picked up around the armhole, so there is no seam to sew.`, steps: sl, twice: ['First sleeve', 'Second sleeve'] });
	}

	// ── Neckband ──
	const nk: Step[] = [];
	const neckRib = ribOf(d.neckRib);
	const edge = Math.round(0.75 * J); // 3 sts for every 4 rows down the shaped neck edges
	const neckTip = `${TIPS.pickUp} Go under both strands of each cast-on stitch. “3 for every 4 rows” means: pick up a stitch in three row ends, then skip one.`;
	let neckband = 0;
	if (cardigan) {
		const pick = bn + 2 * edge + 2 * neckCo;
		neckband = d.neckline === 'I-cord' ? pick : fitTo(pick, neckRib.rep);
		nk.push({ text: `With RS facing and the smaller needle, start at the right front neck edge and pick up and knit about ${sts(pick)} around the neck: 1 st in every cast-on st and 3 sts for every 4 rows along the shaped edges.`, tip: neckTip });
		if (d.neckline === 'I-cord') nk.push(...edgeSteps('I-cord', d.neckRib, 0, pick, true, k));
		else {
			if (neckband !== pick) nk.push({ text: `Next row (WS): ${evenly(pick, neckband)}.`, count: sts(neckband) });
			nk.push({ text: `Work in ${neckRib.name} (RS: ${neckRib.work}; WS: work sts as they appear) for ${len(m.collarH)}. Bind off loosely in pattern.`, adds: m.collarH });
		}
	} else if (d.neckline === 'I-cord') {
		neckband = bn + 2 * edge + (vNeck ? 1 : centre);
		nk.push({ text: `With RS facing, start at centre back and pick up and knit 1 st in every cast-on st${vNeck ? ', 3 sts for every 4 rows down each side of the V, and 1 st at the point of the V' : ' and 3 sts for every 4 rows down each side of the front neck'}.`, count: sts(neckband), tip: neckTip });
		nk.push(...edgeSteps('I-cord', d.neckRib, 0, neckband, false, k));
	} else if (vNeck) {
		neckband = bn + 2 * edge + 1;
		nk.push({
			text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st, 3 sts for every 4 rows down each side of the V, and 1 st at the point of the V (mark this centre st).`,
			count: `about ${sts(neckband)}`,
			tip: neckTip
		});
		nk.push({ text: `Every round: work in ${neckRib.name} to 1 st before the centre st, s2kp (centre double decrease), work in rib to end. Line the rib up so it is the same on both sides of the centre st.` });
		nk.push({ text: `Continue until the band measures ${len(m.collarH)}. Bind off loosely in pattern.`, adds: m.collarH });
	} else {
		const pick = bn + 2 * edge + centre;
		neckband = fitTo(pick, neckRib.rep);
		const what = d.neckline === 'Turtleneck' ? 'turtleneck' : d.neckline === 'Mock neck' ? 'mock neck' : 'neckband';
		nk.push({ text: `With RS facing and the smaller needle, start at centre back and pick up and knit 1 st in every cast-on st along the back neck and the front, and 3 sts for every 4 rows down each side of the front neck.`, count: sts(pick), tip: neckTip });
		if (neckband !== pick) nk.push({ text: `Next round: ${evenly(pick, neckband)}.`, count: sts(neckband), tip: TIPS.evenly });
		nk.push({ text: `Work in ${neckRib.name} (${neckRib.work}) until the ${what} measures ${len(m.collarH)}.${d.neckline === 'Turtleneck' ? ' Change to the main needle halfway so the collar folds over easily.' : ''}`, adds: m.collarH });
		nk.push({ text: `Bind off loosely in pattern, using a stretchy bind-off so it fits over the head.`, tip: `Before you cut the yarn, check that the neck goes over your head. If it is tight, undo the bind-off and work it more loosely.` });
	}
	sections.push({
		id: 'neck',
		title: d.neckline === 'Turtleneck' || d.neckline === 'Mock neck' ? 'Collar' : 'Neckband',
		intro: `The neck edge is finished last: you pick up stitches around the opening and knit a band upwards from it.`,
		steps: nk
	});

	// ── Front bands and finishing ──
	let buttons = 0;
	let buttonMm = 0;
	if (cardigan) {
		const bands = bandsSection(d, m, band);
		buttons = bands.buttons;
		buttonMm = bands.buttonMm;
		sections.push(bands.section);
	}
	sections.push(finishingSection(cardigan, buttons));

	// ── Front matter ──
	const est = estimate(d);
	const notions = `${slip ? '1 stitch marker (BOR)' : '2 stitch markers plus 1 in a different colour (BOR)'}, waste yarn or a spare circular needle, tapestry needle${cardigan ? `, ${buttons} buttons about ${buttonMm} mm across` : ''}`;
	const measurements: [string, string][] = [
		['Chest', len((bodySts + band) / stPerCm)],
		['Length, back neck to hem', len(m.L)],
		['Across the shoulders', len(castOn / stPerCm)],
		['Armhole depth, shoulder to underarm', len(armTotal / rowPerCm)],
		...(slip
			? ([['Armhole edge, around', len(top / stPerCm)]] as [string, string][])
			: ([
					['Upper arm', len(top / stPerCm)],
					['Sleeve length from underarm', len(m.sleeveBody + m.cuffLen)],
					['Cuff', len(cuffSts / stPerCm)]
				] as [string, string][]))
	];
	const abbreviations: [string, string][] = [...BASE_ABBREVIATIONS, MDS_ABBREVIATION];
	if (vNeck) abbreviations.push(['s2kp', 'slip 2 together knitwise, k1, pass the 2 slipped sts over (2 sts decreased, centred)']);
	if (cardigan && buttonMm <= 15) abbreviations.push(['yo', 'yarn over']);

	const custom = d.size === 'Custom';
	const wearer = custom || d.wearer === 'Adult' ? '' : `${d.wearer} `;
	return {
		ok: true,
		construction: 'Set-in',
		sleeveless: slip,
		title: `${wearer}${d.neckline} ${slip ? '' : 'set-in '}${d.garment.toLowerCase()}, ${custom ? 'custom fit' : `size ${d.size}`}`,
		level: est.level,
		materials: materialsOf(d, m, notions),
		gauge: gaugeText(m, cardigan),
		measurements,
		abbreviations,
		sections,
		...chartOf(d, m.gauge),
		counts: {
			castOn,
			back,
			front,
			backNeck: bn,
			strap,
			armholeIncs: ai,
			shoulderPairs: T,
			underarm: u,
			bodySts,
			upperSts: top,
			sleeveEndSts,
			cuffSts,
			hemSts: bodySts,
			neckbandSts: neckband,
			band,
			neckPerSide: cardigan ? wantInc : nInc,
			capPairs: P,
			backRows,
			frontRows
		}
	};
}
