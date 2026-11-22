<script lang="ts">
	import MotifSwatch from './MotifSwatch.svelte';
	import type { SavedCenterpiece, SavedPattern } from './library';
	import type { SavedDesign } from './designs';

	/**
	 * The designer's left sidebar, shown beside every designer: the knitter's colourwork charts, centerpieces and
	 * sweater patterns. Choosing a chart opens the chart designer, a centerpiece the centerpiece designer, and a
	 * pattern the sweater designer.
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
</script>

<nav class="library" aria-label="Your charts, centerpieces and patterns">
	<section aria-labelledby="lib-charts">
		<h2 id="lib-charts">Charts</h2>
		<ul>
			{#each charts as p (p.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'chart' && p.id === selected ? 'true' : undefined} onclick={() => onchart(p.id)}>
						<span class="thumb"><MotifSwatch motif={p.motif} {color} {contrast} /></span>
						<span class="name">{p.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={onnewchart}><span aria-hidden="true">+</span> New chart</button>
	</section>

	<section aria-labelledby="lib-centerpieces">
		<h2 id="lib-centerpieces">Centerpieces</h2>
		<ul>
			{#each centerpieces as c (c.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'centerpiece' && c.id === selectedCenterpiece ? 'true' : undefined} onclick={() => oncenterpiece(c.id)}>
						<span class="thumb"><MotifSwatch motif={c.centerpiece} {color} {contrast} /></span>
						<span class="name">{c.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={onnewcenterpiece}><span aria-hidden="true">+</span> New centerpiece</button>
	</section>

	<section aria-labelledby="lib-patterns">
		<h2 id="lib-patterns">Patterns</h2>
		<ul>
			{#each designs as d (d.id)}
				<li>
					<button type="button" class="item" aria-current={tool === 'sweater' && d.id === active ? 'true' : undefined} title="Open “{d.name}” in the sweater designer" onclick={() => onopen(d)}>
						<span class="chip" aria-hidden="true" style:--a={d.design.color} style:--b={d.design.contrast}></span>
						<span class="name">{d.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="chunk sm block new" onclick={onnewpattern}><span aria-hidden="true">+</span> New pattern</button>
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

	/* Narrow screens: one scrolling strip above the designer. */
	@media (max-width: 760px) {
		.library {
			flex-direction: row;
			align-items: center;
			gap: 12px;
			overflow-x: auto;
			padding: 10px;
			border-right: 0;
			border-bottom: 1px solid var(--hairline);
		}
		section {
			flex-direction: row;
			align-items: center;
			gap: 4px;
		}
		h2,
		ul {
			display: flex;
		}
		.item {
			flex-direction: column;
			gap: 4px;
			width: 72px;
			font-size: 11px;
		}
		.thumb,
		.chip {
			width: 36px;
		}
		.chip {
			height: 36px;
		}
		.name {
			max-width: 100%;
		}
		.new {
			flex: none;
			height: 56px;
			padding: 0 12px;
			font-size: 12px;
		}
	}
</style>
