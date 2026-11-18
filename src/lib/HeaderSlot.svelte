<script lang="ts">
	import type { Snippet } from 'svelte';
	import { chrome } from '$lib/chrome.svelte';

	let { left, center, right, app = false }: { left?: Snippet; center?: Snippet; right?: Snippet; app?: boolean } = $props();

	$effect(() => {
		chrome.left = left;
		chrome.center = center;
		chrome.right = right;
		chrome.app = app;
		return () => {
			// Only clear what is still ours, in case the next page has already claimed the header.
			if (chrome.left === left) chrome.left = undefined;
			if (chrome.center === center) chrome.center = undefined;
			if (chrome.right === right) chrome.right = undefined;
			if (chrome.left === undefined && chrome.center === undefined && chrome.right === undefined) chrome.app = false;
		};
	});
</script>
