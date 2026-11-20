import { familyOf } from '../family';
import type { Design, Measurements } from '../garment';
import { tileFor } from '../motifs';
import {
	BASE_ABBREVIATIONS,
	MDS_ABBREVIATION,
	chartOf,
	estimate,
	gaugeText,
	len,
	materialsOf,
	ribOf,
	stripeRepeat,
	sts,
	toMult,
	type Pattern,
	type PatternSection,
	type Step,
	type Tally
} from '../patternKit';

/** Rows to tick off one at a time in a long straight section. */
function tally(unit: 'Round' | 'Row', first: number, count: number, label: string): Tally {
	return { unit, first, rows: Array.from({ length: Math.max(1, count) }, (_, i) => `${label} ${first + i}`) };
}

/** The one all-over-pattern note every accessory section shares. */
function chartNote(d: Design, m: Measurements, part: string): Step[] {
	if (d.pattern === 'Solid') return [];
	const flat = familyOf(d) === 'scarf';
	const unit = flat ? 'row' : 'round';
	if (d.pattern === 'Stripes')
		return [
			{
				note: true,
				text: `Stripes: in every stockinette section (${part}) work ${stripeRepeat(d, unit)}.${flat ? '' : ' Join each colour in a jogless join at the start of the round.'} Start the stripes once the rib is done.`
			}
		];
	const tile = tileFor(d, m.gauge);
	const name = d.pattern === 'Fair isle' ? 'Fair Isle' : d.pattern === 'Custom' ? 'your own chart' : d.pattern.toLowerCase();
	return [
		{
			note: true,
			text: `${name}: work the ${tile.st}-st, ${tile.rows}-${unit} chart repeat in the stockinette sections (${part}), reading the chart from top to bottom. ${flat ? 'Repeat it across the width, centring the repeat at the middle of the scarf.' : `Repeat it around the round, centring the repeat at the middle of the ${part === 'foot' ? 'foot' : 'round'}.`} Keep the floats loose and catch any float longer than 5 sts.`
		}
	];
}

function finishing(text: string): PatternSection {
	return {
		id: 'finishing',
		title: 'Finishing',
		intro: `A little tidying makes the finished piece look as good as it feels.`,
		steps: [
			{ text },
			{
				text: `Wet block: soak, squeeze out the water, and lay flat to the finished measurements to dry.`,
				tip: `Blocking evens out your stitches and lets the fabric relax to its real size.`
			}
		]
	};
}

function writeHat(d: Design, m: Measurements): Pattern {
	const rib = ribOf(d.brimRib);
	const head = m.head ?? m.chest;
	const brimH = m.brimH ?? 5 * m.k;
	const hatH = m.hatH ?? brimH + (m.crownH ?? 10 * m.k);
	const crownH = m.crownH ?? hatH * 0.4;
	const bodyH = Math.max(1, hatH - crownH);
	const castOn = toMult(Math.round(head * m.stPerCm * 0.92), rib.rep);
	const crownStart = castOn;
	const crownEnd = d.crown === 'Gathered' ? 8 : Math.max(8, toMult(Math.round(castOn * 0.12), 2));
	const decreaseRounds = Math.max(1, Math.round(crownH * m.rowPerCm / 2));
	const mainYarn = d.wearer === 'Adult' || d.size === 'Custom' ? '' : `${d.wearer.toLowerCase()} `;

	const brimSteps: Step[] = [
		{
			text: `Cast on ${sts(castOn)} with the smaller needle. Join to work in the round, taking care not to twist the stitches. Place a marker for the beginning of the round.`,
			count: sts(castOn),
			tip: `Make a long tail cast-on: it is stretchy enough to pull over a head, and the tail can be used to weave in the first end later.`
		}
	];
	if (d.brimFinish === 'Ribbed') {
		brimSteps.push({
			text: `Work in ${rib.name} (${rib.work}) for ${len(brimH)}.`,
			count: sts(castOn),
			tip: rib.rep > 1 ? `Rib is columns of knit and purl stitches. Bring the yarn forward before a purl stitch and back before a knit stitch.` : undefined,
			tally: tally('Round', 1, Math.max(4, Math.round(brimH * m.rowPerCm)), 'Rib round'),
			adds: brimH
		});
	} else if (d.brimFinish === 'Folded') {
		brimSteps.push(
			{ text: `Work in stockinette for ${len(brimH)}.`, count: sts(castOn), tally: tally('Round', 1, Math.max(4, Math.round(brimH * m.rowPerCm)), 'Knit round'), adds: brimH },
			{ text: `Purl one turning round.`, count: sts(castOn), tally: tally('Round', 1, 1, 'Turning round') },
			{ text: `Knit ${len(brimH)} more, then fold the brim to the inside at the turning round.`, count: sts(castOn), tally: tally('Round', 1, Math.max(4, Math.round(brimH * m.rowPerCm)), 'Knit round'), adds: brimH }
		);
	} else {
		brimSteps.push({
			text: `Work in stockinette for ${len(Math.max(1, brimH))}. The edge naturally rolls to the right side.`,
			count: sts(castOn),
			tally: tally('Round', 1, Math.max(3, Math.round(brimH * m.rowPerCm)), 'Knit round'),
			adds: brimH
		});
	}

	const crownSteps: Step[] = [
		{ text: `Change to the main needle and knit every round until the hat measures ${len(hatH - crownH)} from the cast-on.`, count: sts(crownStart), tally: tally('Round', 1, Math.max(6, Math.round(bodyH * m.rowPerCm)), 'Knit round'), adds: bodyH },
		...chartNote(d, m, 'hat body and crown')
	];
	if (d.crown === 'Spiral') {
		const every = Math.max(2, Math.floor(crownStart / (crownStart - crownEnd)));
		crownSteps.push({
			text: `Decrease round: *k${Math.max(1, every - 2)}, k2tog; rep from * to end (${sts(crownStart - crownEnd)} decreased over the round). Repeat the decrease round every other round ${decreaseRounds} times, working the stitches between decreases in stockinette.`,
			count: sts(crownEnd),
			tally: tally('Round', 1, decreaseRounds, 'Decrease round'),
			adds: crownH,
			tip: `Place a marker after each decrease so you can see the spiral of decreases climbing the crown.`
		});
	} else {
		crownSteps.push({
			text: `Decrease round: *k1, k2tog; rep from * to end (${sts(Math.floor(crownStart / 3))} decreased). Repeat this round every other round, then knit the remaining stitches in groups of 2 until ${sts(crownEnd)} remain.`,
			count: sts(crownEnd),
			tally: tally('Round', 1, decreaseRounds, 'Decrease round'),
			adds: crownH,
			tip: `The decreases gather into eight neat spokes at the top.`
		});
	}
	const finish = finishing(m.pom ? `Thread the yarn through the remaining ${sts(crownEnd)}, pull tight and fasten off. Make or attach a pom-pom and sew it firmly to the top. Weave in all ends.` : `Thread the yarn through the remaining ${sts(crownEnd)}, pull tight and fasten off. Weave in all ends.`);

	return {
		ok: true,
		construction: 'Beanie',
		family: 'hat',
		sleeveless: true,
		yokeFront: [],
		title: `${mainYarn}beanie, ${d.hatLength.toLowerCase()} with ${d.brimFinish.toLowerCase()} brim`,
		level: estimate(d).level,
		materials: materialsOf(d, m, m.pom ? 'Tapestry needle; pom-pom maker (optional).' : 'Tapestry needle.'),
		gauge: gaugeText(m, false),
		measurements: [
			['Head circumference', len(head)],
			['Brim depth', len(brimH)],
			['Hat depth', len(hatH)],
			['Crown shaping', len(crownH)]
		],
		abbreviations: [...BASE_ABBREVIATIONS],
		sections: [
			{ id: 'brim', title: 'Brim', intro: `The stretchy band that sits around the head.`, steps: brimSteps, piece: 'brim' },
			{ id: 'crown', title: 'Crown', intro: `The heart of the beanie: plain fabric, then decreases to close the top.`, steps: crownSteps, piece: 'crown' },
			finish
		],
		...chartOf(d, m.gauge),
		counts: { castOn, crownStart, crownEnd, decreaseRounds, rows: Math.round((brimH + hatH) * m.rowPerCm) }
	};
}

function writeSocks(d: Design, m: Measurements): Pattern {
	const rib = ribOf(d.sockRib);
	const circ = m.sockCirc ?? m.chest;
	const legLen = m.legLen ?? 16 * m.k;
	const footLen = m.footLen ?? 25 * m.k;
	const heelLen = m.heelLen ?? footLen * 0.3;
	const toeLen = m.toeLen ?? footLen * 0.22;
	const cuffLen = m.cuffLen ?? 5 * m.k;
	const castOn = toMult(Math.round(circ * m.stPerCm * 0.9), rib.rep);
	const heelSts = Math.max(8, toMult(Math.round(castOn * 0.5), 2));
	const toeEnd = Math.max(8, toMult(Math.round(castOn * 0.25), 2));
	const heelRows = Math.max(4, Math.round(heelLen * m.rowPerCm));
	const legRows = Math.max(6, Math.round((legLen - cuffLen) * m.rowPerCm));
	const footRows = Math.max(8, Math.round((footLen - heelLen * 0.4 - toeLen) * m.rowPerCm));
	const toeRows = Math.max(3, Math.round(toeLen * m.rowPerCm / 2));
	const twice: [string, string] = ['First sock', 'Second sock'];
	const note = chartNote(d, m, 'leg and foot');

	const cuff: Step[] = [
		{ text: `Cast on ${sts(castOn)} with the smaller needle. Join to knit in the round, taking care not to twist.`, count: sts(castOn) },
		{ text: `Work in ${rib.name} (${rib.work}) for ${len(cuffLen)}.`, count: sts(castOn), tally: tally('Round', 1, Math.max(4, Math.round(cuffLen * m.rowPerCm)), 'Rib round'), adds: cuffLen, tip: `This cuff is worked first at the top, so the sock grows down towards the toe.` }
	];
	// When the cuff takes up the whole leg (a long cuff on an ankle sock) there is no plain leg to knit.
	const plainLeg = legLen - cuffLen;
	const leg: Step[] =
		plainLeg >= 1 * m.k
			? [
					{ text: `Change to the main needle and knit every round until the leg measures ${len(legLen)} from the cast-on.`, count: sts(castOn), tally: tally('Round', 1, legRows, 'Knit round'), adds: plainLeg },
					...note
				]
			: [{ text: `The rib makes up the whole leg of this sock. Change to the main needle for the heel.`, count: sts(castOn) }, ...note];
	const heelMid = Math.max(4, toMult(Math.round(heelSts / 3), 2));
	const heelPairs = Math.max(2, (heelSts - heelMid) / 2);
	const heel: Step[] =
		d.heel === 'Short row'
			? [
					{
						text: `German short-row heel, first half. Work back and forth over the centre ${sts(heelSts)} only. Row 1 (RS): knit across the heel sts, turn. Row 2 (WS): MDS, purl to the end of the heel sts, turn. Row 3: MDS, knit to the double st, turn. Row 4: MDS, purl to the double st, turn. Repeat rows 3 and 4 until ${sts(heelMid)} remain between the double sts in the middle, with ${heelPairs} double sts on each side.`,
						tally: tally('Row', 1, heelPairs * 2, 'Short row'),
						adds: heelLen / 2,
						tip: `A double st looks like two legs on one stitch. Treat both legs as one st whenever you knit or purl it.`
					},
					{ text: `Knit one round over all the sts, knitting each double st as one st.`, count: sts(castOn), tally: tally('Round', 1, 1, 'Knit round') },
					{
						text: `Second half, over the heel sts again. Row 1 (RS): knit to the end of the ${sts(heelMid)} in the middle, knit 1 more, turn. Row 2 (WS): MDS, purl to the end of the middle sts, purl 1 more, turn. Row 3: MDS, knit to the double st, knit it as one st, knit 1 more, turn. Row 4: MDS, purl to the double st, purl it as one st, purl 1 more, turn. Repeat rows 3 and 4 until every heel st has been worked again.`,
						tally: tally('Row', 1, heelPairs * 2, 'Short row'),
						adds: heelLen / 2,
						tip: `This half widens the heel again, so the cup it makes fits round the back of the heel.`
					},
					{ text: `Go back to knitting in the round, knitting the last double st as one st when you reach it.`, count: sts(castOn) }
				]
			: [
					{ text: `Put the instep sts (the other ${sts(castOn - heelSts)}) on a holder. Work the heel flap back and forth over the centre ${sts(heelSts)} at the back in stockinette for ${len(heelLen)}, ending with a WS row.`, count: sts(heelSts), tally: tally('Row', 1, heelRows, 'Heel row'), adds: heelLen },
					{ text: `Turn the heel: knit to the centre st, then decrease one st at each end of every row until ${sts(Math.ceil(heelSts / 3))} remain.`, count: sts(Math.ceil(heelSts / 3)), tally: tally('Row', 1, Math.max(3, Math.round(heelSts / 4)), 'Heel turn row'), tip: `This makes a little cup that fits around the back of the heel.` }
				];
	const foot: Step[] = [
		{ text: `Pick up ${sts(Math.ceil(heelSts / 2))} sts along one side of the heel. Knit across the instep, pick up the same number on the other side, then knit across the heel.`, count: sts(castOn + Math.ceil(heelSts) - heelSts), tip: `Pick up into the purl bumps along the heel flap edge; that hides the picks on the inside.` },
		{ text: `Knit every round until the foot measures ${len(footLen - toeLen)} from the back of the heel.`, tally: tally('Round', 1, footRows, 'Knit round'), adds: footLen - toeLen }
	];
	// A round toe decreases at four points evenly round the sock, so the stitches must divide by 4. A very small sock
	// may already be down to the last few stitches.
	const roundExtra = castOn % 4;
	const roundSts = castOn - roundExtra;
	const tipSts = Math.min(8, roundSts);
	const roundDecs = (roundSts - tipSts) / 4;
	const roundHalf = Math.min(roundDecs, Math.max(1, Math.round(roundSts / 8)));
	const roundEvery = roundDecs - roundHalf;
	const toe: Step[] =
		d.toe === 'Grafted'
			? [
					{
						text: `Toe decreases: *k1, ssk, knit to 3 sts before the end of the round, k2tog, k1; rep from * every other round until ${sts(toeEnd)} remain.`,
						count: sts(toeEnd),
						tally: tally('Round', 1, toeRows, 'Decrease round'),
						adds: toeLen,
						tip: `Two decreases on each side make a flat wedge, the shape of the toes.`
					},
					{ text: `Graft the remaining sts together with Kitchener stitch, then weave in the ends.`, tip: `Cut a tail at least 20 cm long for grafting: threading a short one through every stitch is fiddly.` }
				]
			: [
					...(roundExtra ? [{ text: `Knit one round, working k2tog ${roundExtra === 1 ? 'once' : `${roundExtra} times, spaced out,`} so ${sts(roundSts)} remain.`, count: sts(roundSts) }] : []),
					...(roundHalf
						? [
								{
									text: `Place a marker after every ${roundSts / 4} sts (4 markers). Decrease round: *knit to 2 sts before the marker, k2tog; rep from * around (4 sts decreased). Work a decrease round, then a plain knit round, ${roundHalf} times.`,
									count: sts(roundSts - 4 * roundHalf),
									tally: tally('Round', 1, roundHalf * 2, 'Toe round'),
									adds: roundEvery ? toeLen * 0.55 : toeLen
								}
							]
						: []),
					...(roundEvery
						? [
								{
									text: `Work the decrease round every round until ${sts(tipSts)} remain.`,
									count: sts(tipSts),
									tally: tally('Round', 1, roundEvery, 'Decrease round'),
									adds: toeLen * 0.45,
									tip: `Decreasing faster at the end rounds the tip off, like a dome.`
								}
							]
						: []),
					{ text: `Cut the yarn, leaving a 15 cm tail. Thread it through the last ${sts(tipSts)}, pull tight to close the toe, and weave in the end on the inside.` }
				];
	const finish = finishing(`Wet block the socks flat, shaping the heels and toes gently, and weave in any loose ends.`);

	return {
		ok: true,
		construction: 'Socks',
		family: 'sock',
		sleeveless: true,
		yokeFront: [],
		title: `${d.sockLength.toLowerCase()} socks, ${d.heel.toLowerCase()} heel and ${d.toe.toLowerCase()} toe`,
		level: estimate(d).level,
		materials: materialsOf(d, m, ['Tapestry needle', d.toe === 'Round' && 'stitch markers', d.heel === 'Flap' && 'stitch holder for the instep while you work the heel'].filter(Boolean).join('; ') + '.'),
		gauge: gaugeText(m, false),
		measurements: [
			...(d.shoeSize ? [['Shoe size', d.shoeSize] as [string, string]] : []),
			['Leg circumference', len(circ)],
			['Leg length', len(legLen)],
			['Foot length', len(footLen)],
			['Cuff depth', len(cuffLen)]
		],
		abbreviations: [...BASE_ABBREVIATIONS, MDS_ABBREVIATION],
		sections: [
			{ id: 'cuff', title: 'Cuff', intro: `A stretchy rib keeps the sock up without gripping too tightly.`, steps: cuff, twice, piece: 'sock' },
			{ id: 'leg', title: 'Leg', intro: `The plain tube down to the heel.`, steps: leg, twice, piece: 'sock' },
			{ id: 'heel', title: 'Heel', intro: `The part that turns the tube into a cup for the back of the foot.`, steps: heel, twice, piece: 'sock' },
			{ id: 'foot', title: 'Foot', intro: `Knit around the foot until only the toe is left.`, steps: foot, twice, piece: 'sock' },
			{ id: 'toe', title: 'Toe', intro: `A few rounds of decreases close the end neatly.`, steps: toe, twice, piece: 'sock' },
			finish
		],
		...chartOf(d, m.gauge),
		counts: { castOn, heelSts, toeEnd, heelRows, legRows, footRows, toeRows }
	};
}

function writeScarf(d: Design, m: Measurements): Pattern {
	const W = m.scarfW ?? m.chest;
	const L = m.scarfL ?? m.L;
	const fringe = m.fringeLen ?? 0;
	const ribbedEnds = d.scarfEnds === 'Ribbed';
	const rib = ribOf('1×1');
	const castOn = toMult(Math.round(W * m.stPerCm), ribbedEnds ? rib.rep : 1);
	const end = Math.min(L / 4, 4 * m.k);
	const rows = Math.max(20, Math.round(L * m.rowPerCm));
	const note = chartNote(d, m, 'scarf body');

	const steps: Step[] = [
		{ text: `Cast on ${sts(castOn)}.`, count: sts(castOn), tip: `A long-tail cast-on gives a neat, stretchy edge.` }
	];
	if (ribbedEnds) {
		steps.push(
			{ text: `Work in 1×1 rib for ${len(end)}.`, tally: tally('Row', 1, Math.max(4, Math.round(end * m.rowPerCm)), 'Rib row'), adds: end },
			{ text: `Change to stockinette (knit RS rows, purl WS rows) and continue until the scarf measures ${len(L - 2 * end)} from the first ribbed end.`, tally: tally('Row', 1, Math.max(20, rows - 2 * Math.round(end * m.rowPerCm)), 'Knit row'), adds: L - 2 * end },
			{ text: `Work in 1×1 rib for ${len(end)} more, then bind off loosely in pattern.`, tally: tally('Row', 1, Math.max(4, Math.round(end * m.rowPerCm)), 'Rib row'), adds: end }
		);
	} else {
		steps.push({ text: `Work in stockinette (knit RS rows, purl WS rows) until the scarf measures ${len(L)}.`, tally: tally('Row', 1, rows, 'Knit row'), adds: L });
	}
	steps.push(...note);

	const sections: PatternSection[] = [
		{ id: 'body', title: 'Scarf', intro: `One long, flat strip: the ideal project to knit on the move.`, steps, piece: 'scarf' }
	];
	if (fringe > 0) {
		const strands = 24;
		sections.push({
			id: 'fringe',
			title: 'Fringe',
			intro: `Short lengths of yarn knotted along each end.`,
			steps: [
				{
					text: `Cut ${sts(strands * 2)} strands of yarn about ${len(2 * fringe + 4 * m.k)} long. Fold each strand in half, pull the loop through an edge stitch with a crochet hook, then pull the ends through the loop and tighten. Work ${strands} evenly spaced fringes at each end.`,
					tally: tally('Row', 1, strands * 2, 'Fringe knot'),
					adds: fringe,
					tip: `Use a tapestry needle or a small crochet hook to pull the loops through; keeping every strand the same length makes the fringe look even.`
				}
			],
			piece: 'fringe'
		});
	}
	sections.push(finishing(`Weave in the ends and wet block the scarf, smoothing it flat to its finished width and length.`));

	return {
		ok: true,
		construction: 'Scarf',
		family: 'scarf',
		sleeveless: true,
		yokeFront: [],
		title: `${d.scarfWidth.toLowerCase()} scarf, ${len(L)} long${fringe ? ` with ${d.fringe.toLowerCase()} fringe` : ''}`,
		level: estimate(d).level,
		materials: materialsOf(d, m, fringe ? 'Tapestry needle; small crochet hook for the fringe.' : 'Tapestry needle.'),
		gauge: gaugeText(m, true),
		measurements: [
			['Finished width', len(W)],
			['Finished length', len(L)],
			['Fringe', len(fringe)]
		],
		abbreviations: [...BASE_ABBREVIATIONS],
		sections,
		...chartOf(d, m.gauge),
		counts: { castOn, rows, end: Math.round(end), fringe: Math.round(fringe) }
	};
}

/** Returns null for a torso garment; the caller keeps writing raglan and set-in patterns for those. */
export function writeAccessory(d: Design, m: Measurements): Pattern | null {
	switch (familyOf(d)) {
		case 'hat':
			return writeHat(d, m);
		case 'sock':
			return writeSocks(d, m);
		case 'scarf':
			return writeScarf(d, m);
		default:
			return null;
	}
}
