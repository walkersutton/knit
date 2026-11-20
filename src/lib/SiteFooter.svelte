<script lang="ts">
	import { SITE } from '$lib/site';
	import FeedbackDialog from './FeedbackDialog.svelte';

	const links = [
		{ t: 'Design', href: '/design' },
		{ t: 'Patterns', href: '/pattern' },
		{ t: 'Charts', href: '/chart' },
		{ t: 'How it works', href: '/about' }
	];

	let open = false;
</script>

<footer>
	<div class="body">
		<p class="sign">Happy knitting.</p>
		<nav aria-label="Footer">
			{#each links as l}<a href={l.href}>{l.t}</a>{/each}
			<button type="button" class="feedback-btn" onclick={() => open = true}>Feedback</button>
		</nav>
		<p class="fine">knit is open source. <a href={SITE.source} target="_blank" rel="noopener">View the code on GitHub</a>.</p>
	</div>
</footer>

<FeedbackDialog {open} onClose={() => open = false} />

<style>
	/* The closing band for every content page. The designer runs edge to edge and has no footer. */
	footer {
		/* The band itself is knitted: the page's stitch texture, redrawn in cream. */
		background: #465e9d
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='28' viewBox='0 0 18 28'%3E%3Cdefs%3E%3Cg id='v' fill='%23faf3dc' fill-opacity='.07'%3E%3Cpath d='M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z' transform='scale(.62 .46)'/%3E%3Cpath d='M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z' transform='scale(-.62 .46)'/%3E%3C/g%3E%3C/defs%3E%3Cuse href='%23v' x='9' y='12'/%3E%3Cuse href='%23v' x='0' y='26'/%3E%3Cuse href='%23v' x='18' y='26'/%3E%3C/svg%3E");
		color: #faf3dc;
	}
	.body {
		max-width: 912px;
		margin: 0 auto;
		padding: 40px 16px 32px;
		text-align: center;
	}
	.sign {
		margin: 0;
		font: 600 clamp(32px, 7vw, 48px) / 1 var(--display);
		letter-spacing: -0.01em;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px 20px;
		margin: 20px 0 24px;
		font-size: 15px;
	}
	nav a,
	nav .feedback-btn {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		font-weight: 500;
		text-decoration: none;
	}
	.feedback-btn {
		background: transparent;
		border: 1px solid #faf3dc55;
		border-radius: 8px;
		padding: 4px 12px;
		color: #faf3dc;
		font: inherit;
		font-size: 14px;
		cursor: pointer;
		transition: background-color 150ms ease-out, border-color 150ms ease-out;
	}
	@media (hover: hover) and (pointer: fine) {
		nav a:hover {
			text-decoration: underline;
			text-underline-offset: 4px;
			text-decoration-thickness: 2px;
			text-decoration-color: #c8543e;
		}
		.feedback-btn:hover {
			background: #faf3dc15;
			border-color: #faf3dc99;
		}
	}
	.feedback-btn:active {
		transform: scale(0.97);
	}
	.fine {
		margin: 0;
		color: rgb(250 243 220 / 0.7);
		font-size: 13px;
		line-height: 1.6;
	}
	a {
		color: inherit;
	}
	a:focus-visible,
	.feedback-btn:focus-visible {
		outline: 2px solid #faf3dc;
		outline-offset: 2px;
		border-radius: 4px;
	}
</style>
