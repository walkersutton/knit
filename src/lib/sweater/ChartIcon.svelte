<script lang="ts">
	/** 24px stroke icons for the chart tools. */
	let { name }: { name: 'undo' | 'redo' | 'mirror' | 'flipH' | 'flipV' | 'invert' | 'clear' } = $props();
</script>

<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'undo'}
		<path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
	{:else if name === 'redo'}
		<path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
	{:else if name === 'mirror'}
		<path d="m3 7 5 5-5 5V7" /><path d="m21 7-5 5 5 5V7" /><path d="M12 2v2M12 8v2M12 14v2M12 20v2" />
	{:else if name === 'flipH'}
		<path d="m8 3-4 4 4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" />
	{:else if name === 'flipV'}
		<path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
	{:else if name === 'invert'}
		<circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
	{:else}
		<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
	{/if}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
