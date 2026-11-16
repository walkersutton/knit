<script lang="ts">
	import type { Design } from './garment';
	import { NEEDLES, mainSizes, needleLabel, needlesOf, stitchGauge, weightOf } from './needles';

	/** `design` is the design as it will be knitted, with the needles already chosen from `owned`. */
	let { design, owned = $bindable() }: { design: Design; owned: number[] } = $props();

	let yarn = $derived(weightOf(design.gauge));
	let used = $derived(needlesOf(design));
	let range = $derived(mainSizes(design.gauge));
	const toggle = (mm: number) => (owned = owned.includes(mm) ? owned.filter((n) => n !== mm) : [...owned, mm].sort((a, b) => a - b));
</script>

<div class="sizes" role="group" aria-label="Needle sizes you have">
	{#each NEEDLES as n (n.mm)}
		<button type="button" class="size" aria-pressed={owned.includes(n.mm)} aria-label={needleLabel(n.mm)} onclick={() => toggle(n.mm)}>
			<span>{n.mm} mm</span><small>US {n.us}</small>
		</button>
	{/each}
</div>

{#if owned.length}
	<dl>
		{#each [['Main needle', used.main], ['Ribbing needle', used.rib]] as const as [name, mm] (name)}
			<div>
				<dt>{name}</dt>
				<dd>{needleLabel(mm)}<span class="tag" class:buy={!owned.includes(mm)}>{owned.includes(mm) ? 'Yours' : 'To buy'}</span></dd>
			</div>
		{/each}
	</dl>
	<p>
		{#if !owned.includes(used.main)}
			{yarn.label} yarn needs a {range[0]}–{range.at(-1)} mm needle and none of yours is in that range, so the pattern uses the usual {yarn.needle} mm.
		{:else if used.main !== yarn.needle}
			Your {used.main} mm is {used.main < yarn.needle ? 'thinner' : 'thicker'} than the usual {yarn.needle} mm for {yarn.label} yarn, so the pattern is written at {stitchGauge(design)} sts / 4 in
			instead of {yarn.gauge}. Swatch before you start.
		{:else}
			That is the usual needle for {yarn.label} yarn.
		{/if}
	</p>
{:else}
	<p>Pick the sizes you own and the pattern will use them where it can.</p>
{/if}

<style>
	.sizes {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}
	.size {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 2px 0;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		cursor: pointer;
		transition: background-color 120ms ease-out, border-color 120ms ease-out, transform 120ms ease-out;
	}
	small {
		font-size: 11px;
		color: var(--muted);
	}
	.size:active {
		transform: scale(0.97);
	}
	.size:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.size[aria-pressed='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff;
		font-weight: 500;
	}
	.size[aria-pressed='true'] small {
		color: rgba(255, 255, 255, 0.7);
	}
	@media (hover: hover) and (pointer: fine) {
		.size:not([aria-pressed='true']):hover {
			background: var(--wash);
			border-color: #b4b4bb;
		}
	}
	@media (pointer: coarse) {
		.size {
			min-height: 44px;
		}
	}
	dl {
		margin: 12px 0 0;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 5px 0;
	}
	dt {
		font-size: 13px;
	}
	dd {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.tag {
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--wash);
		color: var(--muted);
		font-size: 11px;
		font-weight: 500;
	}
	.tag.buy {
		background: none;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	p {
		margin: 8px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--muted);
	}
</style>
