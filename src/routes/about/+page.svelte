<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import { SITE } from '$lib/site';
	import { CUSTOM } from '$lib/sweater/fit';
	import { choose } from '$lib/sweater/options';
	import { estimate, writePattern } from '$lib/sweater/pattern';
	import { measure, type Design } from '$lib/sweater/garment';
	import Chrome from './Chrome.svelte';
	import Faq from './Faq.svelte';
	import Garment from './Garment.svelte';
	import { colors, contrastFor, defaultDesign, faq, needleLabel, reveal, steps, tiles, TILE_ROWS, TILE_ST, yarnWeights } from './content';

	const title = 'How Knit It works — custom knitting patterns and FAQ';
	const description =
		'How Knit It turns your choices of garment, size, fit and yarn weight into a 3D preview and a written top-down raglan or set-in knitting pattern, plus answers to common questions.';
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

	// ── The quilt is a small designer: every patch reads and changes the same design. ──
	let design = $state<Design>({ ...defaultDesign });
	const set = (key: keyof Design, value: string | number) => choose(design, key, value);
	const setRib = (rib: string) => (design.bodyRib = design.neckRib = design.sleeveRib = rib);
	const setFinish = (finish: string) => (design.hemFinish = design.cuffFinish = finish);

	const garments = ['Sweater', 'T-shirt', 'Slipover', 'Cardigan'];
	const sizes = ['XS', 'S', 'M', 'L', 'XL'].filter((s) => s !== CUSTOM);
	const ribs = [
		{ name: '1×1', run: [1, 1] },
		{ name: '2×2', run: [2, 2] },
		{ name: '2×1', run: [2, 1] },
		{ name: 'Twisted', run: [1, 1], twist: true }
	];
	const finishes = ['Ribbed', 'Folded hem', 'Rolled edge', 'I-cord'];
	const ribCols = (run: number[]) => {
		const out: boolean[] = [];
		while (out.length < 18) run.forEach((n, i) => out.push(...Array(n).fill(i === 0)));
		return out.slice(0, 18);
	};
	const patterns = ['Solid', 'Stripes', 'Fair isle'];

	let est = $derived(estimate(design));
	let m = $derived(measure(design));
	let pattern = $derived(writePattern(design));
	let contrast = $derived(contrastFor(design.color));
	let colorName = $derived(String(colors.find((c) => c.value === design.color)?.label ?? ''));
	let yarnName = $derived(yarnWeights.find((w) => w.gauge === design.gauge)!.label);
	let excerpt = $derived(pattern.ok ? pattern.sections.find((s) => s.steps.filter((x) => !x.note).length > 2) : undefined);
	let lines = $derived(excerpt ? excerpt.steps.filter((s) => !s.note).slice(0, 3) : []);
	const strip = (s: string) => s.replace(/\*\*/g, '');

	const tone = ['#e9eef8', '#fbe9e3', '#f6efd2', '#e6efe7', '#fffdf5'];
	const span = ['a', 'b', 'c', 'd', 'e'];
</script>

<Seo {title} {description} path="/about" {jsonLd} />

<Chrome wide>
	<section class="hero">
		<p class="kicker" use:reveal>Five patches make a sweater</p>
		<h1 use:reveal={60}>How Knit It works</h1>
		<p class="lede" use:reveal={120}>
			Knit It is a free sweater designer. Choose a garment, size, fit and yarn, see it on a 3D model, and get a written knitting pattern with the stitch
			counts worked out for your design. Try each step below: every choice carries through to the next patch.
		</p>
	</section>

	<ol class="quilt">
		{#each steps as s, i (s.id)}
			<li class="patch {span[i]}" style="--tone:{tone[i]}" use:reveal={i * 70}>
				<div class="stitch">
					<span class="num">{i + 1}</span>
					<h2>{s.name}</h2>
					<p>{s.text}</p>

					{#if s.id === 'design'}
						<div class="art">
							<div class="pick" role="group" aria-label="Garment">
								{#each garments as g (g)}
									<button type="button" class="opt" aria-pressed={design.garment === g} onclick={() => set('garment', g)}>
										<Garment garment={g} color={design.color} pattern={design.pattern} size={64} />
										<span>{g}</span>
									</button>
								{/each}
							</div>
							<div class="chips" role="group" aria-label="Size">
								{#each sizes as z (z)}
									<button type="button" class="chip" aria-pressed={design.size === z} onclick={() => set('size', z)}>{z}</button>
								{/each}
							</div>
						</div>
					{:else if s.id === 'details'}
						<div class="art">
							<div class="chips" role="group" aria-label="Hem and cuff finish">
								{#each finishes as f (f)}
									<button type="button" class="chip" aria-pressed={design.hemFinish === f} onclick={() => setFinish(f)}>{f}</button>
								{/each}
							</div>
							<div class="pick ribs" class:dim={design.hemFinish !== 'Ribbed'} role="group" aria-label="Rib structure">
								{#each ribs as r (r.name)}
									<button type="button" class="opt" aria-pressed={design.bodyRib === r.name} onclick={() => setRib(r.name)}>
										<svg viewBox="0 0 54 40" width="76" height="56" aria-hidden="true">
											<rect width="54" height="40" rx="4" fill={design.color} />
											{#each ribCols(r.run) as knit, c (c)}
												<rect x={c * 3} width="3" height="40" fill={knit ? '#fff' : '#000'} fill-opacity={knit ? 0.14 : 0.24} transform={r.twist ? `skewX(${c % 2 ? -14 : 14})` : undefined} />
											{/each}
										</svg>
										<span>{r.name}</span>
									</button>
								{/each}
							</div>
							<p class="note" aria-live="polite">
								{design.hemFinish === 'Ribbed' ? `Body, cuffs and neckband in ${design.bodyRib} rib.` : `${design.hemFinish} on the body and cuffs; the neckband stays in rib.`}
							</p>
						</div>
					{:else if s.id === 'yarn'}
						<div class="art yarn">
							<div class="controls">
								<div class="group">
									<span class="gl">Colour <b>{colorName}</b></span>
									<div class="dots" role="group" aria-label="Colour">
										{#each colors as c (c.label)}
											<button type="button" class="dot" style="background:{c.value}" aria-label={String(c.label)} aria-pressed={design.color === c.value} onclick={() => set('color', c.value)}></button>
										{/each}
									</div>
								</div>
								<div class="group">
									<span class="gl">Fabric</span>
									<div class="pick" role="group" aria-label="Fabric pattern">
										{#each patterns as p (p)}
											<button type="button" class="opt" aria-pressed={design.pattern === p} onclick={() => set('pattern', p)}>
												<svg viewBox="0 0 {TILE_ST} {TILE_ROWS}" width="44" height="58" shape-rendering="crispEdges" aria-hidden="true">
													<rect width={TILE_ST} height={TILE_ROWS} fill={design.color} />
													{#each tiles[p] ?? [] as [x, y] (`${x}-${y}`)}<rect {x} {y} width="1" height="1" fill={contrast} />{/each}
												</svg>
												<span>{p}</span>
											</button>
										{/each}
									</div>
								</div>
								<div class="group">
									<span class="gl">Yarn weight</span>
									<div class="chips" role="group" aria-label="Yarn weight">
										{#each yarnWeights as w (w.label)}
											<button type="button" class="chip" aria-pressed={design.gauge === w.gauge} onclick={() => set('gauge', w.gauge)}>{w.label}</button>
										{/each}
									</div>
								</div>
							</div>
							<div class="preview">
								<Garment garment={design.garment} color={design.color} pattern={design.pattern} size={150} />
								<span class="pcap">{colorName} {design.garment.toLowerCase()}</span>
							</div>
						</div>
					{:else if s.id === 'summary'}
						<dl class="art stats" aria-live="polite">
							<div><dt>Finished chest</dt>{#key Math.round(m.chest)}<dd class="pop">{Math.round(m.chest)}<small> cm</small></dd>{/key}</div>
							<div><dt>Yardage</dt>{#key est.yards}<dd class="pop">{est.yards.toLocaleString()}<small> yd</small></dd>{/key}</div>
							<div><dt>Skeins</dt>{#key est.skeins}<dd class="pop">{est.skeins}</dd>{/key}</div>
							<div><dt>Level</dt>{#key est.level}<dd class="pop lvl">{est.level}</dd>{/key}</div>
							<p class="needle">{yarnName} on {needleLabel(est.needles.main)} needles.</p>
						</dl>
					{:else}
						<div class="art paper" aria-live="polite">
							{#if pattern.ok && excerpt}
								{#key `${excerpt.title}${design.size}${design.gauge}${design.hemFinish}${design.bodyRib}${design.garment}`}
									<div class="swap">
										<p class="ptitle">{pattern.title} · {excerpt.title}</p>
										{#each lines as l, k (k)}
											<p class="pline">{strip(l.text)}{#if l.count}<span class="count">{strip(l.count)}</span>{/if}</p>
										{/each}
									</div>
								{/key}
							{:else if !pattern.ok}
								<p class="pline soon">{pattern.reason}</p>
							{/if}
						</div>
					{/if}
				</div>
			</li>
		{/each}

		<li class="patch go" use:reveal={100}>
			<div class="stitch">
				<div class="go-art" aria-hidden="true"><Garment garment={design.garment} color={design.color} pattern={design.pattern} size={132} /></div>
				<div class="go-copy">
					<h2>Ready to make it yours?</h2>
					<p class="go-line">
						You just sketched a {colorName.toLowerCase()} {design.garment.toLowerCase()}{design.pattern !== 'Solid' ? ` with ${design.pattern.toLowerCase()}` : ''}, about {est.yards.toLocaleString()} yd of
						{yarnName.toLowerCase()}. The designer has every other choice waiting, and a 3D model to turn around.
					</p>
					<a class="launch" href="/design">Start designing <span class="arrow" aria-hidden="true">→</span></a>
					<small>Free. No account. Runs in your browser.</small>
				</div>
			</div>
		</li>
	</ol>

	<div class="text">
		<h2 class="h">Yarn weights</h2>
		<table>
			<thead><tr><th>Yarn weight</th><th>Gauge (sts per 4 in / 10 cm)</th><th>Main needle</th><th>Skein used for estimates</th></tr></thead>
			<tbody>
				{#each yarnWeights as w (w.label)}
					<tr class:cur={w.gauge === design.gauge}><td>{w.label}</td><td>{w.gauge}</td><td>{needleLabel(w.needle)}</td><td>{w.yardage} yd</td></tr>
				{/each}
			</tbody>
		</table>
		<h2 class="h">Questions and answers</h2>
		<Faq />
	</div>
</Chrome>

<style>
	.hero {
		padding: 16px 0 28px;
	}
	.kicker {
		margin: 0 0 8px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0 0 14px;
		font-family: var(--display);
		font-size: clamp(32px, 6vw, 48px);
		font-weight: 650;
		line-height: 1.08;
		letter-spacing: -0.015em;
	}
	.lede {
		margin: 0;
		max-width: 62ch;
		color: var(--muted);
		font-size: 17px;
	}
	.quilt {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 14px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.a,
	.b {
		grid-column: span 3;
	}
	.c {
		grid-column: span 4;
	}
	.d {
		grid-column: span 2;
	}
	.e,
	.go {
		grid-column: span 6;
	}
	.patch {
		padding: 8px;
		border-radius: 18px;
		background: var(--tone);
		box-shadow:
			0 1px 2px rgba(24, 24, 27, 0.06),
			0 8px 20px rgba(24, 24, 27, 0.05);
	}
	/* The running stitch around each patch. */
	.stitch {
		height: 100%;
		padding: 16px;
		border: 2px dashed #26335f55;
		border-radius: 12px;
	}
	.num {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		margin-bottom: 8px;
		border-radius: 50%;
		background: #465e9d;
		color: #faf3dc;
		font-family: var(--display);
		font-size: 14px;
		font-weight: 600;
	}
	h2 {
		margin: 0 0 4px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 600;
	}
	.stitch > p {
		margin: 0 0 14px;
		max-width: 54ch;
		font-size: 14.5px;
		line-height: 1.5;
	}
	.art {
		display: grid;
		gap: 12px;
		padding: 12px;
		border-radius: 10px;
		background: color-mix(in srgb, #fff 70%, transparent);
	}

	/* Choices */
	.pick {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.opt {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 8px 8px 6px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 12px;
		cursor: pointer;
		transition:
			background-color 150ms ease-out,
			color 150ms ease-out,
			box-shadow 150ms ease-out,
			transform 120ms ease-out;
	}
	.opt[aria-pressed='true'] {
		background: #fff;
		color: var(--ink);
		box-shadow:
			0 0 0 2px #465e9d,
			0 2px 6px rgba(24, 24, 27, 0.1);
	}
	.opt:active,
	.chip:active,
	.dot:active {
		transform: scale(0.95);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 150ms ease-out,
			color 150ms ease-out,
			border-color 150ms ease-out,
			transform 120ms ease-out;
	}
	.chip[aria-pressed='true'] {
		border-color: #465e9d;
		background: #465e9d;
		color: #faf3dc;
	}
	.dots {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.dot {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
		cursor: pointer;
		transition:
			box-shadow 150ms ease-out,
			transform 120ms ease-out;
	}
	.dot[aria-pressed='true'] {
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.14),
			0 0 0 2px #fff,
			0 0 0 4px var(--ink);
	}
	.opt:focus-visible,
	.chip:focus-visible,
	.dot:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.opt:not([aria-pressed='true']):hover {
			background: color-mix(in srgb, #fff 60%, transparent);
			color: var(--ink);
		}
		.chip:not([aria-pressed='true']):hover {
			background: var(--wash);
		}
	}
	.ribs {
		transition: opacity 200ms ease-out;
	}
	.ribs.dim {
		opacity: 0.45;
	}
	.note {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
	}

	/* Yarn */
	.yarn {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 16px;
	}
	.controls {
		display: grid;
		gap: 14px;
	}
	.group {
		display: grid;
		gap: 6px;
	}
	.gl {
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
	}
	.gl b {
		margin-left: 4px;
		color: var(--ink);
		font-weight: 600;
	}
	.preview {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 12px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--paper) 70%, #fff);
		box-shadow: inset 0 0 0 1px #e8dfc3;
	}
	.pcap {
		color: var(--muted);
		font-size: 12px;
	}

	/* Summary */
	.stats {
		grid-template-columns: 1fr;
		gap: 8px;
		margin: 0;
	}
	.stats div {
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--wash);
	}
	dt {
		color: var(--muted);
		font-size: 12px;
	}
	dd {
		margin: 0;
		font-family: var(--display);
		font-size: 24px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.25;
	}
	dd small {
		color: var(--muted);
		font-size: 13px;
		font-weight: 500;
	}
	.lvl {
		font-size: 18px;
		line-height: 30px;
	}
	.pop {
		animation: pop 220ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	@keyframes pop {
		from {
			opacity: 0.3;
			transform: translateY(5px);
		}
	}
	.needle {
		margin: 0;
		color: var(--muted);
		font-size: 12.5px;
	}

	/* Pattern */
	.paper {
		background: #fffdf5;
		box-shadow: inset 0 0 0 1px #e8dfc3;
		font-size: 13.5px;
		min-height: 150px;
	}
	.swap {
		animation: pop 220ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.paper p {
		margin: 0;
	}
	.ptitle {
		margin-bottom: 6px !important;
		font-family: var(--display);
		font-size: 14px;
		font-weight: 600;
	}
	.pline {
		padding: 6px 0;
		border-top: 1px dashed #e0d6b8;
		line-height: 1.45;
	}
	.soon {
		border-top: 0;
		color: var(--muted);
	}
	.count {
		display: inline-block;
		margin-left: 8px;
		padding: 0 7px;
		border-radius: 999px;
		background: #465e9d;
		color: #fff;
		font-size: 11.5px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* Closing patch: the call to action */
	.go {
		background: #465e9d;
		box-shadow:
			0 1px 2px rgba(24, 24, 27, 0.1),
			0 14px 32px rgba(38, 51, 95, 0.28);
	}
	.go .stitch {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 28px;
		padding: 24px 28px;
		border-color: #faf3dc88;
		color: #faf3dc;
	}
	.go-art {
		padding: 14px;
		border-radius: 14px;
		background: #faf3dc;
		transform: rotate(-3deg);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
	}
	.go h2 {
		margin: 0 0 6px;
		font-size: clamp(24px, 4vw, 32px);
		line-height: 1.15;
	}
	.go-line {
		margin: 0 0 18px;
		max-width: 52ch;
		color: #faf3dcd9;
		font-size: 15px;
		line-height: 1.5;
	}
	.launch {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: 52px;
		padding: 0 26px;
		border-radius: 999px;
		background: #faf3dc;
		color: #26335f;
		font-family: var(--display);
		font-size: 18px;
		font-weight: 600;
		text-decoration: none;
		box-shadow: 0 4px 0 #c9bd94;
		transition:
			transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
			box-shadow 140ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.arrow {
		display: inline-block;
		transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.launch:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #c9bd94;
	}
	.launch:focus-visible {
		outline: 2px solid #faf3dc;
		outline-offset: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.launch:hover .arrow {
			transform: translateX(4px);
		}
	}
	.go small {
		display: block;
		margin-top: 12px;
		color: #faf3dcb3;
		font-size: 13px;
	}

	.text {
		max-width: 720px;
		margin: 32px auto 0;
	}
	.h {
		margin: 40px 0 12px;
		font-size: 22px;
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
	tr.cur td {
		background: color-mix(in srgb, #465e9d 9%, transparent);
		font-weight: 600;
	}

	@media (max-width: 800px) {
		.a,
		.b,
		.c,
		.d,
		.e,
		.go {
			grid-column: span 6;
		}
		.yarn {
			grid-template-columns: 1fr;
		}
		.preview {
			order: -1;
		}
		.go .stitch {
			grid-template-columns: 1fr;
			justify-items: start;
			padding: 20px;
		}
		.stats {
			grid-template-columns: 1fr 1fr;
		}
		.needle {
			grid-column: span 2;
		}
	}
	:global(.rv) {
		opacity: 0;
		transform: translateY(12px);
	}
	:global(.rv.rv-in) {
		opacity: 1;
		transform: none;
		transition:
			opacity 300ms ease-out var(--rv-delay, 0ms),
			transform 300ms cubic-bezier(0.23, 1, 0.32, 1) var(--rv-delay, 0ms);
	}
	@media (prefers-reduced-motion: reduce) {
		.pop,
		.swap {
			animation: none;
		}
		.opt,
		.chip,
		.dot,
		.ribs,
		.launch,
		.arrow {
			transition: none;
		}
	}
</style>
