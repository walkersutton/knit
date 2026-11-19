<script lang="ts">
	import { NOTES_MAX } from './library';

	/**
	 * The knitter's own words about a chart or a pattern. Editable, it saves itself a moment after
	 * typing stops (and on leaving the box); read-only, it is the author's text as they wrote it.
	 */
	let {
		value,
		onsave,
		label = 'Notes',
		placeholder = 'Yarn, needles, ideas, who it is for…',
		hint
	}: {
		value: string;
		/** Given only when the notes may be edited. A rejected promise shows its message. */
		onsave?: (text: string) => void | Promise<void>;
		label?: string;
		placeholder?: string;
		/** A line under the box, such as where the notes are kept. */
		hint?: string;
	} = $props();

	const uid = $props.id();
	// The box keeps what is typed; a new value from outside (another chart picked) replaces it.
	let text = $state('');
	let last = '';
	$effect.pre(() => {
		text = last = value;
	});
	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let problem = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	/** The save in force when typing began, so a note never lands on a chart picked since. */
	let saver: typeof onsave;

	async function flush() {
		clearTimeout(timer);
		timer = undefined;
		const save = saver;
		if (!save || text === last) return;
		const sent = text;
		status = 'saving';
		try {
			await save(sent);
			last = sent;
			status = 'saved';
			setTimeout(() => status === 'saved' && (status = 'idle'), 1600);
		} catch (e) {
			status = 'error';
			problem = e instanceof Error ? e.message : 'Could not save the notes.';
		}
	}
	function input() {
		saver ??= onsave;
		clearTimeout(timer);
		timer = setTimeout(flush, 700);
	}
	$effect(() => () => {
		// Leaving the page (or switching chart) mid-sentence still keeps what was typed.
		if (timer) flush();
	});
</script>

{#if onsave}
	<div class="notes">
		<div class="top">
			<label for="notes-{uid}">{label}</label>
			<span class="status" class:bad={status === 'error'} role="status">
				{#if status === 'saving'}Saving…{:else if status === 'saved'}Saved{:else if status === 'error'}{problem}{:else if text.length > NOTES_MAX - 100}{NOTES_MAX - text.length} left{/if}
			</span>
		</div>
		<textarea id="notes-{uid}" bind:value={text} oninput={input} onblur={flush} maxlength={NOTES_MAX} rows="3" {placeholder}></textarea>
		{#if hint}<p class="hint">{hint}</p>{/if}
	</div>
{:else if value.trim()}
	<div class="notes">
		<span class="label">{label}</span>
		<p class="text">{value}</p>
	</div>
{/if}

<style>
	.notes {
		display: grid;
		gap: 6px;
	}
	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}
	label,
	.label {
		color: var(--muted, #5d6385);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.status {
		color: var(--muted, #5d6385);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.status.bad {
		color: var(--accent-deep, #8f3a2a);
	}
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-height: 76px;
		max-height: 320px;
		field-sizing: content;
		padding: 8px 10px;
		border: 1px solid var(--line-strong, #c9bb92);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink, #26335f);
		font: 14px/1.45 inherit;
		font-family: inherit;
		resize: vertical;
	}
	textarea::placeholder {
		color: color-mix(in srgb, var(--muted, #5d6385) 70%, transparent);
	}
	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.hint {
		margin: 0;
		color: var(--muted, #5d6385);
		font-size: 12px;
	}
	.text {
		margin: 0;
		color: var(--ink, #26335f);
		font-size: 15px;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
