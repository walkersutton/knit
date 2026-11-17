<script lang="ts">
	import { onMount } from 'svelte';
	import { createViewer, type ViewerHandle } from './viewer';
	import type { Design } from './garment';
	import type { Knitted } from './progress';

	/** Without a design the viewer stays empty, for use as an off-screen camera (see `snapshot`). */
	let { design, knitted = null, onview, intro = true }: { design?: Design; knitted?: Knitted | null; onview: (view: string) => void; intro?: boolean } = $props();
	let host: HTMLDivElement;
	let handle = $state.raw<ViewerHandle | null>(null);

	onMount(() => {
		const viewer = createViewer(host, onview, intro);
		handle = viewer;
		return () => viewer.dispose();
	});

	$effect(() => {
		if (design) handle?.setDesign({ ...design });
	});
	$effect(() => {
		handle?.setKnitted(knitted && { ...knitted, sleeves: [...knitted.sleeves] });
	});

	export function turn() {
		handle?.turn();
	}
	/** A design as a still and the frames of one turn, made without showing it. The viewer is left wearing it. */
	export async function pictures(next: Design, size: { width: number; height: number; frames: number; background: string }) {
		if (!handle) return null;
		await handle.prefetch({ ...next });
		handle.setDesign({ ...next });
		const still = await handle.snapshot();
		const frames = await handle.spin(size.frames, size.width, size.height, size.background);
		return still && { still, frames };
	}
	/** Get a design ready in idle time, so showing it later is quick. */
	export function prefetch(next: Design) {
		return handle?.prefetch({ ...next }) ?? Promise.resolve();
	}
</script>

<div class="viewer" bind:this={host}></div>

<style>
	.viewer {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background:
			var(--knit, none),
			radial-gradient(110% 85% at 50% 40%, var(--stage-a, #f6f7f8) 0%, var(--stage-b, #e6e9ec) 60%, var(--stage-c, #d6dade) 100%);
	}
</style>
