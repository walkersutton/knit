<script lang="ts">
	import { openSignIn } from '$lib/signin.svelte';
	let { kind, id, likes, liked, signedIn, class: klass = '', icon = false }: { kind: 'chart' | 'pattern'; id: string; likes: number; liked: boolean; signedIn: boolean; class?: string; icon?: boolean } = $props();

	let count = $state(0);
	let mine = $state(false);
	let busy = $state(false);
	let note = $state('');

	// Moving to another shared item reuses this component.
	$effect(() => {
		count = likes;
		mine = liked;
		note = '';
	});

	async function toggle() {
		if (!signedIn) {
			note = 'Sign in with Ravelry to like this.';
			return;
		}
		if (busy) return;
		busy = true;
		note = '';
		const was = mine;
		mine = !was;
		count += was ? -1 : 1;
		try {
			const res = await fetch(`/api/${kind}s/${id}/like`, { method: was ? 'DELETE' : 'PUT' });
			if (!res.ok) throw new Error();
			const body = await res.json();
			count = body.likes;
			mine = body.liked;
		} catch {
			mine = was;
			count += was ? 1 : -1;
			note = 'Could not save your like. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<span class="like {klass}" class:icon>
	<button type="button" aria-pressed={mine} aria-label={icon ? `${mine ? 'Unlike' : 'Like'}, ${count}` : undefined} title={icon ? (mine ? 'Liked' : 'Like') : undefined} onclick={toggle}>
		{#if icon}
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={mine ? 'currentColor' : 'none'} /></svg>
			{count}
		{:else}
			<span aria-hidden="true">{mine ? '♥' : '♡'}</span>
			{mine ? 'Liked' : 'Like'} · {count}
		{/if}
	</button>
	{#if note}<small role="status">{note}{#if !signedIn} <button type="button" class="signin" onclick={openSignIn}>Sign in</button>{/if}</small>{/if}
</span>

<style>
	.like {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 40px;
		padding: 0 14px;
		border: 1.5px solid #c9bb92;
		border-radius: 8px;
		background: #fffdf6;
		color: #26335f;
		font: inherit;
		cursor: pointer;
	}
	button[aria-pressed='true'] {
		border-color: #8f3a2a;
		color: #8f3a2a;
	}
	button:active {
		filter: brightness(0.93);
	}
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.signin {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	small {
		color: #5d6385;
		font-size: 12px;
	}
	/* Icon mode: a bare heart and count for a toolbar. The toolbar draws the frame. */
	.icon {
		position: relative;
		display: inline-flex;
		height: 100%;
	}
	.icon button {
		gap: 5px;
		height: 100%;
		padding: 0 10px;
		border: 0;
		border-radius: 0;
		background: transparent;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}
	.icon button[aria-pressed='true'] {
		color: #c8543e;
	}
	.icon svg {
		width: 18px;
		height: 18px;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linejoin: round;
	}
	.icon small {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 5;
		width: max-content;
		max-width: 220px;
		padding: 8px 10px;
		border-radius: 8px;
		background: #fffdf8;
		box-shadow: 0 0 0 1px #c9bb9266, 0 6px 18px #1a234433;
	}
	.icon .signin {
		min-width: 0;
		height: auto;
		padding: 0;
		font-size: inherit;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover {
			background: #f3e9c9;
		}
		.icon button:hover {
			background: #26335f0f;
		}
	}
</style>
