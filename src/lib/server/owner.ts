import { createHash } from 'node:crypto';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { env } from './env';

// The owner signs in on walkersutton.com, the same way stats.walkersutton.com does.
// That site sets a `ws_admin` session cookie scoped to the whole walkersutton.com
// domain, so knit.walkersutton.com receives it too. Only that site holds the signing
// secret and knows whether a session was revoked, so we ask it at
// `${AUTH_ORIGIN}/api/admin/session`, which answers `{ signedIn: true | false }`.
//
// Separate from the Ravelry sign-in in ./auth, which is for knitters.

/** walkersutton.com's session cookie. */
export const OWNER_COOKIE = 'ws_admin';

/** The site that owns the sign-in. AUTH_ORIGIN overrides it, for example to test against a preview. */
export function authOrigin() {
	return (env.AUTH_ORIGIN || 'https://walkersutton.com').replace(/\/+$/, '');
}

// Every admin request would otherwise be a round trip to walkersutton.com. A minute of
// staleness means signing out there takes up to a minute to reach this site.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 100;
const cache = new Map<string, { signedIn: boolean; expires: number }>();

/** Asks the auth site whether this session cookie is live. Fails closed. */
export async function verifyOwnerSession(token: string | undefined, origin = authOrigin(), now = Date.now(), fetcher = fetch) {
	if (!token) return false;
	// Keyed by a hash so the cache never holds the token itself.
	const key = createHash('sha256').update(token).digest('base64url');
	const hit = cache.get(key);
	if (hit && hit.expires > now) return hit.signedIn;

	try {
		const res = await fetcher(`${origin}/api/admin/session`, {
			headers: { cookie: `${OWNER_COOKIE}=${token}` },
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return false;
		const signedIn = (await res.json()).signedIn === true;
		if (cache.size >= CACHE_MAX) cache.clear();
		cache.set(key, { signedIn, expires: now + CACHE_TTL_MS });
		return signedIn;
	} catch {
		// The auth site is down or slow: not signed in, and don't remember it.
		return false;
	}
}

/** Whether this request comes from the site's owner. Anyone may in local dev, as with stats. */
export async function isOwner(cookies: Cookies) {
	return dev || verifyOwnerSession(cookies.get(OWNER_COOKIE));
}

/** The auth site's sign-in page, which sends the browser back to `returnTo` (a full URL here) afterwards. */
export function signInUrl(returnTo: string, origin = authOrigin()) {
	return `${origin}/admin?next=${encodeURIComponent(returnTo)}`;
}

/** Forget cached answers. For tests. */
export function clearOwnerCache() {
	cache.clear();
}
