<script lang="ts">
	import { SITE } from './site';

	let {
		title,
		description,
		path,
		jsonLd,
		image,
		imageAlt,
		type = 'website',
		noindex = false
	}: {
		title: string;
		description: string;
		path: string;
		jsonLd?: object | object[];
		/** A path on this site (such as /og/pattern/123.png). Defaults to the site-wide image. */
		image?: string;
		imageAlt?: string;
		type?: 'website' | 'article' | 'profile';
		/** For pages that only make sense for the visitor, such as the pattern they just designed. */
		noindex?: boolean;
	} = $props();

	let url = $derived(SITE.url + path);
	let picture = $derived(image ? SITE.url + image : SITE.image);
	let alt = $derived(imageAlt ?? (image ? title : SITE.imageAlt));
	// Escape "<" so the JSON can never close the script element early.
	let ld = $derived(jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</${'script'}>` : '');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:type" content={type} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={picture} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={alt} />
	<meta name="twitter:image:alt" content={alt} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={picture} />
	{@html ld}
</svelte:head>
