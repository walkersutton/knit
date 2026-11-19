import type { RequestHandler } from './$types';
import { database } from '$lib/server/db';
import { patternPath, SITE } from '$lib/site';

export const prerender = false;

const PAGES = ['/', '/design', '/pattern', '/chart', '/about'];
/** Keeps one sitemap under the protocol's 50,000-URL limit with room to spare. */
const LIMIT = 5000;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entry = (path: string, lastmod?: unknown) => {
	const date = lastmod ? new Date(String(lastmod)) : null;
	return `<url><loc>${escape(SITE.url + path)}</loc>${date && !isNaN(+date) ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
};

/** The fixed pages plus every shared pattern, shared chart and knitter, so the catalogue can be found. If the database is down the fixed pages are still listed. */
export const GET: RequestHandler = async () => {
	let urls = PAGES.map((p) => entry(p));
	try {
		const sql = database();
		const [patterns, charts, people] = await Promise.all([
			sql`SELECT slug, created_at FROM shared_patterns ORDER BY created_at DESC LIMIT ${LIMIT}`,
			sql`SELECT id, created_at FROM shared_charts ORDER BY created_at DESC LIMIT ${LIMIT}`,
			sql`SELECT ravelry_username AS username, created_at FROM users ORDER BY created_at DESC LIMIT ${LIMIT}`
		]);
		urls = [
			...urls,
			...patterns.map((r) => entry(patternPath({ slug: String(r.slug) }), r.created_at)),
			...charts.map((r) => entry(`/chart/${r.id}`, r.created_at)),
			...people.map((r) => entry(`/people/${encodeURIComponent(String(r.username))}`, r.created_at))
		];
	} catch {
		// Fall back to the fixed pages.
	}
	return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
		headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }
	});
};
