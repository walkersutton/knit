<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	async function markRead(id: string) {
		await fetch(`/api/feedback/${id}/read`, { method: 'POST' });
	}

	async function dismiss(id: string) {
		await fetch(`/api/feedback/${id}/dismiss`, { method: 'POST' });
	}
</script>

<svelte:head>
	<title>Feedback — knit</title>
</svelte:head>

<div class="admin">
	<h1>Feedback</h1>
	{#if data.feedback.length === 0}
		<p class="empty">No feedback yet. It will appear here when visitors submit it.</p>
	{:else}
		<div class="list">
			{#each data.feedback as item (item.id)}
				<article class:unread={!item.read}>
					<div class="meta">
						<span class="date">{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
						{#if item.name}<span class="name">{item.name}</span>{/if}
						{#if item.email}<a href="mailto:{item.email}" class="email">{item.email}</a>{/if}
					</div>
					<p class="message">{item.message}</p>
					<div class="actions">
						{#if !item.read}
							<button onclick={() => markRead(item.id)}>Mark read</button>
						{/if}
						<button class="dismiss" onclick={() => dismiss(item.id)}>Dismiss</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.admin {
		max-width: 720px;
		margin: 0 auto;
		padding: 32px 16px;
	}
	h1 {
		margin: 0 0 24px;
		font-family: var(--display);
		font-size: 28px;
		font-weight: 650;
	}
	.empty {
		color: var(--muted);
		font-size: 15px;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	article {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: #fff;
	}
	article.unread {
		border-color: #465e9d;
		box-shadow: 0 0 0 1px #465e9d;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
		font-size: 13px;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.name {
		font-weight: 500;
		color: var(--ink);
	}
	.email {
		color: #465e9d;
		text-decoration: none;
	}
	.email:hover {
		text-decoration: underline;
	}
	.message {
		margin: 0 0 12px;
		font-size: 14.5px;
		line-height: 1.55;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	button {
		padding: 6px 14px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		transition: background-color 150ms ease-out;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover {
			background: var(--wash);
		}
	}
	button:active {
		transform: scale(0.97);
	}
	.dismiss {
		color: #c8543e;
		border-color: #c8543e33;
	}
	.dismiss:hover {
		background: #c8543e11;
	}
</style>
