<script lang="ts">
	import { onMount } from 'svelte';
	import PatternChoice from '$lib/sweater/PatternChoice.svelte';
	import Choice from '$lib/sweater/Choice.svelte';
	import Stage from '$lib/sweater/Stage.svelte';
	import TopBar from '$lib/sweater/TopBar.svelte';
	import type { Design } from '$lib/sweater/garment';
	import { NEEDLES, mainSizes, needleLabel, pickNeedles } from '$lib/sweater/needles';
		import Needles from '$lib/sweater/Needles.svelte';
	import Measurements from '$lib/sweater/Measurements.svelte';
	import { labelOf, sections, summary, visible } from '$lib/sweater/options';
	import { estimate, writePattern } from '$lib/sweater/pattern';
	import PatternView from '$lib/sweater/PatternView.svelte';
	import { readMotifHash } from '$lib/sweater/library';
	import { CUSTOM_PATTERN } from '$lib/sweater/motifs';
	import { decodeDesign, knittedOf, load, progressAt, save, signature, tasksOf, type Mode, type Progress } from '$lib/sweater/progress';
	import Seo from '$lib/Seo.svelte';

	const title = 'Sweater designer — Knit It';
	const description = 'Design a sweater, cardigan or tee in 3D and get a free written top-down raglan or set-in knitting pattern for your yarn, gauge and size.';

	let design = $state<Design>({
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
		color: '#465e9d',
		contrast: '#faf3dc',
		gauge: 18,
		needle: 0,
		ribNeedle: 0
	});
	/** Needle sizes (mm) the knitter owns. */
	let owned = $state<number[]>([]);
	/** The design as it will be knitted: on the needle chosen in the top bar, or else the knitter's own where they suit the yarn. */
	let knit = $derived<Design>(design.needle ? { ...design, ribNeedle: 0 } : { ...design, ...pickNeedles(design.gauge, owned) });
	// A chosen needle only stands while it suits the yarn: changing the yarn weight starts again from the standard.
	$effect(() => {
		if (design.needle && !mainSizes(design.gauge).includes(design.needle)) design.needle = 0;
	});

	// Three steps to design the garment; the pattern is what they produce, so it is not a step.
	const tabs = sections.map(({ id, label }) => ({ id, label }));
	let tab = $state('design');
	let tabIndex = $derived(tabs.findIndex((t) => t.id === tab));
	let section = $derived(sections.find((s) => s.id === tab));
	let panel = $state<HTMLElement>();
	function go(id: string) {
		tab = id;
		panel?.scrollTo({ top: 0 });
	}

	/** 0 leaves the needle to the sizes the knitter owns, or the standard one for the yarn. */
	function setNeedle(e: Event) {
		design.needle = Number((e.currentTarget as HTMLSelectElement).value);
		design.ribNeedle = 0;
	}

	let est = $derived(estimate(knit));
	let pattern = $derived(writePattern(knit));
	let steps = $derived([...tabs, { id: 'pattern', label: 'Pattern', disabled: !pattern.ok, reason: pattern.ok ? undefined : pattern.reason }]);

	// ── Reading and tracking the pattern ──
	let reading = $derived(tab === 'pattern');
	let mode = $state<Mode>('beginner');
	/** The knitter's place in each pattern they have started, by design signature. */
	let progress = $state<Record<string, Progress>>({});
	let sig = $derived(signature(knit));
	let place = $derived(progress[sig] ?? {});
	/** The step scrolled to in the pattern. The 3D model shows the garment as it is once that step is knitted. */
	let viewing = $state<string>();
	let knitted = $derived(reading && pattern.ok && viewing ? knittedOf(pattern.sections, progressAt(tasksOf(pattern.sections), viewing, place)) : null);
	function setStep(key: string, value: number) {
		const p = (progress[sig] ??= {});
		if (value > 0) p[key] = value;
		else delete p[key];
	}

	// The design, the view and the knitter's place are kept in this browser between visits.
	let restored = $state(false);
	onMount(() => {
		const saved = load(design);
		if (saved.design) design = saved.design;
		// A design opened from a link (the sweaters on the home page) wins over the one saved here.
		const linked = location.hash.startsWith('#d=') ? decodeDesign(location.hash.slice(3), design) : undefined;
		if (linked) {
			design = linked;
			history.replaceState(null, '', location.pathname);
		}
		// A chart sent from the pattern designer goes on the saved sweater, in the colours chosen there.
		const chartLink = readMotifHash(location.hash);
		if (chartLink) {
			design.pattern = CUSTOM_PATTERN;
			design.motif = chartLink.motif;
			if (chartLink.color) design.color = chartLink.color;
			if (chartLink.contrast) design.contrast = chartLink.contrast;
			tab = 'yarn';
			history.replaceState(null, '', location.pathname);
		}
		if (saved.mode) mode = saved.mode;
		owned = saved.needles;
		progress = saved.progress;
		// Someone who has started knitting comes back to knit: open where they left off.
		if (Object.keys(saved.progress[sig] ?? {}).length && pattern.ok) tab = 'pattern';
		restored = true;
	});
	$effect(() => {
		const state = { design: $state.snapshot(design), mode, needles: $state.snapshot(owned), progress: $state.snapshot(progress) };
		if (restored) save(state, sig);
	});
</script>

<Seo {title} {description} path="/design" />

<div class="app">
	<TopBar {steps} {tab} onTab={go} />
	<div class="layout" class:reading>
		<aside bind:this={panel}>
			{#if reading}
				<div class="back">
					<button type="button" onclick={() => go('design')}><span aria-hidden="true">←</span> Edit design</button>
					<span>{summary(design)}</span>
				</div>
			{/if}
			<div id="panel" role="tabpanel" aria-label={steps.find((t) => t.id === tab)?.label}>
				{#if tab === 'pattern'}
					<div class="sheet">
						<PatternView {pattern} main={design.color} contrast={design.contrast} bind:mode progress={place} interactive onstep={setStep} onview={(key) => (viewing = key)} onreset={() => delete progress[sig]} />
					</div>
				{:else if section}
					{#each section.groups as group (group.id)}
						{@const fields = visible(group, design)}
						{#if fields.length}
							<section>
								<h2>{group.label}</h2>
								{#each fields as field (field.key)}
									<div class="field">
										<div class="label"><span>{field.label}</span>{#if field.kind === 'color'}<em>{labelOf(field, design)}</em>{/if}</div>
										{#if field.key === 'pattern'}
											<PatternChoice bind:design />
										{:else}
											<Choice {field} bind:design />
										{/if}
										{#if field.key === 'size' && design.size === 'Custom' && design.custom}
											<Measurements bind:design />
										{/if}
									</div>
								{/each}
							</section>
						{/if}
					{/each}
					{#if section.id === 'yarn'}
						<section>
							<h2>Needles</h2>
							<div class="field">
								<div class="label"><span>Main needle</span><em>{needleLabel(est.needles.main)}</em></div>
								<select aria-label="Main needle" value={design.needle} onchange={setNeedle}>
									<option value={0}>Automatic</option>
									{#each NEEDLES.filter((n) => mainSizes(design.gauge).includes(n.mm)) as n (n.mm)}
										<option value={n.mm}>{needleLabel(n.mm)}</option>
									{/each}
								</select>
							</div>
							<div class="field">
								<div class="label"><span>Sizes you have</span></div>
								<Needles design={knit} bind:owned />
							</div>
						</section>
					{/if}
				{/if}
			</div>
			{#if !reading}
				<div class="steps">
					{#if tabIndex > 0}
						<button type="button" class="step" onclick={() => go(tabs[tabIndex - 1].id)}>Back</button>
					{/if}
					{#if tabIndex < tabs.length - 1}
						<button type="button" class="step next" onclick={() => go(tabs[tabIndex + 1].id)}>Next: {tabs[tabIndex + 1].label}</button>
					{:else}
						<button type="button" class="step next" onclick={() => go('pattern')} disabled={!pattern.ok} title={pattern.ok ? undefined : pattern.reason}>Get my pattern</button>
					{/if}
				</div>
			{/if}
		</aside>
		<main>
			<div class="stage"><Stage design={knit} {knitted} /></div>
			<div class="pattern">
				<dl>
					<div><dt>Yarn</dt><dd>{est.yards} yd · {est.skeins} {est.skeins === 1 ? 'skein' : 'skeins'}</dd></div>
					<div><dt>Needles</dt><dd>{needleLabel(est.needles.main)}</dd></div>
					<div><dt>Gauge</dt><dd>{est.gauge} sts / 4 in</dd></div>
					<div><dt>Skill</dt><dd>{est.level}</dd></div>
				</dl>
				{#if tab !== 'pattern' && pattern.ok}
					<button type="button" class="step view" onclick={() => go('pattern')}>Get my pattern</button>
				{/if}
				<button type="button" class="save" onclick={() => window.print()} disabled={!pattern.ok} title={pattern.ok ? 'Print, or choose “Save as PDF” in the print dialog' : pattern.reason}>
					Print pattern
				</button>
			</div>
		</main>
	</div>
</div>
<div class="print-only"><PatternView {pattern} main={design.color} contrast={design.contrast} {mode} /></div>

<style>
	/* The designer wears the homepage's colours: cream paper, navy ink, terracotta for the thing to press next. */
	.app {
		--ink: #26335f;
		--ink-hover: #36457a;
		--on-ink: #faf3dc;
		--muted: #5d6385;
		--line: #e6dcc0;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--here: #e9efe0;
		--good: #4f7a58;
		--link: #3d5aa8;
		--radius: 7px;
		--hairline: rgb(38 51 95 / 0.12);
		--chrome: color-mix(in srgb, var(--surface) 82%, transparent);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		--stage-a: #fdf9ec;
		--stage-b: #f4e9c8;
		--stage-c: #e8d9ab;
		display: flex;
		flex-direction: column;
		height: 100dvh;
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.layout {
		display: grid;
		grid-template-columns: 400px minmax(0, 1fr);
		flex: 1;
		min-height: 0;
	}
	aside {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 16px;
		border-right: 1px solid var(--hairline);
		background: var(--surface);
	}
	/* ── Reading the pattern: the text takes the wide column, the model steps aside ── */
	.layout.reading {
		grid-template-columns: minmax(0, 1fr) clamp(260px, 30%, 420px);
	}
	.reading aside {
		--column: 720px;
		--gutter: max(16px, (100% - var(--column)) / 2);
		--sticky-top: 50px;
		padding-inline: var(--gutter);
	}
	.reading .back {
		margin-inline: calc(-1 * var(--gutter));
		padding-inline: var(--gutter);
	}
	.reading .pattern dl {
		display: none;
	}
	.reading .pattern {
		justify-content: flex-end;
	}
	/* In the pattern the steps give way to a plain way back to the design. */
	.back {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 12px;
		box-sizing: border-box;
		height: 50px;
		flex: none;
		border-bottom: 1px solid var(--hairline);
		background: var(--chrome);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
	}
	.back button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: none;
		height: 30px;
		margin-left: -8px;
		padding: 0 8px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out;
	}
	.back span:last-child {
		min-width: 0;
		overflow: hidden;
		color: var(--muted);
		font-size: 12px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.back button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 0;
	}
	.step:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (hover: hover) and (pointer: fine) {
		.back button:hover {
			background: var(--wash);
		}
		.step:hover {
			background: var(--wash);
		}
		.step.next:hover:not(:disabled) {
			background: #d0604a;
		}
	}
	section {
		padding: 16px 0 18px;
		border-bottom: 1px solid var(--hairline);
	}
	section:last-child {
		border-bottom: 0;
	}
	#panel {
		flex: 1 0 auto;
		padding-bottom: 24px;
	}
	/* Pinned to the bottom of the panel so Back/Next never move between steps. */
	.steps {
		position: sticky;
		bottom: 0;
		z-index: 2;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		flex-shrink: 0;
		margin: 0 -16px;
		padding: 10px 16px;
		border-top: 1px solid var(--hairline);
		background: var(--chrome);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
	}
	.step,
	.save {
		height: 32px;
		padding: 0 14px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		box-shadow: 0 1px 1px rgb(38 51 95 / 0.08);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		transition: background-color 120ms ease-out, filter 120ms ease-out;
	}
	.step {
		grid-column: 1;
	}
	.step.next,
	.save {
		grid-column: 2;
		border-color: var(--accent-deep);
		background: var(--accent);
		box-shadow: 0 1px 1px rgb(0 0 0 / 0.15), inset 0 1px 0 rgb(255 255 255 / 0.18);
		color: #fff8e6;
	}
	.step:disabled,
	.save:disabled {
		border-color: var(--line);
		background: var(--wash);
		box-shadow: none;
		color: var(--muted);
	}
	.step:active:not(:disabled),
	.save:active:not(:disabled) {
		filter: brightness(0.93);
	}
	h2 {
		margin: 0 0 10px;
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.field + .field {
		margin-top: 12px;
	}
	.field select {
		width: 100%;
		height: 38px;
		padding: 0 10px;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-size: 14px;
		cursor: pointer;
	}
	.field select:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 5px;
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
	}
	em {
		font-style: normal;
		color: var(--ink);
	}
	main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
	}
	.stage {
		flex: 1;
		min-height: 0;
	}
	.pattern {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: none;
		padding: 10px 16px;
		border-top: 1px solid var(--hairline);
		background: var(--surface);
	}
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 28px;
		flex: 1;
		margin: 0;
	}
	dt {
		font-size: 12px;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.step.view {
		flex: none;
		white-space: nowrap;
	}
	.print-only {
		display: none;
	}
	@media print {
		:global(body) {
			background: #fff;
		}
		.app {
			display: none;
		}
		.print-only {
			display: block;
			max-width: 170mm;
			margin: 0 auto;
		}
	}
	.save:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (max-width: 760px) {
		.app {
			height: auto;
			min-height: 100dvh;
		}
		.layout {
			display: flex;
			flex-direction: column-reverse;
		}
		main {
			position: sticky;
			top: 0;
			z-index: 1;
			border-bottom: 1px solid var(--line);
		}
		.stage {
			flex: none;
			height: 40dvh;
		}
		.pattern {
			padding: 8px 12px;
		}
		dl {
			gap: 2px 16px;
		}
		.step.view {
			display: none;
		}
		aside {
			overflow: visible;
			border-right: 0;
		}
		.back {
			position: static;
		}
		/* On a phone the pattern gets the whole screen. */
		.reading main {
			position: static;
		}
		.reading .stage {
			display: none;
		}
		.reading aside {
			--sticky-top: 0px;
		}
	}
</style>
