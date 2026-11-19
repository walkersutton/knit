<script module lang="ts">
	import type { Design } from '$lib/sweater/garment';
	/** What the library sidebar or the chart designer hands over: a saved sweater to open, or a chart to put on this one. */
	export type Incoming = { design?: Design; chart?: { motif: string; color?: string; contrast?: string } };
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import PatternChoice from '$lib/sweater/PatternChoice.svelte';
	import CenterpiecePicker from '$lib/sweater/CenterpiecePicker.svelte';
	import Choice from '$lib/sweater/Choice.svelte';
	import Stage from '$lib/sweater/Stage.svelte';
	import Stepper from '$lib/sweater/Stepper.svelte';
	import HeaderSlot from '$lib/HeaderSlot.svelte';
	import AccountLink from '$lib/AccountLink.svelte';
	import HowItWorks from '$lib/sweater/HowItWorks.svelte';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import { NEEDLES, mainSizes, needleLabel, pickNeedles } from '$lib/sweater/needles';
		import Needles from '$lib/sweater/Needles.svelte';
	import Measurements from '$lib/sweater/Measurements.svelte';
	import { labelOf, sections, summary, visible } from '$lib/sweater/options';
	import { centerpieceBox, estimate, writePattern } from '$lib/sweater/pattern';
	import PatternView from '$lib/sweater/PatternView.svelte';
	import { readMotifHash, wantsChart } from '$lib/sweater/library';
	import { saveDesign, type SavedDesign } from '$lib/sweater/designs';
	import { CUSTOM_PATTERN } from '$lib/sweater/motifs';
	import { decodeDesign, encodeDesign, load, save, signature, type Mode, type Progress } from '$lib/sweater/progress';

	let { incoming, active, onconsumed, onsaved, onremove, onEditChart }: { incoming?: Incoming; active?: SavedDesign; onconsumed?: () => void; onsaved?: (id: string) => void; onremove?: () => void; onEditChart: (motif: string) => void } = $props();

	let design = $state<Design>({ ...DEFAULT_DESIGN });
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
		// The pattern is its own page, so it has a link of its own and the designer stays for designing.
		if (id === 'pattern') {
			if (pattern.ok) goto(`/pattern/view#d=${encodeDesign(knit)}`);
			return;
		}
		tab = id;
		panel?.scrollTo({ top: 0 });
	}

	/** 0 leaves the needle to the sizes the knitter owns, or the standard one for the yarn. */
	function setNeedle(e: Event) {
		design.needle = Number((e.currentTarget as HTMLSelectElement).value);
		design.ribNeedle = 0;
	}

	let est = $derived(estimate(knit));
	/** The body as it will be knitted, which says how much room a centerpiece has. */
	let pattern = $derived(writePattern(knit));
	let box = $derived(centerpieceBox(knit, pattern));

	// ── Reading and tracking the pattern ──
	let mode = $state<Mode>('beginner');
	/** The knitter's place in each pattern they have started, by design signature. */
	let progress = $state<Record<string, Progress>>({});
	let sig = $derived(signature(knit));
	/** Shown beside the save button so a save is never silent. */
	let saveNote = $state('');
	let saveTimer: ReturnType<typeof setTimeout>;
	function saveCurrentDesign() {
		const name = prompt('Name this sweater design:', active?.name ?? summary(design));
		if (name === null) return;
		const item = saveDesign(knit, name, active?.id);
		saveNote = item ? (item.id === active?.id ? 'Renamed' : 'Saved to your patterns') : 'Could not save: this browser is out of storage';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => (saveNote = ''), 4000);
		if (item) onsaved?.(item.id);
	}

	function apply({ design: next, chart }: Incoming) {
		if (next) {
			design = next;
		}
		if (chart) {
			design.pattern = CUSTOM_PATTERN;
			design.motif = chart.motif;
			if (chart.color) design.color = chart.color;
			if (chart.contrast) design.contrast = chart.contrast;
			tab = 'yarn';
		}
	}

	// The design, the view and the knitter's place are kept in this browser between visits.
	let restored = $state(false);
	onMount(() => {
		const saved = load(design);
		if (saved.design) design = saved.design;
		// Coming back from the chart designer with a saved pattern still open: carry on with that pattern.
		if (active) design = structuredClone($state.snapshot(active.design));
		// A design opened from a link (the sweaters on the home page) wins over the one saved here.
		const linked = location.hash.startsWith('#d=') ? decodeDesign(location.hash.slice(3), design) : undefined;
		if (linked) {
			design = linked;
			history.replaceState(null, '', location.pathname);
		}
		// A chart sent in a link goes on the saved sweater, in the colours chosen with it.
		const chartLink = wantsChart(location.hash) ? undefined : readMotifHash(location.hash);
		if (chartLink) {
			apply({ chart: chartLink });
			history.replaceState(null, '', location.pathname);
		}
		if (saved.mode) mode = saved.mode;
		owned = saved.needles;
		progress = saved.progress;
		// Someone who has started knitting comes back to knit: open where they left off.
		if (Object.keys(saved.progress[sig] ?? {}).length && pattern.ok) goto(`/pattern/view#d=${encodeDesign(knit)}`, { replaceState: true });
		restored = true;
	});
	// Something handed over by the sidebar or the chart designer, once this page has restored the saved sweater.
	$effect(() => {
		if (!restored || !incoming) return;
		const next = incoming;
		untrack(() => apply(next));
		onconsumed?.();
	});
	// A saved pattern keeps itself up to date as it is edited.
	$effect(() => {
		if (!restored || incoming || !active) return;
		const snapshot = $state.snapshot(design);
		if (JSON.stringify(snapshot) === JSON.stringify(active.design)) return;
		const { id, name } = active;
		const timer = setTimeout(() => saveDesign(snapshot, name, id), 500);
		return () => clearTimeout(timer);
	});
	$effect(() => {
		const state = { design: $state.snapshot(design), mode, needles: $state.snapshot(owned), progress: $state.snapshot(progress) };
		if (restored) save(state, sig);
	});
</script>

{#snippet center()}<Stepper steps={tabs} {tab} onTab={go} />{/snippet}
{#snippet right()}<HowItWorks /><AccountLink />{/snippet}
<!-- Reading the pattern gets the same plain bar as the home and about pages. -->
<HeaderSlot app {center} {right} />

<div class="app">
	<div class="layout">
		<main>
			<div class="stage"><Stage design={knit} /></div>
			<div class="pattern">
				<dl>
					<div><dt>Yarn</dt><dd>{est.yards} yd · {est.skeins} {est.skeins === 1 ? 'skein' : 'skeins'}</dd></div>
					<div><dt>Needles</dt><dd>{needleLabel(est.needles.main)}</dd></div>
					<div><dt>Gauge</dt><dd>{est.gauge} sts / 4 in</dd></div>
					<div><dt>Skill</dt><dd>{est.level}</dd></div>
				</dl>
				{#if pattern.ok}
					<button type="button" class="step view" onclick={() => go('pattern')}>Get my pattern</button>
				{/if}
				<button type="button" class="save" onclick={() => window.print()} disabled={!pattern.ok} title={pattern.ok ? 'Print, or choose “Save as PDF” in the print dialog' : pattern.reason}>
					Print pattern
				</button>
				<button type="button" class="save save-design" onclick={saveCurrentDesign} disabled={!pattern.ok} title="Save this sweater design to your account or this device">{active ? 'Rename design' : 'Save design'}</button>
				{#if active}
					<button type="button" class="step danger" onclick={onremove}>Delete design</button>
				{/if}
				<p class="save-note" role="status">{saveNote}</p>
			</div>
		</main>
		<aside bind:this={panel}>
			<div id="panel" role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
				{#if section}
					{#each section.groups as group (group.id)}
						{@const fields = visible(group, design)}
						{#if fields.length}
							<section>
								<h2>{group.label}</h2>
								{#each fields as field (field.key)}
									<div class="field">
										<div class="label"><span>{field.label}</span>{#if field.kind === 'color'}<em>{labelOf(field, design)}</em>{/if}</div>
										{#if field.key === 'pattern'}
											<PatternChoice bind:design onedit={onEditChart} />
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
						{#if design.garment !== 'Cardigan'}
							<section>
								<h2>Centerpiece</h2>
								<CenterpiecePicker bind:design {box} />
							</section>
						{/if}
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
		</aside>
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
		height: 100%;
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 400px;
		flex: 1;
		min-height: 0;
	}
	aside {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 16px;
		border-left: 1px solid var(--hairline);
		background: var(--surface);
	}
	.step:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (hover: hover) and (pointer: fine) {
		.step:hover {
			background: var(--wash);
		}
		.steps .step:hover:not(:disabled) {
			background: #e6ecf9;
		}
		.steps .step.next:hover:not(:disabled) {
			background: #4d6cbc;
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
	.step.danger {
		grid-column: 1 / -1;
		color: #9b2c1f;
	}
	.save-note {
		grid-column: 1 / -1;
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		text-align: center;
	}
	.save-note:empty {
		display: none;
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
	/* Sidebar Back/Next are blue; the Print/Save buttons keep the accent. */
	.steps .step {
		border-color: var(--link);
		color: var(--link);
	}
	.steps .step.next:not(:disabled) {
		border-color: #2c4585;
		background: var(--link);
		color: #fff;
	}
	.steps .step:disabled,
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
			min-height: calc(100dvh - var(--bar));
		}
		.layout {
			display: flex;
			flex-direction: column;
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
			border-left: 0;
		}
	}
</style>
