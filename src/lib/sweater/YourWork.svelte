<script lang="ts">
	import { onMount } from 'svelte';
	import MotifSwatch from './MotifSwatch.svelte';
	import { loadDesigns, type SavedDesign } from './designs';
	import { editLink, loadOwnCharts, type Library, type SavedPattern } from './library';
	import { encodeDesign } from './progress';
	import { designDetail } from './random';

	/**
	 * The knitter's own patterns or charts, at the top of the public catalogue. They live in this browser and, once
	 * signed in, in the account (merged into the browser on sign-in), so one read of storage covers both.
	 * Renders nothing until there is something to show.
	 */
	let { kind }: { kind: 'pattern' | 'chart' } = $props();

	let designs = $state<SavedDesign[]>([]);
	let charts = $state<SavedPattern[]>([]);
	let library = $state<Library>();

	const refresh = () => {
		designs = loadDesigns();
		({ library, charts } = loadOwnCharts());
	};
	onMount(() => {
		refresh();
		addEventListener('knit:local-save', refresh);
		addEventListener('knit:account-merged', refresh);
		return () => {
			removeEventListener('knit:local-save', refresh);
			removeEventListener('knit:account-merged', refresh);
		};
	});
	let count = $derived(kind === 'pattern' ? designs.length : charts.length);
</script>

{#if count && library}
	<section aria-labelledby="yours-{kind}">
		<h2 id="yours-{kind}">Yours</h2>
		<ul>
			{#if kind === 'pattern'}
				{#each designs as d (d.id)}
					<li>
						<a href="/pattern/view#d={encodeDesign(d.design)}">
							<span class="swatch" aria-hidden="true"><i style:background={d.design.color}></i><i style:background={d.design.contrast}></i></span>
							<span class="text">
								<b>{d.name}</b>
								<span>{designDetail(d.design)}</span>
							</span>
						</a>
					</li>
				{/each}
			{:else}
				{#each charts as c (c.id)}
					<li>
						<a href={editLink(c.motif)}>
							<span class="thumb"><MotifSwatch motif={c.motif} color={library.color} contrast={library.contrast} across={2} down={1} /></span>
							<span class="text"><b>{c.name}</b></span>
						</a>
					</li>
				{/each}
			{/if}
		</ul>
	</section>
{/if}

<style>
	section {
		margin-bottom: 32px;
	}
	h2 {
		margin: 0 0 12px;
		font-family: var(--display);
		font-size: 20px;
		font-weight: 600;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	a {
		display: flex;
		gap: 12px;
		height: 100%;
		padding: 14px;
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
		transition: background-color 120ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	a:active {
		transform: scale(0.98);
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.swatch {
		display: flex;
		flex: none;
		width: 44px;
		height: 44px;
		overflow: hidden;
		border-radius: 10px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.swatch i {
		flex: 1;
	}
	.thumb {
		flex: none;
		width: 72px;
		align-self: flex-start;
		overflow: hidden;
		border-radius: 6px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.text b {
		color: var(--ink);
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	@media (hover: hover) and (pointer: fine) {
		a:hover {
			background: var(--wash);
		}
	}
</style>
