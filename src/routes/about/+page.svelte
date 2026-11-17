<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import Seo from '$lib/Seo.svelte';
	import { SITE } from '$lib/site';
	import { colors, sections, yarnWeights } from '$lib/sweater/options';
	import type { Design } from '$lib/sweater/garment';
	import { needleLabel } from '$lib/sweater/needles';

	const title = 'How Knit It works — custom knitting patterns and FAQ';
	const description =
		'How Knit It turns your choices of garment, size, fit and yarn weight into a 3D preview and a written top-down raglan knitting pattern, plus answers to common questions.';

	// Option lists come straight from the designer, so this page cannot drift from what it offers.
	const fields = sections.flatMap((s) => s.groups).flatMap((g) => g.fields);
	const list = (key: keyof Design) => {
		const labels = fields.find((f) => f.key === key)!.options.map((o) => String(o.label));
		return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
	};

	const faq = [
		{
			q: 'What is Knit It?',
			a: 'Knit It is a free sweater designer that runs in your browser. You pick a garment, size, fit, neckline, sleeves, edge finishes, yarn weight and colours, watch the result update on a 3D model, and get a written knitting pattern with stitch counts worked out for that exact design.'
		},
		{
			q: 'Is Knit It free?',
			a: 'Yes. There is no account, no payment and nothing to install. Open the designer, make your choices and print the pattern.'
		},
		{
			q: 'What can I design?',
			a: `Garment types: ${list('garment')}. Made for: ${list('wearer')}. Sizes: ${list('size')}. Fit: ${list('fit')}. Body length: ${list('bodyLength')}. Necklines: ${list('neckline')}. Sleeve length: ${list('sleeveLength')}. Sleeve shape: ${list('sleeveShape')}. Hem and cuff finishes: ${list('hemFinish')}. Fabric: ${list('pattern')}, in ${colors.length} colours.`
		},
		{
			q: 'Which designs come with a written pattern?',
			a: 'Sweaters, T-shirts and cardigans with raglan sleeves come with a full written pattern, worked top-down. Slipovers and set-in sleeve constructions can be previewed in 3D, and their written patterns are coming soon.'
		},
		{
			q: 'What does the pattern include?',
			a: 'Materials (yarn weight, yardage and skeins per colour, needle sizes, notions), the gauge to match, finished measurements in centimetres and inches, step-by-step instructions for the yoke, body, sleeves, neckband and finishing with the stitch count after each shaping step, a chart for Fair Isle designs, and a list of abbreviations.'
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
			a: 'Yardage is calculated from the fabric area of the finished garment (body, sleeves, yoke and collar) and scaled by gauge, because finer yarn needs more length to cover the same area. Fair Isle adds about 20% for the strands carried behind the work, and contrast colours are estimated separately. Treat it as an estimate and buy a little extra.'
		},
		{
			q: 'Do I need to knit a gauge swatch?',
			a: 'Yes. Every stitch count in the pattern depends on matching the stitch gauge, measured in stockinette after blocking. If your swatch has too many stitches per 4 inches, go up a needle size; too few, go down.'
		},
		{
			q: 'How hard are the patterns?',
			a: 'Each design is rated Beginner or Intermediate. A plain raglan with ribbed edges is rated Beginner. V-necks, I-cord edges, puff sleeves, side slits, folded hems and Fair Isle colourwork make a design Intermediate.'
		},
		{
			q: 'I am new to knitting. Can I follow the pattern?',
			a: 'Yes, if you can cast on, knit, purl and bind off. The pattern has two views. Concise is the bare pattern in standard knitting shorthand. Beginner writes every abbreviation out in words, explains what each part of the sweater is, adds a tip to the steps that trip up first-timers, and links to free tutorials for each technique at the step where you first need it.'
		},
		{
			q: 'Can I keep track of where I am?',
			a: 'Yes. Tick off each step as you finish it, and use the round counter on steps that repeat: it shows which kind of round comes next. Each sleeve is tracked separately. Your design and your place are saved in your browser on that device, with no account, and “Find my place” takes you back to the next step.'
		},
		{
			q: 'How do I save or print a pattern?',
			a: 'Press “Print pattern” in the designer. To keep a copy, choose “Save as PDF” in the print dialog.'
		}
	];

	const jsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url + '/' },
				{ '@type': 'ListItem', position: 2, name: 'How it works', item: SITE.url + '/about' }
			]
		}
	];
</script>

<Seo {title} {description} path="/about" {jsonLd} />

<div class="page">
	<header class="top"><a href="/" aria-label="Knit It home"><Logo size={24} /></a><a class="cta" href="/design">Open the designer</a></header>
	<main>
		<h1>How Knit It works</h1>
		<p class="lede">
			Knit It is a free sweater designer. Choose a garment, size, fit and yarn, see it on a 3D model, and get a written knitting pattern with the stitch
			counts worked out for your design.
		</p>

		<h2>From choices to pattern</h2>
		<ol>
			<li><strong>Design.</strong> Pick the garment type, who it is for, the size and fit, the neckline and the sleeves.</li>
			<li><strong>Details.</strong> Choose how the hem, cuffs and neckband are finished: rib structure, rib length, folded hems, rolled edges or I-cord.</li>
			<li><strong>Yarn.</strong> Choose a yarn weight, which sets the gauge and needle size, then a colour and an optional stripe or Fair Isle pattern. Pick the needle sizes you already have and the pattern uses them where it can.</li>
			<li><strong>Summary.</strong> Check the finished chest and length, the yardage, the number of skeins and the skill level.</li>
			<li><strong>Pattern.</strong> Read the instructions on screen, or print them and save as a PDF.</li>
		</ol>
		<p>The 3D preview updates with every choice, and you can drag it to see the back.</p>

		<h2>Yarn weights</h2>
		<table>
			<thead>
				<tr><th>Yarn weight</th><th>Gauge (sts per 4 in / 10 cm)</th><th>Main needle</th><th>Skein used for estimates</th></tr>
			</thead>
			<tbody>
				{#each yarnWeights as w (w.label)}
					<tr><td>{w.label}</td><td>{w.gauge}</td><td>{needleLabel(w.needle)}</td><td>{w.yardage} yd</td></tr>
				{/each}
			</tbody>
		</table>

		<h2>Questions and answers</h2>
		{#each faq as { q, a } (q)}
			<h3>{q}</h3>
			<p>{a}</p>
		{/each}

		<p class="end"><a class="cta" href="/design">Design a sweater</a></p>
	</main>
	<footer>Knit It is open source. <a href={SITE.source} target="_blank" rel="noopener">View the code on GitHub</a>.</footer>
</div>

<style>
	.page {
		min-height: 100dvh;
		font-size: 15px;
		line-height: 1.6;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		padding: 0 16px;
		border-bottom: 1px solid var(--line);
		font-size: 13px;
	}
	.top a:first-child {
		color: var(--ink);
		font-weight: 600;
		text-decoration: none;
	}
	main {
		max-width: 680px;
		margin: 0 auto;
		padding: 32px 16px 64px;
	}
	h1 {
		font-family: var(--display);
		margin: 0 0 12px;
		font-size: 28px;
		font-weight: 650;
		line-height: 1.2;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}
	.lede {
		font-size: 17px;
		color: var(--muted);
	}
	h2 {
		font-family: var(--display);
		margin: 40px 0 12px;
		font-size: 19px;
		font-weight: 600;
		line-height: 1.3;
	}
	h3 {
		font-family: var(--display);
		margin: 24px 0 4px;
		font-size: 15px;
		font-weight: 600;
	}
	p {
		margin: 0 0 12px;
	}
	ol {
		display: grid;
		gap: 6px;
		margin: 0 0 12px;
		padding-left: 22px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 8px 12px 8px 0;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}
	th {
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 12px;
		border-radius: 6px;
		background: var(--ink);
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		transition: background-color 120ms ease-out, transform 120ms ease-out;
	}
	.cta:active {
		transform: scale(0.97);
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.cta:hover {
			background: #3f3f46;
		}
	}
	.end {
		margin-top: 40px;
	}
	footer {
		max-width: 680px;
		margin: 0 auto;
		padding: 16px 16px 32px;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-size: 13px;
	}
	footer a {
		color: inherit;
	}
	.end .cta {
		height: 40px;
		padding: 0 18px;
		font-size: 14px;
	}
</style>
