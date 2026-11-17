<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import type { Design } from './garment';
	import { NEEDLES, mainSizes, needleLabel } from './needles';
	import { yarnWeights } from './options';
	import type { estimate } from './pattern';

	type Step = { id: string; label: string; disabled?: boolean; reason?: string };
	let {
		design = $bindable(),
		est,
		steps,
		tab,
		onTab,
		source
	}: {
		design: Design;
		/** The estimate for the design as it will be knitted. */
		est: ReturnType<typeof estimate>;
		steps: Step[];
		tab: string;
		onTab: (id: string) => void;
		source: string;
	} = $props();

	let index = $derived(Math.max(0, steps.findIndex((s) => s.id === tab)));
	let sizes = $derived(NEEDLES.filter((n) => mainSizes(design.gauge).includes(n.mm)));

	/** 0 leaves the needle to the sizes the knitter owns, or the standard one for the yarn. */
	function setNeedle(e: Event) {
		design.needle = Number((e.currentTarget as HTMLSelectElement).value);
		design.ribNeedle = 0;
	}
	/** A new yarn weight has its own needle range, so the needle starts again from the standard. */
	function setWeight(e: Event) {
		design.gauge = Number((e.currentTarget as HTMLSelectElement).value);
		design.needle = 0;
		design.ribNeedle = 0;
	}
</script>

<header class="top">
	<a class="home" href="/" aria-label="Knit It home"><Logo size={26} word={false} /></a>

	<div class="steps" role="tablist" aria-label="Steps" style="--i: {index}; --n: {steps.length - 1}">
		<div class="track" aria-hidden="true"><div class="fill"></div></div>
		{#each steps as s, i (s.id)}
			<button
				type="button"
				role="tab"
				aria-selected={tab === s.id}
				aria-label={s.label}
				class:done={i < index}
				disabled={s.disabled}
				title={s.disabled ? s.reason : undefined}
				onclick={() => onTab(s.id)}
			>
				<span class="dot" aria-hidden="true">{#if i < index}✓{:else}{i + 1}{/if}</span>
				<span class="name">{s.label}</span>
			</button>
		{/each}
	</div>

	<div class="right">
		<div class="gauge" role="group" aria-label="Needle and gauge">
			<label class="pill edit">
				<span class="k">Needle</span><span class="v">{needleLabel(est.needles.main)}</span>
				<svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true"><path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
				<select aria-label="Main needle" value={design.needle} onchange={setNeedle}>
					<option value={0}>Automatic</option>
					{#each sizes as n (n.mm)}
						<option value={n.mm}>{needleLabel(n.mm)}</option>
					{/each}
				</select>
			</label>
			<label class="pill edit">
				<span class="k">Gauge</span><span class="v">{est.gauge} sts / 4 in</span>
				<svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true"><path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
				<select aria-label="Yarn weight, which sets the gauge" value={design.gauge} onchange={setWeight}>
					{#each yarnWeights as w (w.gauge)}
						<option value={w.gauge}>{w.label} · {w.gauge} sts / 4 in</option>
					{/each}
				</select>
			</label>
		</div>
		<nav>
			<a href="/about" aria-label="How it works" title="How it works">?</a>
			<a href={source} target="_blank" rel="noopener" aria-label="Source" title="Source">↗</a>
		</nav>
	</div>
</header>

<style>
	.top {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 16px;
		flex: none;
		height: 56px;
		padding: 0 14px;
		border-bottom: 1px solid var(--hairline);
		background: var(--chrome);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
	}
	.home {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		height: 36px;
		margin-left: -6px;
		padding: 0 6px;
		border-radius: 9px;
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	/* ── Steps: one yarn line runs through them and fills as you go ── */
	.steps {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
		justify-self: center;
		width: 420px;
		max-width: 100%;
	}
	.track {
		position: absolute;
		left: 13px;
		right: 13px;
		top: 50%;
		height: 3px;
		margin-top: -1.5px;
		border-radius: 2px;
		background: repeating-linear-gradient(90deg, var(--line-strong) 0 4px, transparent 4px 7px);
		pointer-events: none;
	}
	.fill {
		position: absolute;
		inset: 0;
		border-radius: 2px;
		background: var(--accent);
		transform-origin: left;
		transform: scaleX(calc(var(--i) / var(--n)));
		transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.steps button {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 32px;
		padding: 0 10px 0 4px;
		border: 0;
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: color 150ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.steps button:active:not(:disabled) {
		transform: scale(0.97);
	}
	.steps button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.steps button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.steps button[aria-selected='true'] {
		color: var(--ink);
	}
	.dot {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		font-size: 11px;
		font-weight: 600;
		transition: background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out;
	}
	.done .dot {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	[aria-selected='true'] .dot {
		border-color: var(--accent);
		color: var(--accent-deep);
		box-shadow: 0 0 0 3px rgb(200 84 62 / 0.18);
	}
	@media (hover: hover) and (pointer: fine) {
		.steps button:hover:not(:disabled) {
			color: var(--ink);
		}
	}
	/* ── Right: what the sweater needs, with the needle and gauge there to change ── */
	.right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		min-width: 0;
	}
	.gauge {
		display: flex;
		gap: 6px;
		min-width: 0;
	}
	.pill {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 11px;
		border: 1.5px solid var(--line-strong);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		white-space: nowrap;
		transition: background-color 120ms ease-out, border-color 120ms ease-out;
	}
	.k {
		color: var(--muted);
		font-size: 11px;
		font-weight: 500;
	}
	.v {
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.pill svg {
		flex: none;
		color: var(--muted);
	}
	/* The real control is a native select laid over the pill, so it keeps the platform's menu and keyboard use. */
	select {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		font: inherit;
	}
	.pill.edit:focus-within {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (hover: hover) and (pointer: fine) {
		.pill.edit:hover {
			border-color: var(--accent);
			background: #fffdf6;
		}
	}
	nav {
		display: flex;
		gap: 2px;
	}
	nav a {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		color: var(--muted);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		transition: background-color 120ms ease-out;
	}
	@media (hover: hover) and (pointer: fine) {
		nav a:hover {
			background: rgb(38 51 95 / 0.08);
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		.fill {
			animation: draw 600ms cubic-bezier(0.23, 1, 0.32, 1) both;
		}
		@keyframes draw {
			from {
				transform: scaleX(0);
			}
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
	/* The stepper stays dead centre because both sides share the leftover space equally; the labels go first when that gets tight. */
	@media (max-width: 1500px) {
		.k {
			display: none;
		}
	}
	@media (max-width: 1000px) {
		.steps {
			width: 360px;
		}
		nav {
			display: none;
		}
	}
	/* On a phone the numbers live under the model, and only the current step keeps its name. */
	@media (max-width: 760px) {
		.top {
			grid-template-columns: auto 1fr;
		}
		.right {
			display: none;
		}
		.steps {
			justify-self: end;
			width: 100%;
			max-width: 300px;
		}
		.steps button:not([aria-selected='true']) .name {
			display: none;
		}
		.steps button:not([aria-selected='true']) {
			padding-right: 4px;
		}
	}
</style>
