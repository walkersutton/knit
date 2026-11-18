<script lang="ts">
	import mark from '$lib/ravelry-mark.svg?raw';
	import { page } from '$app/state';
	// Ravelry's own ball mark, recoloured through currentColor (brand coral is #EE6E62).
</script>

<a class="btn" href="/auth/ravelry?return={encodeURIComponent(page.url.pathname + page.url.search)}" data-sveltekit-reload>
	<span class="ball" aria-hidden="true">{@html mark}</span>Continue with Ravelry
	<svg class="arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
</a>

<style>
	.btn { --out: cubic-bezier(0.23, 1, 0.32, 1); display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 0 20px; border-radius: 13px; background: #26335f; color: #faf3dc; font-size: 14px; font-weight: 650; text-decoration: none; transition: transform 160ms var(--out), background-color 150ms ease-out; }
	.btn:active { transform: scale(0.97); }
	.btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
	.ball { display: inline-flex; width: 24px; height: 24px; flex: none; color: #ee6e62; }
	.ball :global(svg) { width: 100%; height: 100%; }
	.arrow { flex: none; transition: transform 200ms var(--out); }
	@media (hover: hover) and (pointer: fine) {
		.btn:hover { background: #36457a; }
		.btn:hover .arrow { transform: translateX(3px); }
	}
</style>
