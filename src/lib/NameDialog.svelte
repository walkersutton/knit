<script lang="ts">
	// Asks for a name in the site's own dialog, in place of the browser's prompt(). A cream patch
	// with a line of stitching just inside its edge, like the feedback and sign-in dialogs.
	import { tick } from 'svelte';
	import { NOTES_MAX } from '$lib/sweater/library';

	let {
		open = $bindable(false),
		title,
		lede = '',
		label = 'Name',
		value = '',
		confirm = 'Save',
		notes,
		notesLabel = 'Notes',
		notesPlaceholder = 'Yarn, fit, who it is for…',
		onsubmit
	}: {
		open?: boolean;
		title: string;
		lede?: string;
		label?: string;
		/** The name offered when the dialog opens. */
		value?: string;
		confirm?: string;
		/** Gives the dialog a notes box, starting with this text (possibly empty). Left out, there is none. */
		notes?: string;
		notesLabel?: string;
		notesPlaceholder?: string;
		onsubmit: (name: string, notes: string) => void;
	} = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let field = $state<HTMLInputElement>();
	let draft = $state('');
	let draftNotes = $state('');
	const close = () => (open = false);
	let ok = $derived(draft.trim().length > 0);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			draft = value;
			draftNotes = notes ?? '';
			dialog.showModal();
			tick().then(() => field?.select());
		} else if (!open && dialog.open) dialog.close();
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!ok) return;
		const name = draft.trim();
		close();
		onsubmit(name, draftNotes);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby={id} onclose={close} onclick={(e) => e.target === dialog && close()}>
	{#if open}
		<form class="patch" onsubmit={submit}>
			<h2 {id}>{title}</h2>
			{#if lede}<p class="lede">{lede}</p>{/if}
			<label class="field">
				<span>{label}</span>
				<input bind:this={field} bind:value={draft} maxlength="60" autocomplete="off" required />
			</label>
			{#if notes !== undefined}
				<label class="field notes">
					<span>{notesLabel} <em>optional</em></span>
					<textarea bind:value={draftNotes} rows="4" maxlength={NOTES_MAX} placeholder={notesPlaceholder}></textarea>
				</label>
			{/if}
			<div class="actions">
				<button type="button" class="chunk quiet sm" onclick={close}>Cancel</button>
				<button type="submit" class="chunk sm" disabled={!ok}>{confirm}</button>
			</div>
		</form>
	{/if}
</dialog>

<style>
	dialog {
		width: min(calc(100% - 32px), 400px);
		max-height: calc(100dvh - 32px);
		padding: 0;
		border: 0;
		background: transparent;
		color: #26335f;
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
	.patch {
		position: relative;
		padding: 28px 26px 24px;
		border-radius: 26px;
		background: #fffdf8;
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
	h2 {
		margin: 0 0 8px;
		font: 600 clamp(22px, 6vw, 26px) / 1.1 var(--display);
		text-wrap: balance;
	}
	.lede {
		margin: 0 0 16px;
		color: #55545b;
		line-height: 1.55;
		text-wrap: pretty;
	}
	.field {
		display: grid;
		gap: 6px;
		margin: 16px 0 20px;
	}
	.lede + .field {
		margin-top: 0;
	}
	.field > span {
		font-size: 13px;
		font-weight: 600;
	}
	.field.notes {
		margin-top: -6px;
	}
	.field em {
		margin-left: 4px;
		color: #8d8a80;
		font-style: normal;
		font-weight: 400;
	}
	:is(input, textarea) {
		width: 100%;
		min-width: 0;
		padding: 10px 12px;
		border: 1.5px solid #e6dcc0;
		border-radius: 12px;
		background: #fff;
		color: #26335f;
		font: inherit;
		font-size: 16px; /* keeps iOS from zooming the page on focus */
		transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
	}
	textarea {
		resize: vertical;
		line-height: 1.4;
	}
	:is(input, textarea):focus {
		outline: none;
		border-color: #465e9d;
		box-shadow: 0 0 0 3px #465e9d26;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}
</style>
