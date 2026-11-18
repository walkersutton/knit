<script lang="ts">
	let { kind, id, likes, liked, signedIn, class: klass = '' }: { kind: 'chart' | 'pattern'; id: string; likes: number; liked: boolean; signedIn: boolean; class?: string } = $props();

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

<span class="like {klass}">
	<button type="button" aria-pressed={mine} onclick={toggle}>
		<span aria-hidden="true">{mine ? '♥' : '♡'}</span>
		{mine ? 'Liked' : 'Like'} · {count}
	</button>
	{#if note}<small role="status">{note}{#if !signedIn} <a href="/account">Sign in</a>{/if}</small>{/if}
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
	small {
		color: #5d6385;
		font-size: 12px;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover {
			background: #f3e9c9;
		}
	}
</style>
