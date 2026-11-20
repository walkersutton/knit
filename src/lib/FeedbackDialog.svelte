<script lang="ts">
	let { open, onClose }: { open: boolean; onClose: () => void } = $props();

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let submitting = $state(false);
	let done = $state(false);
	let error = $state('');

	function reset() {
		name = '';
		email = '';
		message = '';
		done = false;
		error = '';
	}

	async function submit() {
		if (!message.trim() || message.trim().length < 10) {
			error = 'Please write at least 10 characters.';
			return;
		}
		submitting = true;
		error = '';
		try {
			const res = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.message ?? 'Something went wrong. Please try again.';
				return;
			}
			done = true;
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function close() {
		reset();
		onClose();
	}

	// Close on escape
	$effect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') close();
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<div class="backdrop" onclick={close} role="presentation">
		<div class="dialog" onclick={(e) => e.stopPropagation()} tabindex="-1" role="dialog" aria-modal="true" aria-label="Send feedback">
			{#if done}
				<div class="done">
					<p class="icon">✓</p>
					<h2>Thanks for your feedback!</h2>
					<p>It helps a lot. I'll read it soon.</p>
					<button type="button" onclick={close}>Close</button>
				</div>
			{:else}
				<div class="form">
					<h2>Send feedback</h2>
					<p class="hint">Found a bug? Have an idea? Want to say hello? Write below.</p>
					{#if error}<p class="err">{error}</p>{/if}
					<label>
						Name <span class="optional">(optional)</span>
						<input bind:value={name} placeholder="Your name" autocomplete="name" />
					</label>
					<label>
						Email <span class="optional">(optional)</span>
						<input type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" />
					</label>
					<label>
						Message <span class="req">*</span>
						<textarea bind:value={message} placeholder="Tell me what you think…" rows="5" required></textarea>
					</label>
					<div class="actions">
						<button type="button" class="cancel" onclick={close}>Cancel</button>
						<button type="button" class="send" disabled={submitting} onclick={submit}>
							{#if submitting}Sending…{:else}Send{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.4);
		animation: fade-in 150ms ease-out;
		border: 0;
		padding: 0;
		margin: 0;
		cursor: default;
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.dialog {
		width: min(520px, calc(100vw - 32px));
		max-height: calc(100vh - 64px);
		overflow-y: auto;
		padding: 28px;
		border-radius: 16px;
		background: #fff;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
		animation: slide-up 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	@keyframes slide-up {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
	h2 {
		margin: 0 0 8px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 650;
	}
	.hint {
		margin: 0 0 20px;
		color: var(--muted);
		font-size: 14px;
	}
	.err {
		margin: 0 0 16px;
		padding: 8px 12px;
		border-radius: 8px;
		background: #c8543e15;
		color: #c8543e;
		font-size: 13.5px;
	}
	label {
		display: grid;
		gap: 6px;
		margin-bottom: 16px;
		font-size: 14px;
		font-weight: 500;
	}
	.optional {
		font-weight: 400;
		color: var(--muted);
	}
	.req {
		font-weight: 400;
		color: #c8543e;
	}
	input,
	textarea {
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font: inherit;
		font-size: 14.5px;
		resize: vertical;
		transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
	}
	input:focus,
	textarea:focus {
		outline: none;
		border-color: #465e9d;
		box-shadow: 0 0 0 3px #465e9d33;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 8px;
	}
	button {
		padding: 10px 20px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: #fff;
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 150ms ease-out, transform 120ms ease-out;
	}
	button:active:not(:disabled) {
		transform: scale(0.97);
	}
	@media (hover: hover) and (pointer: fine) {
		.cancel:hover {
			background: var(--wash);
		}
	}
	.send {
		background: #465e9d;
		color: #faf3dc;
		border-color: #465e9d;
	}
	.send:hover:not(:disabled) {
		background: #3a4f8a;
	}
	.send:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Done state */
	.done {
		text-align: center;
		padding: 12px 0;
	}
	.icon {
		display: inline-grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin: 0 auto 16px;
		border-radius: 50%;
		background: #465e9d;
		color: #faf3dc;
		font-size: 24px;
		font-weight: 600;
	}
	.done h2 {
		margin-bottom: 8px;
	}
	.done p {
		color: var(--muted);
		font-size: 14px;
		margin-bottom: 20px;
	}
	.done button {
		min-width: 120px;
	}
</style>
