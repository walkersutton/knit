<script lang="ts">
	import { onMount } from 'svelte';

	type Member = { username: string; photo: string | null };

	let members = $state<Member[]>([]);
	let total = $state(0);
	let broken = $state<Record<string, true>>({});

	const TONES = ['#f4d5c3', '#f6e2a4', '#d7e4d3', '#d3e3f2'];
	// The same knitter always gets the same colour.
	const tone = (name: string) => TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length];
	const initial = (name: string) => (name.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
	const more = $derived(Math.max(0, total - members.length));

	onMount(async () => {
		try {
			const res = await fetch('/api/members');
			if (!res.ok) return;
			const data = await res.json();
			members = data.members;
			total = data.total;
		} catch {
			// The circles are a nicety; the page is complete without them.
		}
	});
</script>

{#if members.length}
	<section class="members" aria-labelledby="members-h">
		<h2 id="members-h">{total === 1 ? '1 knitter has' : `${total} knitters have`} joined with Ravelry</h2>
		<ul>
			{#each members as m (m.username)}
				<li>
					<a
						href="https://www.ravelry.com/people/{encodeURIComponent(m.username)}"
						target="_blank"
						rel="noopener"
						title={m.username}
						aria-label="{m.username} on Ravelry"
						style="--tone: {tone(m.username)}"
					>
						{#if m.photo && !broken[m.username]}
							<img src={m.photo} alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer" onerror={() => (broken[m.username] = true)} />
						{:else}
							<span aria-hidden="true">{initial(m.username)}</span>
						{/if}
					</a>
				</li>
			{/each}
			{#if more}<li class="more" aria-label="and {more} more">+{more}</li>{/if}
		</ul>
		<p><a href="/account">Sign in with Ravelry</a> to save your designs and join them.</p>
	</section>
{/if}

<style>
	.members {
		max-width: 640px;
		width: 100%;
		margin: 0 auto;
		padding: 0 16px 56px;
		color: #26335f;
		text-align: center;
	}
	h2 {
		margin: 0 0 16px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
		text-wrap: balance;
	}
	ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li a,
	.more {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		overflow: hidden;
		border-radius: 50%;
		background: var(--tone, #e6dcc0);
		box-shadow: 0 0 0 3px #faf3dc, 0 3px 0 3px #465e9d;
		color: #26335f;
		font-family: var(--display);
		font-size: 20px;
		font-weight: 600;
		text-decoration: none;
	}
	.more {
		--tone: #e6dcc0;
		font-size: 14px;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	li a {
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	li a:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 4px;
		border-radius: 50%;
	}
	@media (hover: hover) and (pointer: fine) {
		li a:hover {
			transform: translateY(-3px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		li a {
			transition: none;
		}
	}
	p {
		margin: 20px 0 0;
		color: #5d6385;
		font-size: 14px;
	}
	p a {
		color: #26335f;
		font-weight: 500;
	}
</style>
