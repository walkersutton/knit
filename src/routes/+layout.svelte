<script lang="ts">
	import '@fontsource-variable/fredoka';
	import Cursor from '$lib/Cursor.svelte';

	let { children } = $props();
</script>

{@render children()}
<Cursor />

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(:root) {
		--ink: #18181b;
		--muted: #6b6b74;
		--line: #dcdce0;
		--surface: #fff;
		--wash: #f4f4f5;
		--focus: #2563eb;
		--paper: #fbf5e4;
		/* Rows of knit stitches, each row offset half a stitch, drawn in navy at a whisper. */
		--knit: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='28' viewBox='0 0 18 28'%3E%3Cdefs%3E%3Cg id='v' fill='%2326335f' fill-opacity='.055'%3E%3Cpath d='M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z' transform='scale(.62 .46)'/%3E%3Cpath d='M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z' transform='scale(-.62 .46)'/%3E%3C/g%3E%3C/defs%3E%3Cuse href='%23v' x='9' y='12'/%3E%3Cuse href='%23v' x='0' y='26'/%3E%3Cuse href='%23v' x='18' y='26'/%3E%3C/svg%3E");
		--display: 'Fredoka Variable', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
	}
	:global(body) {
		margin: 0;
		background: var(--paper) var(--knit);
		color: #18181b;
		font: 13px/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
	}
</style>
