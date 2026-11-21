/**
 * Share knit's starter designs (src/lib/server/seed.ts) from its house account and like each once, so the chart and
 * pattern libraries and the home page's favourites have something in them. Safe to run again: a design already
 * shared is updated in place. `--remove` deletes the house account, and with it everything it shared and liked.
 *
 *   pnpm seed            (reads DATABASE_URL from .env.local)
 *   pnpm seed --remove
 */
import { database } from '$lib/server/db';
import { shareChart } from '$lib/server/charts';
import { sharePattern } from '$lib/server/patterns';
import { centerpieces, charts, patterns, SEED_USER } from '$lib/server/seed';

const sql = database();

if (process.argv.includes('--remove')) {
	const gone = await sql`DELETE FROM users WHERE ravelry_user_id = ${SEED_USER.ravelryUserId} RETURNING id`;
	console.log(gone.length ? 'Removed the house account and everything it shared.' : 'There was no house account.');
	process.exit(0);
}

const [user] = await sql`
	INSERT INTO users (ravelry_user_id, ravelry_username) VALUES (${SEED_USER.ravelryUserId}, ${SEED_USER.username})
	ON CONFLICT (ravelry_user_id) DO UPDATE SET ravelry_username = EXCLUDED.ravelry_username
	RETURNING id
`;
const userId: string = user.id;

// Favourites with the same number of likes show newest first, so each list is shared last-to-first.
for (const c of [...charts, ...centerpieces].reverse()) {
	const shared = await shareChart(userId, c.name, c, c.notes);
	if (shared === 'limit') throw new Error('The house account has shared as many charts as it can.');
	await sql`INSERT INTO chart_likes (user_id, chart_id) VALUES (${userId}, ${shared.id}) ON CONFLICT DO NOTHING`;
	console.log(`chart    ${c.name} → /chart/${shared.id}`);
}
for (const p of [...patterns].reverse()) {
	const shared = await sharePattern(userId, p.name, p.design, p.notes);
	if (shared === 'limit') throw new Error('The house account has shared as many patterns as it can.');
	await sql`INSERT INTO pattern_likes (user_id, pattern_id) VALUES (${userId}, ${shared.id}) ON CONFLICT DO NOTHING`;
	console.log(`pattern  ${p.name} → /pattern/${shared.slug}`);
}
console.log(`Shared ${charts.length} charts, ${centerpieces.length} centerpieces and ${patterns.length} patterns as ${SEED_USER.username}.`);
