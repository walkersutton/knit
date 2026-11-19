/** Where a shared pattern lives: /pattern/ and the URL form of its name. */
export const patternPath = (p: { slug: string }) => `/pattern/${p.slug}`;

/** Site-wide facts used for meta tags and structured data. */
export const SITE = {
	name: 'knit',
	url: 'https://knit.walkersutton.com',
	source: 'https://github.com/walkersutton/knit',
	image: 'https://knit.walkersutton.com/og.png',
	imageAlt: 'knit: design a sweater in 3D and get the written knitting pattern'
};
