<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import { primer, spellOut, techniques, techniquesIn, type Technique } from './learn';
	import type { Pattern, PatternSection, Step } from './pattern';
	import { doneOf, isDone, stepKey, summarize, tasksOf, type Mode, type Progress, type Task } from './progress';

	let {
		pattern,
		contrast = '#c8543e',
		main = '#465e9d',
		mode = $bindable('concise'),
		progress = {},
		interactive = false,
		onstep,
		onview,
		onreset
	}: {
		pattern: Pattern;
		contrast?: string;
		main?: string;
		/** 'concise' is the bare pattern; 'beginner' writes the shorthand out and adds tips and tutorials. */
		mode?: Mode;
		progress?: Progress;
		/** Off for the printed copy: no controls, and empty boxes to tick with a pen. */
		interactive?: boolean;
		onstep?: (key: string, value: number) => void;
		/** Told which step is being read as the pattern scrolls; undefined above the first step. */
		onview?: (key: string | undefined) => void;
		onreset?: () => void;
	} = $props();

	/** Split "Cast on **86** sts" into plain and bold parts. */
	const parts = (s: string) => s.split(/\*\*(\d+)\*\*/).map((text, i) => ({ text, bold: i % 2 === 1 }));
	const CELL = 14;

	let beginner = $derived(mode === 'beginner');
	const say = (s: string) => (beginner ? spellOut(s) : s);

	let sections = $derived(pattern.ok ? pattern.sections : []);
	let tasks = $derived(tasksOf(sections));
	let status = $derived(summarize(tasks, progress));
	let cardigan = $derived(sections.some((s) => s.id === 'bands'));

	/** Tutorials for each step of a section, each linked only where the section first needs it. */
	function linksOf(s: PatternSection): Technique[][] {
		const seen = new Set<string>();
		return s.steps.map((step) =>
			techniquesIn(step.text).filter((t) => {
				if (seen.has(t.id)) return false;
				seen.add(t.id);
				return true;
			})
		);
	}
	let used = $derived(techniques.filter((t) => sections.some((s) => s.steps.some((step) => t.match.test(step.text)))));

	// ── Sections worked twice (sleeves): which pass is showing ──
	let chosen = $state<Record<string, number>>({});
	const passTasks = (id: string, pass: number) => tasks.filter((t) => t.section === id && t.pass === pass);
	/** Until the knitter picks one, show the first pass that still has something to do. */
	const passOf = (s: PatternSection) => (s.twice ? (chosen[s.id] ?? (passTasks(s.id, 0).every((t) => isDone(t, progress)) && !passTasks(s.id, 1).every((t) => isDone(t, progress)) ? 1 : 0)) : 0);
	const tally = (id: string, pass?: number) => {
		const list = tasks.filter((t) => t.section === id && (pass === undefined || t.pass === pass));
		return { done: list.filter((t) => isDone(t, progress)).length, total: list.length };
	};

	const taskOf = (s: PatternSection, pass: number, step: Step, index: number): Task => ({ key: stepKey(s.id, pass, index), section: s.id, pass, index, step, total: step.tally?.rows.length || 1 });
	const plural = (unit: string, n: number) => `${n} ${unit.toLowerCase()}${n === 1 ? '' : 's'}`;

	// ── Which step is being read: the last one to have scrolled up past a line just below the middle of the view ──
	let article = $state<HTMLElement>();
	let viewing = $state<string>();
	/** Which pass of each section is on the page; the steps to look for change with it. */
	let passes = $derived(sections.map(passOf).join());
	$effect(() => {
		if (!interactive || !onview || !article) return;
		const root = article;
		const tell = onview;
		let last = untrack(() => viewing);
		let scroller: HTMLElement | null = root.parentElement;
		while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
		const look = () => {
			const el = scroller ?? document.documentElement;
			const top = scroller ? scroller.getBoundingClientRect().top : 0;
			const h = el.clientHeight;
			// Near the end the line slides down to the bottom edge, so the last steps get their turn too.
			const left = el.scrollHeight - h - el.scrollTop;
			const line = top + h * (0.6 + 0.4 * Math.max(0, 1 - left / (0.4 * h)));
			let key: string | undefined;
			for (const li of root.querySelectorAll<HTMLElement>('li[data-step]')) {
				if (li.getBoundingClientRect().top > line) break;
				key = li.dataset.step;
			}
			if (key !== last) tell((viewing = last = key));
		};
		// The steps move when the text changes (beginner tips, the other sleeve), not only on scroll.
		void [passes, mode];
		look();
		const target = scroller ?? window;
		target.addEventListener('scroll', look, { passive: true });
		const resized = new ResizeObserver(look);
		resized.observe(root);
		return () => {
			target.removeEventListener('scroll', look);
			resized.disconnect();
		};
	});
	onDestroy(() => onview?.(undefined));

	async function resume() {
		const t = status.current;
		if (!t) return;
		chosen[t.section] = t.pass;
		await tick();
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		document.getElementById(`step-${t.key}`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
	}
	function reset() {
		if (confirm('Clear every tick and round count for this pattern?')) onreset?.();
	}
</script>

{#snippet rich(s: string)}{#each parts(s) as p, i (i)}{#if p.bold}<b>{p.text}</b>{:else}{p.text}{/if}{/each}{/snippet}

{#snippet link(t: { label: string; url: string; source: string })}<a href={t.url} target="_blank" rel="noopener noreferrer">{t.label}</a> <span class="source">({t.source})</span>{/snippet}

{#snippet item(s: PatternSection, pass: number, step: Step, i: number, links: Technique[])}
	{@const t = taskOf(s, pass, step, i)}
	{@const n = doneOf(t, progress)}
	{@const done = !step.note && n >= t.total}
	<li id={interactive ? `step-${t.key}` : undefined} data-step={interactive && !step.note ? t.key : undefined} class:viewing={interactive && !step.note && viewing === t.key} class:note={step.note} class:done={interactive && done} class:current={interactive && status.current?.key === t.key}>
		{#if step.note}
			<span class="mark" aria-hidden="true"></span>
		{:else if interactive}
			<input type="checkbox" checked={done} aria-label="Done: {say(step.text).replace(/\*\*/g, '').slice(0, 80)}" onchange={(e) => onstep?.(t.key, e.currentTarget.checked ? t.total : 0)} />
		{:else}
			<span class="mark box" aria-hidden="true"></span>
		{/if}
		<div class="what">
			<span class="text">{@render rich(say(step.text))}</span>
			{#if step.count}<span class="count">{beginner ? 'You should now have ' : ''}{@render rich(say(step.count))}</span>{/if}
			{#if step.tally && interactive}
				{@const unit = step.tally.unit}
				<div class="tally">
					<div class="now" aria-live="polite">
						{#if n < t.total}
							<strong>{unit} {step.tally.first + n}</strong>
							<span>{@render rich(say(step.tally.rows[n]))}</span>
						{:else}
							<strong>All {plural(unit, t.total)} done</strong>
						{/if}
					</div>
					<span class="of">{n} / {t.total}</span>
					<button type="button" class="minus" disabled={n === 0} aria-label="Undo one {unit.toLowerCase()}" onclick={() => onstep?.(t.key, n - 1)}>−</button>
					<button type="button" class="plus" disabled={n >= t.total} onclick={() => onstep?.(t.key, n + 1)}>{unit} done</button>
					<div class="meter" aria-hidden="true"><i style:width="{(n / t.total) * 100}%"></i></div>
				</div>
			{/if}
			{#if beginner && step.tip}<p class="tip">{step.tip}</p>{/if}
			{#if beginner && links.length}
				<p class="learn">
					<span>How to:</span>
					{#each links as l, j (l.id)}{#if j}<span class="sep" aria-hidden="true">·</span>{/if}{@render link(l)}{/each}
				</p>
			{/if}
		</div>
	</li>
{/snippet}

<article class="pattern" class:interactive bind:this={article}>
	{#if !pattern.ok}
		<p class="unsupported">{pattern.reason}</p>
	{:else}
		<header>
			<h1>{pattern.title}</h1>
			<p class="meta">Top-down {pattern.sleeveless ? 'seamless' : pattern.construction.toLowerCase()} · {pattern.level}</p>
		</header>

		{#if interactive}
			<div class="bar">
				<div class="modes" role="group" aria-label="How much explanation to show">
					<button type="button" aria-pressed={!beginner} onclick={() => (mode = 'concise')}>Concise</button>
					<button type="button" aria-pressed={beginner} onclick={() => (mode = 'beginner')}>Beginner</button>
				</div>
				<div class="place">
					<div class="meter" role="progressbar" aria-label="Steps done" aria-valuemin="0" aria-valuemax={status.total} aria-valuenow={status.done}><i style:width="{(status.done / status.total) * 100}%"></i></div>
					<span>{status.done} of {status.total} steps</span>
				</div>
				{#if status.current && Object.keys(progress).length}
					<button type="button" class="ghost" onclick={resume}>Find my place</button>
				{/if}
				{#if Object.keys(progress).length}
					<button type="button" class="ghost" onclick={reset}>Reset</button>
				{/if}
			</div>
		{/if}

		{#if beginner}
			<section class="primer">
				<h2>Before you start</h2>
				{#each primer(cardigan, pattern.construction === 'Set-in', pattern.sleeveless) as p (p.title)}
					<div class="point">
						<h3>{p.title}</h3>
						<p>{p.body}</p>
						{#if p.links.length}
							<p class="learn">{#each p.links as l, j (l.url)}{#if j}<span class="sep" aria-hidden="true">·</span>{/if}{@render link(l)}{/each}</p>
						{/if}
					</div>
				{/each}
				{#if interactive}<p class="saved">Tick off steps and rounds as you go. Your place is saved in this browser, on this device.</p>{/if}
			</section>
		{/if}

		<section>
			<h2>Materials</h2>
			<dl>
				{#each pattern.materials as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>
		<section>
			<h2>Gauge</h2>
			<p>{pattern.gauge}</p>
		</section>
		<section>
			<h2>Finished measurements</h2>
			<dl class="measure">
				{#each pattern.measurements as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>

		{#each sections as s (s.id)}
			{@const pass = passOf(s)}
			{@const links = linksOf(s)}
			{@const count = tally(s.id)}
			<section>
				<div class="head">
					<h2>{s.title}</h2>
					{#if interactive && count.total}<span class="tag" class:complete={count.done === count.total}>{count.done} / {count.total}</span>{/if}
				</div>
				{#if beginner}<p class="intro">{s.intro}</p>{/if}
				{#if s.twice && interactive}
					<div class="modes passes" role="group" aria-label="Which one you are knitting">
						{#each s.twice as name, p (name)}
							{@const c = tally(s.id, p)}
							<button type="button" aria-pressed={pass === p} onclick={() => (chosen[s.id] = p)}>{name} <span>{c.done}/{c.total}</span></button>
						{/each}
					</div>
				{/if}
				<ol>
					{#each s.steps as step, i (`${pass}.${i}`)}
						{@render item(s, pass, step, i, links[i])}
					{/each}
				</ol>
				{#if s.id === 'body' && pattern.centerpiece}
					{@const rows = pattern.centerpiece.length}
					{@const cols = pattern.centerpiece[0].length}
					<figure>
						<svg viewBox="0 0 {cols * CELL + 24} {rows * CELL}" width={cols * CELL + 24} height={rows * CELL} role="img" aria-label="Centerpiece chart, {cols} stitches by {rows} rows">
							{#each pattern.centerpiece as row, j (j)}
								{#each row as on, i (i)}
									<rect x={i * CELL} y={j * CELL} width={CELL} height={CELL} fill={on ? contrast : main} stroke="rgba(0,0,0,0.25)" stroke-width="0.5" />
								{/each}
								<text x={cols * CELL + 6} y={j * CELL + CELL - 3.5}>{j + 1}</text>
							{/each}
						</svg>
						<figcaption>Centerpiece chart: {cols} sts × {rows} rows, worked once. Work rows 1 → {rows}, top to bottom; read each row right to left.</figcaption>
					</figure>
				{/if}
				{#if s.id === 'colour' && pattern.chart}
					{@const rows = pattern.chart.length}
					{@const cols = pattern.chart[0].length}
					<figure>
						<svg viewBox="0 0 {cols * CELL + 24} {rows * CELL}" width={cols * CELL + 24} height={rows * CELL} role="img" aria-label="{pattern.chartName} chart, {cols} stitches by {rows} rows">
							{#each pattern.chart as row, j (j)}
								{#each row as on, i (i)}
									<rect x={i * CELL} y={j * CELL} width={CELL} height={CELL} fill={on ? contrast : main} stroke="rgba(0,0,0,0.25)" stroke-width="0.5" />
								{/each}
								<text x={cols * CELL + 6} y={j * CELL + CELL - 3.5}>{j + 1}</text>
							{/each}
						</svg>
						<figcaption>Chart: {cols} sts × {rows} rows. Work rows 1 → {rows}, top to bottom; read each row right to left.</figcaption>
					</figure>
				{/if}
			</section>
		{/each}

		{#if beginner && used.length}
			<section>
				<h2>Techniques in this pattern</h2>
				<ul class="refs">
					{#each used as t (t.id)}<li>{@render link(t)}</li>{/each}
				</ul>
			</section>
		{/if}

		<section>
			<h2>Abbreviations</h2>
			<dl class="abbr">
				{#each pattern.abbreviations as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>
	{/if}
</article>

<style>
	.pattern {
		font-size: 13px;
		line-height: 1.5;
	}
	.pattern.interactive {
		font-size: 15px;
		line-height: 1.55;
	}
	header {
		padding: 14px 0 10px;
		border-bottom: 1px solid var(--line, #dcdce0);
	}
	.interactive header {
		padding: 22px 0 14px;
	}
	h1 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.3;
	}
	.interactive h1 {
		font-size: 22px;
		letter-spacing: -0.01em;
	}
	.meta {
		margin: 2px 0 0;
		color: var(--muted, #6b6b74);
	}
	section {
		padding: 14px 0;
		border-bottom: 1px solid var(--line, #dcdce0);
	}
	.interactive section {
		padding: 22px 0;
	}
	section:last-child {
		border-bottom: 0;
	}
	h2 {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 600;
	}
	.interactive h2 {
		font-size: 17px;
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.tag {
		color: var(--muted, #6b6b74);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.tag.complete {
		color: var(--good, #23714c);
		font-weight: 600;
	}
	p {
		margin: 0;
	}
	dl {
		display: grid;
		gap: 6px;
		margin: 0;
	}
	dl div {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 10px;
	}
	.measure div {
		grid-template-columns: 1fr auto;
	}
	.abbr div {
		grid-template-columns: 70px 1fr;
	}
	.interactive dl div {
		grid-template-columns: 130px 1fr;
	}
	.interactive .measure div {
		grid-template-columns: 1fr auto;
	}
	.interactive .abbr div {
		grid-template-columns: 90px 1fr;
	}
	dt {
		color: var(--muted, #6b6b74);
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	/* ── Toolbar ── */
	.bar {
		position: sticky;
		top: var(--sticky-top, 0px);
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin: 0 -16px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--line, #dcdce0);
		background: var(--surface, #fff);
		font-size: 13px;
	}
	.modes {
		display: inline-flex;
		padding: 2px;
		border-radius: 8px;
		background: var(--wash, #f4f4f5);
	}
	.modes button {
		height: 30px;
		padding: 0 12px;
		border: 0;
		border-radius: var(--radius, 6px);
		background: none;
		color: var(--muted, #6b6b74);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
	}
	.modes button[aria-pressed='true'] {
		background: var(--surface, #fff);
		color: var(--ink, #18181b);
		box-shadow: 0 0 0 1px var(--line, #dcdce0);
	}
	.modes button span {
		margin-left: 4px;
		color: var(--muted, #6b6b74);
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	}
	.passes {
		margin: 4px 0 12px;
	}
	.place {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		min-width: 150px;
		color: var(--muted, #6b6b74);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.meter {
		flex: 1;
		height: 4px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--wash, #f4f4f5);
	}
	.meter i {
		display: block;
		height: 100%;
		border-radius: 2px;
		background: var(--good, #23714c);
		transition: width 160ms ease-out;
	}
	.ghost,
	.minus,
	.plus {
		height: 30px;
		padding: 0 10px;
		border: 1px solid var(--line, #dcdce0);
		border-radius: var(--radius, 6px);
		background: var(--surface, #fff);
		color: var(--ink, #18181b);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: transform 120ms ease-out;
	}
	button:active:not(:disabled) {
		transform: scale(0.97);
	}
	button:focus-visible,
	input:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--focus, #2563eb);
		outline-offset: 2px;
	}
	button:disabled {
		color: var(--muted, #6b6b74);
		opacity: 0.5;
		cursor: default;
	}

	/* ── Steps ── */
	ol {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.interactive ol {
		gap: 2px;
		margin: 0 -10px;
	}
	li {
		display: grid;
		grid-template-columns: 14px minmax(0, 1fr);
		gap: 8px;
		align-items: start;
		break-inside: avoid;
	}
	.interactive li {
		grid-template-columns: 20px minmax(0, 1fr);
		gap: 12px;
		padding: 9px 10px;
		border-radius: 8px;
		scroll-margin-top: 120px;
	}
	/* The step the 3D model is showing. */
	li.viewing {
		box-shadow: inset 3px 0 0 var(--line, #d9dbe0);
	}
	/* On a phone the model is hidden while reading. */
	@media (max-width: 760px) {
		li.viewing:not(.current) {
			box-shadow: none;
		}
	}
	li.current {
		background: var(--here, #f1f6f3);
		box-shadow: inset 3px 0 0 var(--good, #23714c);
	}
	li.done .text,
	li.done .count {
		color: var(--muted, #6b6b74);
	}
	li.note .text {
		color: var(--ink, #18181b);
	}
	input[type='checkbox'] {
		width: 20px;
		height: 20px;
		margin: 2px 0 0;
		accent-color: var(--good, #23714c);
		cursor: pointer;
	}
	.mark {
		width: 11px;
		height: 11px;
		margin-top: 4px;
	}
	.interactive .mark {
		margin: 6px 0 0 4px;
	}
	.box {
		border: 1px solid var(--muted, #6b6b74);
		border-radius: 2px;
	}
	/* A definition or heading: a dash where the tick box would be. */
	.note > .mark::before {
		content: '';
		display: block;
		width: 8px;
		margin-top: 5px;
		border-top: 1px solid var(--muted, #6b6b74);
	}
	.count {
		display: block;
		margin-top: 1px;
		color: var(--muted, #6b6b74);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.interactive .count {
		margin-top: 3px;
		font-size: 13px;
	}
	.count :global(b) {
		color: var(--ink, #18181b);
	}
	li.done .count :global(b) {
		color: inherit;
	}
	b {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	/* ── Round counter ── */
	.tally {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto auto;
		gap: 8px;
		align-items: center;
		margin-top: 8px;
		padding: 8px 8px 8px 12px;
		border: 1px solid var(--line, #dcdce0);
		border-radius: 8px;
		background: var(--surface, #fff);
		font-size: 13px;
	}
	.now {
		display: flex;
		flex-wrap: wrap;
		gap: 0 8px;
		min-width: 0;
	}
	.now strong {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.now span,
	.of {
		color: var(--muted, #6b6b74);
		font-variant-numeric: tabular-nums;
	}
	.minus {
		width: 34px;
		height: 34px;
		padding: 0;
		font-size: 16px;
	}
	.plus {
		height: 34px;
		padding: 0 14px;
		border-color: var(--ink, #18181b);
		background: var(--ink, #18181b);
		color: var(--on-ink, #fff);
	}
	.plus:disabled {
		border-color: var(--line, #dcdce0);
		background: var(--wash, #f4f4f5);
	}
	.tally .meter {
		grid-column: 1 / -1;
		height: 3px;
	}

	/* ── Beginner help ── */
	.intro {
		margin: -2px 0 12px;
		color: var(--muted, #6b6b74);
	}
	.tip {
		margin-top: 8px;
		padding: 8px 12px;
		border-left: 2px solid var(--line, #dcdce0);
		border-radius: 0 6px 6px 0;
		background: var(--wash, #f4f4f5);
		font-size: 0.92em;
	}
	li.current .tip {
		background: var(--surface, #fff);
	}
	.learn {
		margin-top: 6px;
		font-size: 0.87em;
	}
	.learn > span:first-child {
		color: var(--muted, #6b6b74);
	}
	a {
		color: var(--link, #1d4ed8);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
		text-underline-offset: 2px;
	}
	.source {
		color: var(--muted, #6b6b74);
	}
	.sep {
		margin: 0 6px;
		color: var(--muted, #6b6b74);
	}
	.primer {
		display: grid;
		gap: 14px;
	}
	.primer h2 {
		margin: 0;
	}
	h3 {
		margin: 0 0 2px;
		font-size: inherit;
		font-weight: 600;
	}
	.saved {
		color: var(--muted, #6b6b74);
		font-size: 0.87em;
	}
	.refs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 4px 20px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.refs li {
		display: block;
		padding: 0;
	}

	figure {
		margin: 12px 0 0;
	}
	svg {
		display: block;
		max-width: 100%;
		height: auto;
	}
	svg text {
		font-size: 9px;
		fill: var(--muted, #6b6b74);
		font-variant-numeric: tabular-nums;
	}
	figcaption {
		margin-top: 6px;
		color: var(--muted, #6b6b74);
		font-size: 12px;
	}
	.unsupported {
		margin: 16px 0;
		padding: 12px;
		border: 1px solid var(--line, #dcdce0);
		border-radius: var(--radius, 6px);
		background: var(--wash, #f4f4f5);
	}
	@media (hover: hover) and (pointer: fine) {
		.ghost:hover,
		.minus:hover:not(:disabled) {
			background: var(--wash, #f4f4f5);
		}
		.plus:hover:not(:disabled) {
			background: var(--ink-hover, #3f3f46);
		}
		.modes button:hover {
			color: var(--ink, #18181b);
		}
		a:hover {
			text-decoration-color: currentColor;
		}
	}
	@media (pointer: coarse) {
		.minus,
		.plus {
			height: 44px;
		}
		.minus {
			width: 44px;
		}
		.modes button,
		.ghost {
			height: 36px;
		}
		input[type='checkbox'] {
			width: 24px;
			height: 24px;
			margin-top: 0;
		}
		.interactive li {
			grid-template-columns: 24px minmax(0, 1fr);
		}
	}
	@media (max-width: 480px) {
		.tally {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}
		.now {
			grid-column: 1 / -1;
		}
		.of {
			justify-self: start;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.meter i,
		button {
			transition: none;
		}
	}
	@media print {
		.pattern {
			font-size: 10.5pt;
		}
		h1 {
			font-size: 15pt;
		}
		h2 {
			font-size: 11pt;
		}
		.count {
			font-size: 9.5pt;
		}
		a {
			color: inherit;
			text-decoration: none;
		}
		.tip {
			background: none;
		}
	}
</style>
