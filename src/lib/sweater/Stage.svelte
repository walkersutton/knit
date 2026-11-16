<script lang="ts">
	import Viewer from './Viewer.svelte';
	import type { Design } from './garment';

	let { design, intro = true }: { design: Design; intro?: boolean } = $props();
	let view = $state('Front');
	let viewer = $state<Viewer>();
</script>

<div class="stage">
	<Viewer bind:this={viewer} {design} {intro} onview={(v) => (view = v)} />
	<span class="tag">{view}</span>
	<span class="hint">Drag to rotate</span>
	<button class="turn" type="button" onclick={() => viewer?.turn()}>{view === 'Back' ? 'Show front' : 'Show back'}</button>
</div>

<style>
	.stage {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 260px;
		overflow: hidden;
	}
	.tag,
	.hint {
		position: absolute;
		left: 12px;
		font-size: 12px;
		color: var(--muted);
		pointer-events: none;
	}
	.tag {
		top: 12px;
		padding: 3px 8px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #ffffffcc;
		color: var(--ink);
		font-weight: 500;
	}
	.hint {
		bottom: 14px;
	}
	.turn {
		position: absolute;
		right: 12px;
		top: 10px;
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out, transform 120ms ease-out;
	}
	.turn:active {
		transform: scale(0.97);
	}
	.turn:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.turn:hover {
			background: var(--wash);
		}
	}
	@media (pointer: coarse) {
		.turn {
			height: 40px;
		}
	}
</style>
