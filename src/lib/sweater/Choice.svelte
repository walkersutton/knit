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
		gap: 5px;
	}
	.opt {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		position: relative;
		min-height: 34px;
		padding: 0 12px;
		border: 1px solid var(--line-strong, var(--line));
		border-radius: 4px;
		background: var(--surface);
		box-shadow: 0 2px 0 var(--line);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: background-color 120ms ease-out, border-color 120ms ease-out, transform 120ms ease-out, box-shadow 120ms ease-out;
	}
	/* A dashed seam inside the edge, like a running stitch. */
	.opt::after {
		content: '';
		position: absolute;
		inset: 3px;
		border: 1px dashed var(--line-strong, var(--line));
		border-radius: 2px;
		pointer-events: none;
		transition: border-color 120ms ease-out;
	}
	.segment .opt {
		flex: 1 1 auto;
	}
	.segment.thirds {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}
	.opt:active {
		transform: translateY(2px);
		box-shadow: 0 0 0 var(--line);
	}
	.swatch:active {
		transform: scale(0.94);
	}
	.opt:focus-visible,
	.swatch:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.opt[aria-checked='true'] {
		border-color: #b88a1c;
		background: #e8bd53;
		box-shadow: 0 2px 0 rgb(184 138 28 / 0.55);
		font-weight: 600;
	}
	.opt[aria-checked='true']::after {
		border-color: rgb(38 51 95 / 0.5);
	}
	.opt[aria-checked='true']:active {
		box-shadow: 0 0 0 transparent;
	}
	@media (hover: hover) and (pointer: fine) {
		.opt:not([aria-checked='true']):hover {
			background: var(--wash);
			border-color: var(--ink);
		}
		.opt:not([aria-checked='true']):hover::after {
			border-color: var(--ink);
		}
		.swatch:hover {
			transform: translateY(-1px) rotate(-8deg);
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
		/* A ball of yarn: a soft highlight over diagonal twist lines. */
		background:
			radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.38), transparent 55%),
			repeating-linear-gradient(135deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 4px),
			var(--c);
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
