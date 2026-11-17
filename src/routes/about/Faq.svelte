<script lang="ts">
	import { faq } from './content';
</script>

<div class="faq">
	{#each faq as { q, a } (q)}
		<details>
			<summary>{q}</summary>
			<p>{a}</p>
		</details>
	{/each}
</div>

<style>
	.faq {
		border-top: 1px solid var(--line);
	}
	details {
		border-bottom: 1px solid var(--line);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 48px;
		padding: 8px 0;
		font-family: var(--display);
		font-size: 15px;
		font-weight: 550;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: '';
		flex: none;
		width: 8px;
		height: 8px;
		border-right: 2px solid var(--muted);
		border-bottom: 2px solid var(--muted);
		transform: rotate(45deg) translateY(-2px);
		transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	details[open] summary::after {
		transform: rotate(-135deg);
	}
	summary:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	p {
		margin: 0 0 16px;
		max-width: 62ch;
		color: #3f3f46;
	}
	@media (prefers-reduced-motion: reduce) {
		summary::after {
			transition: none;
		}
	}
</style>
