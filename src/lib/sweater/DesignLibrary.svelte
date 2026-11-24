<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import MotifSwatch from './MotifSwatch.svelte';
	import type { SavedCenterpiece, SavedPattern } from './library';
	import type { SavedDesign } from './designs';

	/**
	 * The designer's left sidebar, shown beside every designer: the knitter's colourwork charts, centerpieces and
	 * sweater patterns. Choosing a chart opens the chart designer, a centerpiece the centerpiece designer, and a
	 * pattern the sweater designer. On a phone it is a drawer that slides in from the left, opened from a bar
	 * above the designer.
	 */
	let {
		tool,
		charts,
		selected,
		centerpieces,
		selectedCenterpiece,
		color,
		contrast,
		designs,
		active,
		onchart,
		onnewchart,
		oncenterpiece,
		onnewcenterpiece,
		onnewpattern,
		onopen
	}: {
		tool: 'chart' | 'centerpiece' | 'sweater';
		charts: SavedPattern[];
		selected: string;
		centerpieces: SavedCenterpiece[];
		selectedCenterpiece?: string;
		color: string;
		contrast: string;
		designs: SavedDesign[];
		/** The saved design open in the sweater designer. */
		active?: string;
		onchart: (id: string) => void;
		onnewchart: () => void;
		oncenterpiece: (id: string) => void;
		onnewcenterpiece: () => void;
		onnewpattern: () => void;
		onopen: (design: SavedDesign) => void;
	} = $props();

	const phone = new MediaQuery('max-width: 760px');
	let open = $state(false);
	let opener = $state<HTMLButtonElement>();
	let drawer = $state<HTMLElement>();

	/** What the bar says is open, so the knitter knows where they are with the drawer shut. */
	let title = $derived(
		tool === 'chart'
			? charts.find((p) => p.id === selected)?.name
			: tool === 'centerpiece'
				? centerpieces.find((c) => c.id === selectedCenterpiece)?.name
				: (designs.find((d) => d.id === active)?.name ?? 'New sweater')
	);

	function show() {
		open = true;
		// Wait for `inert` to lift before moving focus in.
		requestAnimationFrame(() => drawer?.focus());
	}
	function close() {
		if (!open) return;
		open = false;
		opener?.focus();
	}
	/** Choosing something on a phone puts the drawer away, so the designer it opened is in view. */
	const then =
		<A extends unknown[]>(fn: (...a: A) => void) =>
		(...a: A) => {
			fn(...a);
			if (open) {
				open = false;
				opener?.focus({ preventScroll: true });
			}
		};
	// Widening past a phone leaves the sidebar, so the drawer must not stay open behind it.
	$effect(() => {
		if (!phone.current) open = false;
	});
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

<div class="mbar">
	<button type="button" class="stitch quiet sm" bind:this={opener} aria-expanded={open} aria-controls="library" onclick={show}>
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
		Library
	</button>
	<span class="title">{title}</span>
</div>
<div class="scrim" class:open onclick={close} aria-hidden="true"></div>

<nav
	id="library"
	class="library"
	class:open
	aria-label="Your charts, centerpieces and patterns"
	tabindex="-1"
	bind:this={drawer}
	inert={phone.current && !open}
>
	<div class="dhead">
		<h2 class="dtitle">Your library</h2>
		<button type="button" class="x" aria-label="Close library" onclick={close}>
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
		</button>
	</div>
	<section aria-labelledby="lib-charts">
		<h2 id="lib-charts">Charts</h2>
		<ul>
			{#each charts as p (p.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'chart' && p.id === selected ? 'true' : undefined} onclick={() => then(onchart)(p.id)}>
						<span class="thumb"><MotifSwatch motif={p.motif} {color} {contrast} /></span>
						<span class="name">{p.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={then(onnewchart)}><span aria-hidden="true">+</span> New chart</button>
	</section>

	<section aria-labelledby="lib-centerpieces">
		<h2 id="lib-centerpieces">Centerpieces</h2>
		<ul>
			{#each centerpieces as c (c.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'centerpiece' && c.id === selectedCenterpiece ? 'true' : undefined} onclick={() => then(oncenterpiece)(c.id)}>
						<span class="thumb"><MotifSwatch motif={c.centerpiece} {color} {contrast} /></span>
						<span class="name">{c.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={then(onnewcenterpiece)}><span aria-hidden="true">+</span> New centerpiece</button>
	</section>

	<section aria-labelledby="lib-patterns">
		<h2 id="lib-patterns">Patterns</h2>
		<ul>
			{#each designs as d (d.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'sweater' && d.id === active ? 'true' : undefined} title="Open “{d.name}” in the sweater designer" onclick={() => then(onopen)(d)}>
						<span class="chip" aria-hidden="true" style:--a={d.design.color} style:--b={d.design.contrast}></span>
						<span class="name">{d.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={then(onnewpattern)}><span aria-hidden="true">+</span> New pattern</button>
	</section>
</nav>

<style>
	.library {
		display: flex;
		flex-direction: column;
		gap: 20px;
		overflow-y: auto;
		padding: 16px 12px;
		border-right: 1px solid var(--hairline);
		background: var(--surface);
		color: var(--ink);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h2 {
		margin: 0 0 2px 6px;
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	ul {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 6px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.item[aria-current='true'] {
		border-color: #b88a1c;
		background: #e8bd53;
		font-weight: 600;
	}
	.thumb,
	.chip {
		flex: none;
		width: 30px;
		overflow: hidden;
		border-radius: 3px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.15);
	}
	/* A sweater has no flat picture to show, so a pattern wears its two yarn colours. */
	.chip {
		height: 30px;
		background: linear-gradient(135deg, var(--a, #465e9d) 50%, var(--b, #faf3dc) 50%);
	}
	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.item:not([aria-current='true']):hover {
			background: var(--wash);
		}
	}

	.mbar,
	.scrim,
	.dhead {
		display: none;
	}

	/* Phones: the library is a drawer, opened from a bar above the designer. */
	@media (max-width: 760px) {
		.mbar {
			display: flex;
			align-items: center;
			gap: 10px;
			flex: none;
			height: 52px;
			padding: 0 12px;
			border-bottom: 1px solid var(--hairline);
			background: var(--surface);
			color: var(--ink);
		}
		.title {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			font-size: 15px;
			font-weight: 600;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 50;
			background: rgb(26 35 68 / 0.36);
			opacity: 0;
			pointer-events: none;
			transition: opacity 240ms ease-out;
		}
		.scrim.open {
			opacity: 1;
			pointer-events: auto;
		}
		.library {
			position: fixed;
			top: 0;
			bottom: 0;
			left: 0;
			z-index: 51;
			gap: 0;
			width: min(86vw, 340px);
			padding: 0 12px max(16px, env(safe-area-inset-bottom));
			overscroll-behavior: contain;
			border-right: 0;
			box-shadow: 8px 0 32px rgb(26 35 68 / 0.18);
			outline: none;
			visibility: hidden;
			transform: translateX(-100%);
			transition:
				transform 300ms cubic-bezier(0.32, 0.72, 0, 1),
				visibility 0s 300ms;
		}
		.library.open {
			visibility: visible;
			transform: none;
			transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
		}
		.dhead {
			display: flex;
			align-items: center;
			justify-content: space-between;
			position: sticky;
			top: 0;
			z-index: 1;
			margin: 0 -12px;
			padding: max(12px, env(safe-area-inset-top)) 8px 8px 20px;
			background: var(--surface);
		}
		.dtitle {
			margin: 0;
			color: var(--ink);
			font-size: 18px;
			letter-spacing: 0;
			text-transform: none;
		}
		.x {
			display: grid;
			place-items: center;
			width: 44px;
			height: 44px;
			border: 0;
			border-radius: 50%;
			background: none;
			color: var(--muted);
			cursor: pointer;
		}
		section {
			padding: 12px 0 16px;
			border-top: 1px solid var(--hairline);
		}
		.item {
			min-height: 48px;
			font-size: 15px;
		}
		.thumb,
		.chip {
			width: 34px;
		}
		.chip {
			height: 34px;
		}
		.new {
			margin-top: 4px;
		}
	}
	@media (max-width: 760px) and (prefers-reduced-motion: reduce) {
		.library,
		.library.open {
			transform: none;
			opacity: 0;
			transition:
				opacity 150ms ease-out,
				visibility 0s 150ms;
		}
		.library.open {
			opacity: 1;
			transition: opacity 150ms ease-out;
		}
	}
</style>
