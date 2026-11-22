<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import Viewer from './Viewer.svelte';
	import type { Design } from './garment';

	/**
	 * Draws garments as pictures, one at a time, with an off-screen 3D scene that exists only while there is something
	 * left to draw. Hand it `jobs`; each picture lands in `pictures` under its job's key and stays while the page does.
	 * A new set of jobs takes over from the one before.
	 */
	let { jobs, pictures = $bindable({}) }: { jobs: { key: string; design: Design }[]; pictures?: Record<string, string> } = $props();

	let on = $state(false);
	let camera = $state<Viewer>();
	let mounted = $state(false);
	let alive = true;
	let run = 0;

	onMount(() => {
		mounted = true;
		return () => {
			alive = false;
			Object.values(pictures).forEach((url) => URL.revokeObjectURL(url));
		};
	});

	async function draw(list: typeof jobs) {
		const mine = ++run;
		const todo = list.filter((j) => !pictures[j.key]);
		if (!todo.length) return;
		on = true;
		await tick();
		for (const job of todo) {
			if (!alive || mine !== run) return;
			const blob = await camera?.still(job.design).catch(() => null);
			if (!alive) return;
			if (blob) pictures[job.key] = URL.createObjectURL(blob);
		}
		if (mine === run) on = false;
	}
	$effect(() => {
		const list = jobs;
		// Only a new set of jobs starts drawing again, not each picture as it lands.
		if (mounted) untrack(() => draw(list));
	});
</script>

{#if on}
	<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
{/if}

<style>
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 480px;
		height: 552px;
		pointer-events: none;
	}
</style>
