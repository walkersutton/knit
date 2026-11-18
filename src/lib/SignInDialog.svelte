<script lang="ts">
	import RavelryButton from '$lib/RavelryButton.svelte';
	import SignInLockup from '$lib/SignInLockup.svelte';
	import { signin } from '$lib/signin.svelte';
	import { loadDesigns } from '$lib/sweater/designs';

	let dialog = $state<HTMLDialogElement>();
	let configured = $state(true);
	let designCount = $state(0);

	$effect(() => {
		if (!dialog) return;
		if (signin.open && !dialog.open) {
			designCount = loadDesigns().length;
			dialog.showModal();
			void fetch('/api/account')
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => { configured = d ? d.configured !== false : false; })
				.catch(() => { configured = false; });
		} else if (!signin.open && dialog.open) dialog.close();
	});
	function backdrop(e: MouseEvent) {
		if (e.target === dialog) signin.open = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="signin-h" onclose={() => (signin.open = false)} onclick={backdrop}>
	<div class="patch">
		<button class="x" type="button" aria-label="Close" onclick={() => (signin.open = false)}>×</button>
		<div class="lockwrap"><SignInLockup /></div>
		<h2 id="signin-h">Pick up where you left off</h2>
		{#if configured}
			<p class="lede">Link your Ravelry account and your saved designs, charts and row counts follow you from device to device.</p>
			<div class="cta"><RavelryButton /></div>
			<p class="fine">
				{#if designCount}<strong>{designCount} {designCount === 1 ? 'design' : 'designs'}</strong> saved on this device will come along.{/if}
				knit only uses Ravelry to know who you are, and never posts to it.
			</p>
		{:else}
			<p class="lede">Sign-in is being set up. Your designs, charts, and progress still save on this device.</p>
		{/if}
	</div>
</dialog>

<style>
	dialog { --out: cubic-bezier(0.23, 1, 0.32, 1); width: min(calc(100% - 32px), 440px); padding: 0; border: 0; border-radius: 26px; background: transparent; color: #26335f; overflow: visible; }
	dialog::backdrop { background: #26335f66; }
	dialog[open] { animation: pop 200ms var(--out); }
	dialog[open]::backdrop { animation: fade 200ms ease-out; }
	@keyframes pop { from { opacity: 0; transform: scale(0.96); } }
	@keyframes fade { from { opacity: 0; } }
	/* A sewn-on label: the dashed edge is its stitching. */
	.patch { position: relative; padding: 34px 32px 28px; border-radius: 26px; background: #fffdf8; text-align: center; box-shadow: 0 16px 50px #433c2933, 0 0 0 1px #e6dcc0; }
	.patch::before { content: ''; position: absolute; inset: 8px; border: 1.5px dashed #c9bb92; border-radius: 19px; pointer-events: none; }
	.x { position: absolute; top: 14px; right: 16px; z-index: 1; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: #76747b; font-size: 22px; line-height: 1; cursor: pointer; }
	.x:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.lockwrap { margin-bottom: 22px; }
	h2 { margin: 0 0 10px; font: 600 clamp(26px, 7vw, 30px) / 1.1 var(--display); text-wrap: balance; }
	.lede { margin: 0 auto 22px; max-width: 34ch; color: #55545b; font-size: 14px; line-height: 1.55; text-wrap: pretty; }
	.cta { display: flex; justify-content: center; }
	.cta :global(.btn) { width: 100%; max-width: 320px; }
	.fine { margin: 16px auto 0; max-width: 38ch; color: #76747b; font-size: 12px; line-height: 1.5; text-wrap: pretty; }
	.fine strong { color: #26335f; font-weight: 700; }
	@media (prefers-reduced-motion: reduce) { dialog[open], dialog[open]::backdrop { animation: none; } }
</style>
