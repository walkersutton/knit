<script lang="ts">
	import { onMount } from 'svelte';
	import { createViewer, type ViewerHandle } from './viewer';
	import type { Design } from './garment';
	import type { Knitted } from './progress';

	let { design, knitted = null, onview, intro = true }: { design: Design; knitted?: Knitted | null; onview: (view: string) => void; intro?: boolean } = $props();
	let host: HTMLDivElement;
	let handle = $state.raw<ViewerHandle | null>(null);

	onMount(() => {
		const viewer = createViewer(host, onview, intro);
		handle = viewer;
		return () => viewer.dispose();
	});

	$effect(() => {
		const snapshot = { ...design };
		handle?.setDesign(snapshot);
	});
	$effect(() => {
		handle?.setKnitted(knitted && { ...knitted, sleeves: [...knitted.sleeves] });
	});

	export function turn() {
		handle?.turn();
	}
</script>

<div class="viewer" bind:this={host}></div>

<style>
	.viewer {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(110% 85% at 50% 40%, #f6f7f8 0%, #e6e9ec 60%, #d6dade 100%);
	}
</style>
