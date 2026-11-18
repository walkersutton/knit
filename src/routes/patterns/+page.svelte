<script lang="ts">
	import { onMount } from 'svelte';

	// The chart designer moved into /design. Carry a chart sent in the link's hash across with it.
	onMount(() => location.replace('/design#' + new URLSearchParams([...new URLSearchParams(location.hash.slice(1)), ['tool', 'chart']])));
</script>

<svelte:head>
	<title>Chart designer — knit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<p style="padding: 24px">The chart designer has moved: <a href="/design#tool=chart">open it</a>.</p>
