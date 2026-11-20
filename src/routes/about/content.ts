import { colors, sections, yarnWeights } from '$lib/sweater/options';
import type { Design } from '$lib/sweater/garment';
import { chart, PATTERNS, TILE_ROWS, TILE_ST } from '$lib/sweater/motifs';
import { needleLabel } from '$lib/sweater/needles';

const fields = sections.flatMap((s) => s.groups).flatMap((g) => g.fields);
const list = (key: keyof Design) => {
	const labels = fields.find((f) => f.key === key)!.options.map((o) => String(o.label));
	return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
};

export const faq = [
	{
		q: 'What is knit?',
		a: 'knit is a free garment designer that runs in your browser. You pick a sweater, T-shirt, slipover, cardigan, beanie, socks or scarf, choose its size, fit and finishes, watch the result update on a 3D model, and get a written knitting pattern with stitch counts worked out for that exact design.'
	},
	{
		q: 'Is knit free?',
		a: 'Yes. There is no payment and nothing to install. You can design and print patterns without an account; a Ravelry sign-in is optional and syncs saved work across devices.'
	},
	{
		q: 'What can I design?',
		a: `Garment types: ${list('garment')}. Made for: ${list('wearer')}. Tops: sizes ${list('size')}, fit ${list('fit')}, body length ${list('bodyLength')}, ${list('neckline')} necklines and ${list('sleeveLength')} sleeves in ${list('sleeveShape')} shapes. Finishes: ${list('hemFinish')}. Beanies: ${list('hatLength')} depth, ${list('crown')} crown and an optional ${list('pomPom')}. Socks: ${list('sockLength')} length, ${list('heel')} heel and ${list('toe')} toe. Scarves: ${list('scarfWidth')} width, ${list('scarfLength')} length, ${list('scarfEnds')} ends and ${list('fringe')} fringe. Fabric: ${list('pattern')}, in ${colors.length} colours.`
	},
	{
		q: 'Which designs come with a written pattern?',
		a: 'All seven garment types come with a full written pattern. Sweaters, T-shirts, cardigans and slipovers are worked top-down and seamless, with raglan or set-in sleeves on the sleeved ones. Beanies are worked from the brim to the crown, socks from the cuff to the toe, and scarves from one end to the other.'
	},
	{
		q: 'What does the pattern include?',
		a: 'Materials (yarn weight, yardage and skeins per colour, needle sizes, notions), the gauge to match, finished measurements in centimetres and inches, and step-by-step instructions with a stitch count after every shaping step. Tops cover the yoke (or the back and fronts for set-in sleeves), body, sleeves and neckband; beanies run from brim to crown, socks from cuff to toe in two passes, and scarves from one end to the other. Fair Isle designs include a chart, and every pattern ends with a list of abbreviations.'
	},
	{
		q: 'Which yarn weights and gauges are supported?',
		a: `${yarnWeights.map((w) => `${w.label} at ${w.gauge} stitches per 4 inches (10 cm) on ${needleLabel(w.needle)} needles`).join('; ')}. Ribbing and bands are worked on a smaller needle.`
	},
	{
		q: 'Can I use the needles I already have?',
		a: 'Yes. On the Yarn step, pick the needle sizes you own. If one of them is within a size or two of the usual needle for your yarn weight, the pattern is written for that needle and its gauge, so the stitch counts change to keep the finished size the same. Ribbing uses a smaller needle from your set when you have one. Any size you would still need is marked “To buy”.'
	},
	{
		q: 'How is the yarn amount estimated?',
		a: 'Yardage is calculated from the fabric area of the finished piece (body, sleeves, yoke and collar on tops; brim and crown on a beanie; leg and foot on each sock; the strip and fringe of a scarf) and scaled by gauge, because finer yarn needs more length to cover the same area. Fair Isle adds about 20% for the strands carried behind the work, and contrast colours are estimated separately. Treat it as an estimate and buy a little extra.'
	},
	{
		q: 'Do I need to knit a gauge swatch?',
		a: 'Yes. Every stitch count in the pattern depends on matching the stitch gauge, measured in stockinette after blocking. If your swatch has too many stitches per 4 inches, go up a needle size; too few, go down.'
	},
	{
		q: 'How hard are the patterns?',
		a: 'Each design is rated Beginner or Intermediate. A plain raglan, a spiral-crown beanie, a flap-heel sock or a plain scarf is Beginner. Set-in sleeves, V-necks, I-cord edges, puff sleeves, side slits, folded hems, gathered crowns, short-row heels, round toes and Fair Isle colourwork make a design Intermediate.'
	},
	{
		q: 'I am new to knitting. Can I follow the pattern?',
		a: 'Yes, if you can cast on, knit, purl and bind off. The pattern has two views. Concise is the bare pattern in standard knitting shorthand. Beginner writes every abbreviation out in words, explains what each part of the sweater is, adds a tip to the steps that trip up first-timers, and links to free tutorials for each technique at the step where you first need it.'
	},
	{
		q: 'Can I keep track of where I am?',
		a: 'Yes. Tick off each step as you finish it, and use the round counter on steps that repeat: it shows which kind of round comes next. Each sleeve and each sock is tracked separately, and the 3D model grows as you read. Your design and your place are saved in this browser. Sign in with Ravelry to sync them with your other devices, and “Find my place” takes you back to the next step.'
	},
	{
		q: 'How do I save or print a pattern?',
		a: 'Press “Print pattern” in the designer. To keep a copy, choose “Save as PDF” in the print dialog.'
	}
];

export const steps = [
	{ id: 'design', name: 'Design', text: 'Pick a sweater, T-shirt, slipover, cardigan, beanie, socks or scarf, who it is for, and its size and fit.' },
	{ id: 'details', name: 'Details', text: 'Choose its finishes: rib structure and length, folded hems, brims and cuffs, crown, heel, toe, ends and fringe.' },
	{ id: 'yarn', name: 'Yarn', text: 'Choose a yarn weight, which sets the gauge and needle size, then a colour and an optional stripe or Fair Isle pattern. Pick the needle sizes you already have and the pattern uses them where it can.' },
	{ id: 'summary', name: 'Summary', text: 'Check the finished measurements, the yardage, the number of skeins and the skill level.' },
	{ id: 'pattern', name: 'Pattern', text: 'Read the instructions on screen, or print them and save as a PDF.' }
];

export const defaultDesign: Design = {
	wearer: 'Adult',
	garment: 'Sweater',
	construction: 'Raglan',
	size: 'M',
	custom: null,
	fit: 'Relaxed',
	bodyLength: 'Regular',
	sleeveLength: 'Full',
	neckline: 'Crew',
	sleeveShape: 'Straight',
	hemFinish: 'Ribbed',
	bodyRib: '1×1',
	bodyRibLength: 'Regular',
	slits: 'None',
	neckRib: '1×1',
	neckDepth: 'Regular',
	cuffFinish: 'Ribbed',
	sleeveRib: '1×1',
	cuffLength: 'Regular',
	pattern: 'Solid',
	motif: '',
	centerpiece: '',
	centerpieceY: 0.25,
	centerpieceAt: 'Centre',
	color: '#465e9d',
	contrast: '#faf3dc',
	gauge: 18,
	needle: 0,
	ribNeedle: 0,
	hatLength: 'Slouchy',
	crown: 'Spiral',
	pomPom: 'None',
	brimFinish: 'Ribbed',
	brimRib: '1×1',
	brimLength: 'Regular',
	sockLength: 'Crew',
	heel: 'Flap',
	toe: 'Grafted',
	sockRib: '1×1',
	sockCuff: 'Regular',
	scarfWidth: 'Regular',
	scarfLength: 'Regular',
	scarfEnds: 'Plain',
	fringe: 'None'
};

export { colors, yarnWeights, needleLabel };

/** Scroll reveal: fades and lifts an element in once, as it enters the viewport. */
export function reveal(node: HTMLElement, delay = 0) {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	node.classList.add('rv');
	node.style.setProperty('--rv-delay', delay + 'ms');
	const io = new IntersectionObserver(
		([e]) => {
			if (e.isIntersecting) {
				node.classList.add('rv-in');
				io.disconnect();
			}
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
}

export const garmentPaths: Record<string, string> = {
	Sweater: 'M20 12 28 9Q32 15 36 9L44 12 58 38 50 42 44 32V56H20V32L14 42 6 38Z',
	'T-shirt': 'M20 12 28 9Q32 15 36 9L44 12 56 26 48 31 44 26V56H20V26L16 31 8 26Z',
	Slipover: 'M22 10 28 9Q32 17 36 9L42 10 46 22 44 24V56H20V24L18 22Z',
	Cardigan: 'M20 12 28 9 32 18 36 9 44 12 58 38 50 42 44 32V56H20V32L14 42 6 38Z',
	Beanie: 'M16 36Q16 11 32 11T48 36V48H16ZM16 36H48',
	Socks: 'M14 10H26V34Q26 40 34 43Q46 48 46 56Q46 60 41 60H14Q10 60 10 55V14Q10 10 14 10ZM38 10H50V34Q50 40 58 43H54V60H38Z',
	Scarf: 'M16 10H48V50H16ZM16 10L12 5M24 10L21 5M32 10L32 5M40 10L43 5M48 10L52 5M16 50L12 55M24 50L21 55M32 50L32 55M40 50L43 55M48 50L52 55'
};

/** Dark thread on light yarn, light thread on dark yarn. */
export const contrastFor = (hex: string) => {
	const n = parseInt(hex.slice(1), 16);
	const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
	return lum > 0.62 ? '#302c32' : '#faf3dc';
};

/** Cells (column, row) of each stitch pattern's tile that are worked in the contrast colour. */
export const tiles: Record<string, [number, number][]> = Object.fromEntries(
	PATTERNS.filter((p) => p !== 'Solid' && p !== 'Custom').map((name) => {
		const cells: [number, number][] = [];
		for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) if (chart(name, i, j)) cells.push([i, j]);
		return [name, cells];
	})
);
export { TILE_ROWS, TILE_ST };
