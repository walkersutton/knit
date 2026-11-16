<script lang="ts">
	import type { Design } from './garment';
	import { choose, type Field } from './options';

	let { field, design = $bindable() }: { field: Field; design: Design } = $props();
</script>

{#if field.kind === 'color'}
	<div class="swatches" role="radiogroup" aria-label={field.label}>
		{#each field.options as o}
			<button type="button" class="swatch" role="radio" aria-checked={design[field.key] === o.value} aria-label={o.label} title={o.label} style:--c={String(o.value)} onclick={() => choose(design, field.key, o.value)}></button>
		{/each}
	</div>
{:else}
	<div class="segment" class:thirds={field.options.length === 6} role="radiogroup" aria-label={field.label}>
		{#each field.options as o}
			<button type="button" class="opt" role="radio" aria-checked={design[field.key] === o.value} onclick={() => choose(design, field.key, o.value)}>
				<span>{o.label}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.segment {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.opt {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 32px;
		padding: 0 9px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		white-space: nowrap;
		cursor: pointer;
		transition: background-color 120ms ease-out, border-color 120ms ease-out, transform 120ms ease-out;
	}
	.segment .opt {
		flex: 1 1 auto;
	}
	.segment.thirds {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}
	.opt:active,
	.swatch:active {
		transform: scale(0.97);
	}
	.opt:focus-visible,
	.swatch:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.opt[aria-checked='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff;
		font-weight: 500;
	}
	@media (hover: hover) and (pointer: fine) {
		.opt:not([aria-checked='true']):hover {
			background: var(--wash);
			border-color: #b4b4bb;
		}
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.swatch {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid rgba(0, 0, 0, 0.18);
		border-radius: 50%;
		background: var(--c);
		cursor: pointer;
		transition: transform 120ms ease-out;
	}
	.swatch[aria-checked='true'] {
		box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink);
	}
	@media (pointer: coarse) {
		.opt {
			min-height: 40px;
		}
		.swatch {
			width: 36px;
			height: 36px;
		}
	}
</style>
