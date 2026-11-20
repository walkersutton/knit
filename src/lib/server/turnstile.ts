/**
 * Cloudflare Turnstile, checked on the server. The browser hands us a single-use token from the widget;
 * Cloudflare's siteverify says whether a person earned it, on which page and for which form.
 */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Cloudflare's always-passes test secret, for local development only. */
export const TEST_SECRET = '1x0000000000000000000000000000000AA';

export type TurnstileCheck = {
	secret: string;
	/** The form the widget was rendered for (`data-action`). */
	action: string;
	/** Frontend hostnames the token may come from; `null` skips the check (test keys report example.com). */
	hostnames: Set<string> | null;
	ip?: string;
	fetcher?: typeof fetch;
};

/** True only when siteverify answers that this token is good for this action on one of our hostnames. Fails closed. */
export async function verifyTurnstile(token: unknown, check: TurnstileCheck): Promise<boolean> {
	if (typeof token !== 'string' || !token || token.length > 2048 || !check.secret) return false;
	if (check.hostnames && check.hostnames.size === 0) return false;
	const body = new URLSearchParams({ secret: check.secret, response: token });
	if (check.ip) body.set('remoteip', check.ip);
	try {
		const response = await (check.fetcher ?? fetch)(SITEVERIFY, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
			signal: AbortSignal.timeout(10_000)
		});
		if (!response.ok) return false;
		const result = await response.json();
		if (result?.success !== true) return false;
		if (check.hostnames === null) return true;
		return result.action === check.action && check.hostnames.has(result.hostname);
	} catch {
		return false;
	}
}

/** `a.com, b.com` as a set, or the host of `origin` when the list is empty. */
export function hostnamesFrom(list: string | undefined, origin: string | undefined): Set<string> {
	const names = (list ?? '')
		.split(',')
		.map((h) => h.trim())
		.filter(Boolean);
	if (!names.length && origin) {
		try {
			names.push(new URL(origin).hostname);
		} catch {
			// An unparseable origin leaves the set empty, which turns every token away.
		}
	}
	return new Set(names);
}
