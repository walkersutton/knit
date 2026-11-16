<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

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
	}
	:global(body) {
		margin: 0;
		background: #f4f4f5;
		color: #18181b;
		font: 13px/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
	}
</style>
