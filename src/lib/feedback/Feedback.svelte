<script lang="ts">
	// The footer's feedback row: a prompt and a cream label sewn on at a tilt, which opens the feedback dialog.
	import FeedbackForm from './FeedbackForm.svelte';

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let open = $state(false);
	const close = () => (open = false);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<div class="row">
	<span class="prompt">Spotted a bug, or have an idea?</span>
	<button type="button" class="stitch quiet label" aria-haspopup="dialog" aria-expanded={open} onclick={() => (open = true)}>Feedback</button>
</div>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby={id} onclose={close} onclick={(e) => e.target === dialog && close()}>
	{#if open}<FeedbackForm {id} onclose={close} />{/if}
</dialog>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px 14px;
		margin: -4px 0 26px;
	}
	.prompt {
		color: rgb(250 243 220 / 0.8);
		font-size: 15px;
	}
	/* The shared stitched label, sewn on at a tilt: it straightens and lifts on hover. */
	.label {
		transform: rotate(-2deg);
		transform-origin: 50% 0;
		box-shadow: 0 3px 10px #1a234433;
		transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	@media (hover: hover) and (pointer: fine) {
		.label:hover:not(:disabled) {
			transform: rotate(0deg) translateY(-3px) scale(1.05);
			box-shadow: 0 10px 18px #1a23444d;
		}
	}
	.label:active:not(:disabled) {
		transform: rotate(0deg) scale(0.97);
	}
	@media (prefers-reduced-motion: reduce) {
		.label:hover:not(:disabled) {
			transform: rotate(-2deg);
		}
	}

	dialog {
		width: min(calc(100% - 32px), 460px);
		max-height: calc(100dvh - 32px);
		padding: 0;
		border: 0;
		background: transparent;
		overflow: visible;
	}
	dialog::backdrop {
		background: #26335f66;
	}
	dialog[open] {
		animation: pop 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	dialog[open]::backdrop {
		animation: fade 200ms ease-out;
	}
	@keyframes pop {
		from { opacity: 0; transform: scale(0.96); }
	}
	@keyframes fade {
		from { opacity: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		dialog[open],
		dialog[open]::backdrop { animation: none; }
	}
</style>
