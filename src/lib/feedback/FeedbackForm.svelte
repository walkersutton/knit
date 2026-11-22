<script lang="ts">
	// The feedback form, dressed like the site's other dialogs: a cream patch with a dashed
	// line of stitching just inside its edge.
	import { onMount } from 'svelte';
	import { sendFeedback } from './send';
	import { ACTION, loadTurnstile, SITEKEY } from './turnstile';

	let { id, onclose }: { id: string; onclose: () => void } = $props();

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let busy = $state(false);
	let done = $state(false);
	let error = $state('');

	// Cloudflare Turnstile: the widget hands back a single-use token, sent along with the note.
	let challenge = $state<HTMLDivElement>();
	let token = $state('');
	let widget: string | undefined;
	onMount(() => {
		let gone = false;
		loadTurnstile()
			.then((turnstile) => {
				if (gone || !challenge) return;
				widget = turnstile.render(challenge, {
					sitekey: SITEKEY,
					action: ACTION,
					theme: 'light',
					size: 'flexible',
					callback: (t: string) => (token = t),
					'expired-callback': () => (token = ''),
					'error-callback': () => {
						token = '';
					}
				});
			})
			.catch(() => (error = "The spam check couldn't load. Please check your connection and try again."));
		return () => {
			gone = true;
			if (widget !== undefined) window.turnstile?.remove(widget);
		};
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = (await sendFeedback({ name, email, message, turnstile: token })) ?? '';
		busy = false;
		done = !error;
		// A token is good for one try: fetch a fresh one before the next.
		if (!done && widget !== undefined && token) {
			token = '';
			window.turnstile?.reset(widget);
		}
	}
</script>

<div class="patch">
	<button class="x" type="button" aria-label="Close" disabled={busy} onclick={onclose}>×</button>
	{#if done}
		<div class="done">
			<span class="badge" aria-hidden="true">✓</span>
			<h2 {id}>Thank you</h2>
			<p class="lede">Every note gets read. It really does help shape what knit becomes.</p>
			<button type="button" class="stitch" onclick={onclose}>Back to knitting</button>
		</div>
	{:else}
		<form onsubmit={submit}>
			<h2 {id}>Tell us what you think</h2>
			<p class="lede">Found a bug, missing a garment, or just want to say hello? We'd love to hear it.</p>
			<label class="field">
				<span>Message</span>
				<textarea bind:value={message} rows="4" maxlength="5000" required placeholder="The sleeve maths on my cardigan…"></textarea>
			</label>
			<div class="pair">
				<label class="field">
					<span>Name <em>optional</em></span>
					<input bind:value={name} autocomplete="name" />
				</label>
				<label class="field">
					<span>Email <em>optional</em></span>
					<input type="email" bind:value={email} autocomplete="email" placeholder="If you'd like a reply" />
				</label>
			</div>
			<div class="challenge" bind:this={challenge}></div>
			{#if error}<p class="err" role="alert">{error}</p>{/if}
			<div class="actions">
				<button type="submit" class="stitch" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
			</div>
		</form>
	{/if}
</div>

<style>	.patch {
		position: relative;
		padding: 30px 28px 26px;
		border-radius: 26px;
		background: #fffdf8;
		color: #26335f;
		text-align: left;
		font-size: 14px;
		line-height: 1.45;
		box-shadow: 0 16px 50px #433c2933, 0 0 0 1px #e6dcc0;
	}
	.patch::before {
		content: '';
		position: absolute;
		inset: 8px;
		border: 1.5px dashed #c9bb92;
		border-radius: 19px;
		pointer-events: none;
	}
	.x {
		position: absolute;
		top: 14px;
		right: 16px;
		z-index: 1;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: #76747b;
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
	}
	.patch h2 {
		margin: 0 32px 8px 0;
		font: 600 clamp(24px, 6vw, 28px) / 1.1 var(--display);
		text-wrap: balance;
	}
	.patch .lede {
		margin: 0 0 20px;
		max-width: 40ch;
		color: #55545b;
		line-height: 1.55;
		text-wrap: pretty;
	}
	.patch .field {
		display: grid;
		gap: 6px;
		margin-bottom: 14px;
	}
	.patch .field > span {
		font-size: 13px;
		font-weight: 600;
	}
	.patch .field em {
		margin-left: 4px;
		color: #8d8a80;
		font-style: normal;
		font-weight: 400;
	}
	.patch :is(input, textarea) {
		width: 100%;
		min-width: 0;
		padding: 10px 12px;
		border: 1.5px solid #e6dcc0;
		border-radius: 12px;
		background: #fff;
		color: #26335f;
		font: inherit;
		font-size: 16px; /* 16px keeps iOS from zooming the page on focus */
		resize: vertical;
		transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
	}
	.patch :is(input, textarea)::placeholder {
		color: #aaa596;
	}
	.patch :is(input, textarea):focus {
		outline: none;
		border-color: #465e9d;
		box-shadow: 0 0 0 3px #465e9d26;
	}
	.patch .err {
		margin: 0 0 14px;
		color: #b4432f;
		font-size: 13px;
	}
	.patch button:focus-visible {
		outline: 2px solid #2563eb;
		outline-style: solid;
		outline-offset: 2px;
	}
	@media (max-width: 480px) {
		.patch {
			padding: 26px 20px 22px;
		}
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 12px;
	}
	.challenge:not(:empty) {
		margin: 2px 0 14px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 4px;
	}
	@media (max-width: 480px) {
		.pair { grid-template-columns: 1fr; }
	}
	.done {
		padding: 6px 0 2px;
		text-align: center;
	}
	.done h2 {
		margin-right: 0;
	}
	.done .lede {
		margin-inline: auto;
	}
	.badge {
		display: inline-grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin-bottom: 14px;
		border: 1.5px dashed #c9bb92;
		border-radius: 50%;
		background: #f2edcf;
		color: #465e9d;
		font-size: 22px;
		font-weight: 700;
	}
</style>
