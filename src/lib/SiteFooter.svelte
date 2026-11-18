<script lang="ts">
	import { SITE } from '$lib/site';
</script>

<footer>
	<p>knit is open source. <a href={SITE.source} target="_blank" rel="noopener">View the code on GitHub</a>.</p>
</footer>

<style>
	/* The closing band for every content page. The designer runs edge to edge and has no footer. */
	footer {
		padding: 28px 16px;
		background: #465e9d;
		color: #faf3dc;
		font-size: 13px;
		line-height: 1.6;
		text-align: center;
	}
	p {
		margin: 0;
	}
	a {
		color: inherit;
	}
	a:focus-visible {
		outline: 2px solid #faf3dc;
		outline-offset: 2px;
		border-radius: 4px;
	}
</style>
