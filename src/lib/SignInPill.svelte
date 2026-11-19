<script lang="ts">
	import { openSignIn } from '$lib/signin.svelte';
	import mark from '$lib/ravelry-mark.svg?raw';
	// The coral sign-in pill from the top bar, so every invitation to sign in looks the same.
	let { label = 'Sign in' }: { label?: string } = $props();
</script>

<button class="pill" type="button" onclick={openSignIn} aria-label={label === 'Sign in' ? 'Sign in with Ravelry' : undefined}>
	<span class="ball" aria-hidden="true">{@html mark}</span><span class="label">{label}</span>
</button>

<style>
	.pill { --out: cubic-bezier(0.23, 1, 0.32, 1); display: inline-flex; align-items: center; gap: 8px; height: 36px; max-width: 24ch; padding: 0 14px 0 4px; border: 0; border-radius: 999px; background: #fdf0e9; box-shadow: inset 0 0 0 1.5px #ee6e62; color: #26335f; font-family: inherit; font-size: 13px; font-weight: 650; cursor: pointer; transition: transform 160ms var(--out), background-color 150ms ease-out; }
	.pill:active { transform: scale(0.97); }
	.pill:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ball { display: grid; place-items: center; flex: none; width: 28px; height: 28px; padding: 6px; border-radius: 50%; background: #ee6e62; color: #fff8e6; transition: transform 200ms var(--out); }
	.ball :global(svg) { width: 100%; height: 100%; }
	@media (hover: hover) and (pointer: fine) {
		.pill:hover { background: #fbe3d8; }
		.pill:hover .ball { transform: rotate(40deg); }
	}
	@media (prefers-reduced-motion: reduce) { .ball { transition: none; } .pill:hover .ball { transform: none; } }
</style>
