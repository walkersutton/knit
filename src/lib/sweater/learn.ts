/**
 * Help for new knitters: tutorials for the techniques a pattern uses, and a way to write its
 * shorthand out in full.
 *
 * Both work from the finished step text, so the pattern writer does not need to know about them.
 */

export type Technique = {
	id: string;
	label: string;
	url: string;
	source: string;
	/** Step text that uses this technique. */
	match: RegExp;
};

const PURL = 'Purl Soho';
const TCK = 'Tin Can Knits';
const NIMBLE = 'Nimble Needles';

/** In the order a top-down sweater meets them. */
export const techniques: Technique[] = [
	{ id: 'cast-on', label: 'Long-tail cast-on', url: 'https://www.purlsoho.com/create/long-tail-cast-on/', source: PURL, match: /With the main needle, cast on/ },
	{ id: 'join', label: 'Joining in the round', url: 'https://nimble-needles.com/tutorials/how-to-join-knitting-in-the-round/', source: NIMBLE, match: /Join to work in the round|join to the first st/ },
	{ id: 'magic-loop', label: 'Magic loop', url: 'https://www.purlsoho.com/create/magic-loop/', source: PURL, match: /magic loop|Join to work in the round/ },
	{ id: 'dpns', label: 'Double-pointed needles', url: 'https://nimble-needles.com/tutorials/how-to-knit-with-double-pointed-needles-like-a-pro/', source: NIMBLE, match: /DPNs/ },
	{ id: 'm1', label: 'M1L and M1R increases', url: 'https://www.purlsoho.com/create/make-one-right-m1r-make-one-left-m1l/', source: PURL, match: /\bM1[LR]?\b/ },
	{ id: 'purl', label: 'The purl stitch', url: 'https://www.purlsoho.com/create/purl-stitch/', source: PURL, match: /\bpurl\b/i },
	{ id: 'short-rows', label: 'German short rows', url: 'https://www.purlsoho.com/create/german-short-rows/', source: PURL, match: /German short rows/ },
	{ id: 'backward-loop', label: 'Backward-loop cast-on', url: 'https://www.purlsoho.com/create/make-1-backwards-loop/', source: PURL, match: /^Divide r|then cast on/ },
	{ id: 'decreases', label: 'k2tog and other decreases', url: 'https://nimble-needles.com/stitches/knitting-decreases-the-ultimate-list/', source: NIMBLE, match: /k2tog|s2kp/ },
	{ id: 'ssk', label: 'ssk decrease', url: 'https://nimble-needles.com/stitches/ssk-knitting-decrease-tutorial/', source: NIMBLE, match: /\bssk\b/ },
	{ id: 'rib', label: 'Knitting rib', url: 'https://nimble-needles.com/stitches/rib-stitch-knitting-for-beginners/', source: NIMBLE, match: /Work in [^.]*\brib\b/ },
	{ id: 'bind-off', label: 'Binding off', url: 'https://blog.tincanknits.com/2013/06/14/bind-off/', source: TCK, match: /bind off loosely/i },
	{ id: 'stretchy-bind-off', label: 'A stretchy bind-off', url: 'https://nimble-needles.com/stitches/how-to-knit-jenys-surprisingly-stretchy-bind-off/', source: NIMBLE, match: /stretchy bind-off/ },
	{ id: 'i-cord', label: 'I-cord bind-off', url: 'https://www.purlsoho.com/create/i-cord-bind-off/', source: PURL, match: /I-cord bind-off/ },
	{ id: 'jogless', label: 'Jogless stripes', url: 'https://nimble-needles.com/tutorials/knitting-jogless-stripes-in-the-round/', source: NIMBLE, match: /jogless/ },
	{ id: 'fair-isle', label: 'Knitting with two colours', url: 'https://blog.tincanknits.com/2015/05/26/how-to-knit-fair-isle/', source: TCK, match: /^Fair Isle/ },
	{ id: 'buttonhole', label: 'Buttonholes', url: 'https://www.purlsoho.com/create/horizontal-one-row-buttonhole/', source: PURL, match: /buttonholes/ },
	{ id: 'ends', label: 'Weaving in ends', url: 'https://www.purlsoho.com/create/weaving-in-your-ends/', source: PURL, match: /Weave in/ },
	{ id: 'blocking', label: 'Blocking', url: 'https://blog.tincanknits.com/2013/06/14/blocking-basics/', source: TCK, match: /Wet block/ }
];

/** Tutorials for the techniques a step uses. */
export const techniquesIn = (text: string) => techniques.filter((t) => t.match.test(text));

// ── Shorthand, written out ──────────────────────────────────────────────
/** Replace a word, keeping a leading capital ("Pm" becomes "Place a marker"). */
const word = (re: RegExp, full: string) => (s: string) => s.replace(re, (m: string) => (/^[A-Z][a-z]/.test(m) ? full.charAt(0).toUpperCase() + full.slice(1) : full));

const SPELL: ((s: string) => string)[] = [
	// Places where the pattern already gives both forms.
	(s) => s.replace(/markers \(pm\)/g, 'markers').replace(/beginning of round \(BOR\)/g, 'beginning of the round').replace(/double stitch \(MDS\)/g, 'double stitch'),
	word(/\bpm\b/gi, 'place a marker'),
	word(/\bsm\b/g, 'slip the marker'),
	(s) => s.replace(/\b([KkPp])(\d+)\b/g, (_, k: string, n: string) => `${{ K: 'Knit', k: 'knit', P: 'Purl', p: 'purl' }[k]} ${n}`),
	word(/\bk2tog\b/g, 'knit 2 together'),
	word(/\byo\b/g, 'yarn over'),
	word(/\bssk\b/g, 'slip, slip, knit (ssk)'),
	(s) => s.replace(/\bM1L\b/g, 'make 1 left (M1L)').replace(/\bM1R\b/g, 'make 1 right (M1R)').replace(/\bM1\b/g, 'make 1'),
	word(/\bMDS\b/g, 'make a double stitch'),
	word(/\bBOR\b/g, 'the beginning of the round'),
	word(/\bRS\b/g, 'right side'),
	word(/\bWS\b/g, 'wrong side'),
	word(/\btbl\b/g, 'through the back loop'),
	word(/\brep\b/g, 'repeat'),
	word(/\bincs\b/gi, 'increases'),
	word(/\binc\b/gi, 'increase'),
	word(/\bdecs\b/gi, 'decreases'),
	word(/\bdec\b/gi, 'decrease'),
	word(/\bsts\b/g, 'stitches'),
	word(/\bst\b/g, 'stitch'),
	word(/\bDPNs\b/g, 'double-pointed needles'),
	// A sentence that began with an abbreviation now begins with a small letter.
	(s) => s.replace(/(^|[.!?] )([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase())
];

/** Abbreviations that must not survive `spellOut`. */
export const SHORTHAND = /\b(sts?|pm|sm|rep|incs?|decs?|RS|WS|BOR|MDS|tbl|yo|k2tog|DPNs|[kp]\d+)\b/;

/** Step text with the knitting shorthand written out in words. Stitch-count markup is kept. */
export const spellOut = (text: string) => SPELL.reduce((s, f) => f(s), text);

// ── Before you start ────────────────────────────────────────────────────
export type Link = { label: string; url: string; source: string };
export type Primer = { title: string; body: string; links: Link[] };

/** What a first-time sweater knitter should know before casting on. */
export function primer(cardigan: boolean): Primer[] {
	return [
		{
			title: 'How it comes together',
			body: `You knit this in one piece from the neck down, so there is nothing to sew together at the end. First the yoke (neck to underarms), then the body, then each sleeve, then the neckband${cardigan ? ' and front bands' : ''}. It is worth reading the whole pattern once before you start.`,
			links: [
				cardigan
					? { label: 'A similar cardigan, knit start to finish with photos', url: 'https://blog.tincanknits.com/2013/12/24/lets-knit-a-cardigan/', source: TCK }
					: { label: 'A similar sweater, knit start to finish with photos', url: 'https://blog.tincanknits.com/2013/10/25/lets-knit-a-sweater/', source: TCK }
			]
		},
		{
			title: 'What you need to know already',
			body: `How to cast on, knit, purl and bind off. If you have made a hat in the round you are ready. Everything else is explained at the step where you first need it.`,
			links: [
				{ label: 'The knit stitch', url: 'https://www.purlsoho.com/create/knit-stitch/', source: PURL },
				{ label: 'The purl stitch', url: 'https://www.purlsoho.com/create/purl-stitch/', source: PURL }
			]
		},
		{
			title: 'How to read the steps',
			body: `Bold numbers are stitch counts. The grey line under a step is what should be on your needles when the step is done: stop and count. A star means a repeat: “*knit 1, purl 1; repeat from *” is knit 1, purl 1, knit 1, purl 1, and so on.`,
			links: [{ label: 'How to read a knitting pattern', url: 'https://www.craftyarncouncil.com/standards/how-to-read-knitting-pattern', source: 'Craft Yarn Council' }]
		},
		{
			title: 'Swatch first',
			body: `Every number here assumes your stitches are the size given under Gauge. Knit a square at least 15 cm (6 in) wide, wash and dry it, then count the stitches across 10 cm. Too many stitches: try a bigger needle. Too few: a smaller one. An hour here saves a sweater that does not fit.`,
			links: [{ label: 'Gauge and swatching', url: 'https://blog.tincanknits.com/2013/08/17/gauge/', source: TCK }]
		},
		{
			title: 'Three habits that save a first sweater',
			body: `Count your stitches every time the pattern gives a number; a mistake caught on the same round takes a minute to fix. Before trying anything new, thread a length of smooth scrap yarn through all the stitches on the needle (a “lifeline”), so you can rip back to it safely. And try the sweater on as you go: knitting from the top down means you can check the fit and the length at any point.`,
			links: []
		}
	];
}
