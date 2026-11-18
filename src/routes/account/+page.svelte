<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/Seo.svelte';
	import RavelryButton from '$lib/RavelryButton.svelte';
	import SignInLockup from '$lib/SignInLockup.svelte';
	import { deleteDesign, loadDesigns, type SavedDesign } from '$lib/sweater/designs';
	import { encodeDesign } from '$lib/sweater/progress';

	let account = $state<{ username: string } | null>(null);
	let configured = $state(false);
	let loading = $state(true);
	let errorMessage = $state('');
	let signingOut = $state(false);
	let designs = $state<SavedDesign[]>([]);
	onMount(() => {
		designs = loadDesigns();
		const refresh = () => (designs = loadDesigns());
		window.addEventListener('knit:account-merged', refresh);
		void (async () => {
			try {
				const response = await fetch('/api/account');
				if (!response.ok) throw new Error('Account services are not configured yet.');
				const data = await response.json();
				account = data.account;
				configured = data.configured;
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : 'Could not load your account.';
			} finally {
				loading = false;
			}
		})();
		return () => window.removeEventListener('knit:account-merged', refresh);
	});
	function removeDesign(id: string, name: string) {
		if (!confirm(`Delete “${name}”?`)) return;
		deleteDesign(id);
		designs = loadDesigns();
	}
	async function signOut() {
		signingOut = true;
		await fetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
		location.reload();
	}
</script>

<Seo title="Your account — knit" description="Sign in to sync your knitting patterns and progress across devices." path="/account" />

<main>
	<section class="patch">
		{#if loading}
			<p class="plain">Checking your account…</p>
		{:else if errorMessage}
			<p class="eyebrow">Your knitting, with you</p>
			<h1>Keep your patterns close</h1>
			<p class="error">{errorMessage}</p>
			<p class="fine">Sign-in is being set up. Your patterns and progress still work on this device.</p>
		{:else if account}
			<p class="eyebrow">Your knitting, with you</p>
			<h1>Hello, {account.username}</h1>
			<p class="lede">You’re signed in with Ravelry. Saved sweater designs, charts, and knitting progress can sync across your devices.</p>
			<section class="saved">
				<div class="section-head"><h2>Saved sweater designs</h2><a href="/design">Make a sweater</a></div>
				{#if designs.length}
					<ul>
						{#each designs as item (item.id)}
							<li>
								<a href="/design#d={encodeDesign(item.design)}"><strong>{item.name}</strong><span>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span></a>
								<button type="button" aria-label={`Delete ${item.name}`} onclick={() => removeDesign(item.id, item.name)}>×</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="fine">Save a design from the sweater designer and it will show up here.</p>
				{/if}
			</section>
			<button class="secondary" onclick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
		{:else if configured}
			<div class="lockwrap"><SignInLockup /></div>
			<p class="eyebrow rise" style="--i:0">knit + Ravelry</p>
			<h1 class="rise" style="--i:1">Pick up where you left off</h1>
			<p class="lede rise" style="--i:2">Link your Ravelry account and your saved designs, charts and row counts follow you from device to device.</p>
			<div class="cta rise" style="--i:3"><RavelryButton /></div>
			<p class="fine rise" style="--i:4">
				{#if designs.length}<strong>{designs.length} {designs.length === 1 ? 'design' : 'designs'}</strong> saved on this device will come along.{/if}
				knit only uses Ravelry to know who you are, and never posts to it.
			</p>
		{:else}
			<p class="eyebrow">Your knitting, with you</p>
			<h1>Keep your patterns close</h1>
			<p class="lede">Account sync is being set up. Your designs, charts, and knitting progress continue to save on this device.</p>
		{/if}
	</section>
	<a class="back" href="/">← Back to knit</a>
</main>

<style>
	main { --out: cubic-bezier(0.23, 1, 0.32, 1); min-height: calc(100svh - var(--bar)); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 20px 40px; }
	/* A sewn-on label: the dashed edge is its stitching. */
	.patch { position: relative; width: min(100%, 440px); padding: 34px 32px 28px; border-radius: 26px; background: #fffdf8; text-align: center; box-shadow: 0 16px 50px #433c2912, 0 0 0 1px #e6dcc0; }
	.patch::before { content: ''; position: absolute; inset: 8px; border: 1.5px dashed #c9bb92; border-radius: 19px; pointer-events: none; }
	.lockwrap { margin-bottom: 22px; }
	.rise { animation: rise 240ms var(--out) both; animation-delay: calc(560ms + var(--i) * 45ms); }
	@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
	.eyebrow { margin: 0 0 8px; color: #465e9d; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0 0 10px; color: #26335f; font: 600 clamp(28px, 7vw, 34px) / 1.1 var(--display); text-wrap: balance; }
	.lede { margin: 0 auto 22px; max-width: 34ch; color: #55545b; font-size: 14px; line-height: 1.55; text-wrap: pretty; }
	.plain { margin: 0; color: #55545b; font-size: 14px; }
	.cta { display: flex; justify-content: center; }
	.cta :global(.btn) { width: 100%; max-width: 320px; }
	.fine { margin: 16px auto 0; max-width: 38ch; color: #76747b; font-size: 12px; line-height: 1.5; text-wrap: pretty; }
	.fine strong { color: #26335f; font-weight: 700; }
	.error { margin: 0 0 4px; padding: 10px 12px; border-radius: 9px; background: #fff0eb; color: #8a351d; font-size: 14px; line-height: 1.55; }
	.secondary { display: inline-flex; justify-content: center; align-items: center; margin-top: 18px; padding: 11px 16px; border: 1px solid #dcdce0; border-radius: 10px; background: white; color: #18181b; font: inherit; font-weight: 650; cursor: pointer; transition: transform 160ms var(--out); }
	.secondary:active { transform: scale(0.97); }
	.secondary:disabled { opacity: 0.6; }
	.saved { margin: 24px 0 4px; padding-top: 18px; border-top: 1px solid #e5dfd0; text-align: left; }
	.section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
	.section-head h2 { margin: 0; font: 600 16px / 1.2 var(--display); }
	.section-head a { color: #3d5aa8; font-size: 12px; }
	.saved ul { margin: 10px 0 0; padding: 0; list-style: none; }
	.saved li { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee9de; }
	.saved li > a { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; color: #18181b; text-decoration: none; }
	.saved li strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.saved li span { flex: none; color: #76747b; font-size: 11px; }
	.saved li button { border: 0; background: transparent; color: #76747b; font-size: 20px; cursor: pointer; }
	.back { margin-top: 24px; color: #3d5aa8; font-size: 13px; text-decoration: none; }
	@media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
</style>
