<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let filter = $state<'unread' | 'all'>('unread');
	let unread = $derived(data.feedback.filter((f) => !f.read).length);
	let shown = $derived(filter === 'unread' ? data.feedback.filter((f) => !f.read) : data.feedback);

	const when = (iso: string) =>
		new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

	function confirmDelete(event: SubmitEvent) {
		if (!confirm('Delete this feedback for good?')) event.preventDefault();
	}
</script>

<svelte:head>
	<title>Feedback inbox — knit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>Feedback</h1>
		<p class="count">
			{data.feedback.length} {data.feedback.length === 1 ? 'note' : 'notes'}{#if unread}, <strong>{unread} unread</strong>{/if}
		</p>
		<div class="tabs" role="tablist" aria-label="Show">
			<button role="tab" aria-selected={filter === 'unread'} onclick={() => (filter = 'unread')}>Unread</button>
			<button role="tab" aria-selected={filter === 'all'} onclick={() => (filter = 'all')}>All</button>
		</div>
	</header>

	{#if shown.length === 0}
		<p class="empty">
			{filter === 'unread' && data.feedback.length ? 'All caught up.' : 'No feedback yet. Notes sent from the footer land here.'}
		</p>
	{:else}
		<ul>
			{#each shown as item (item.id)}
				<li class="note" class:unread={!item.read}>
					<div class="meta">
						<time datetime={item.createdAt}>{when(item.createdAt)}</time>
						<span class="who">{item.name || 'Anonymous'}</span>
						{#if item.email}<a href="mailto:{item.email}?subject=Your%20knit%20feedback">{item.email}</a>{/if}
					</div>
					<p class="message">{item.message}</p>
					<div class="actions">
						<form method="POST" action={item.read ? '?/unread' : '?/read'} use:enhance>
							<input type="hidden" name="id" value={item.id} />
							<button>{item.read ? 'Mark unread' : 'Mark read'}</button>
						</form>
						<form method="POST" action="?/delete" use:enhance onsubmit={confirmDelete}>
							<input type="hidden" name="id" value={item.id} />
							<button class="delete">Delete</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	main {
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: 40px 16px 64px;
		color: #26335f;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 14px;
		margin-bottom: 24px;
	}
	h1 {
		margin: 0;
		font: 600 clamp(32px, 7vw, 44px) / 1 var(--display);
	}
	.count {
		flex: 1;
		margin: 0;
		color: #55545b;
		font-size: 14px;
	}
	.count strong {
		color: #c8543e;
	}
	.tabs {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: 999px;
		background: #26335f12;
	}
	.tabs button {
		padding: 6px 14px;
		border: 0;
		border-radius: 999px;
		background: none;
		color: #55545b;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.tabs button[aria-selected='true'] {
		background: #fffdf8;
		color: #26335f;
		box-shadow: 0 1px 3px #26335f22;
	}
	.empty {
		padding: 48px 0;
		color: #76747b;
		font-size: 15px;
		text-align: center;
	}
	ul {
		display: grid;
		gap: 14px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Each note is a small patch, stitched like the dialog it came from. */
	.note {
		position: relative;
		padding: 20px 22px 16px;
		border-radius: 18px;
		background: #fffdf8;
		box-shadow: 0 0 0 1px #e6dcc0, 0 4px 14px #433c2914;
	}
	.note.unread::before {
		content: '';
		position: absolute;
		inset: 6px;
		border: 1.5px dashed #c9bb92;
		border-radius: 13px;
		pointer-events: none;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
		margin-bottom: 8px;
		color: #76747b;
		font-size: 13px;
	}
	.unread .meta::before {
		content: '';
		align-self: center;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #c8543e;
	}
	.who {
		color: #26335f;
		font-weight: 600;
	}
	.meta a {
		color: #465e9d;
	}
	.message {
		margin: 0 0 14px;
		font-size: 15px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	.actions button {
		position: relative;
		min-height: 32px;
		padding: 0 14px;
		border: 1.5px solid #e6dcc0;
		border-radius: 999px;
		background: #fff;
		color: #26335f;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 150ms ease-out, transform 120ms ease-out;
	}
	@media (hover: hover) and (pointer: fine) {
		.actions button:hover {
			background: #f2edcf;
		}
		.actions .delete:hover {
			background: #c8543e14;
		}
	}
	.actions button:active {
		transform: scale(0.97);
	}
	.actions .delete {
		border-color: #c8543e40;
		color: #b4432f;
	}
	button:focus-visible {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}
</style>
