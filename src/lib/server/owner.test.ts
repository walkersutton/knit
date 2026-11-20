import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({ env: {} }));

import { authOrigin, clearOwnerCache, signInUrl, verifyOwnerSession } from './owner';

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const origin = 'https://walkersutton.com';

describe('verifyOwnerSession', () => {
	beforeEach(() => clearOwnerCache());

	it('says no without a cookie, without asking', async () => {
		const fetcher = answer({ signedIn: true });
		expect(await verifyOwnerSession(undefined, origin, 0, fetcher)).toBe(false);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('asks the auth site, forwarding only the session cookie', async () => {
		const fetcher = answer({ signedIn: true });
		expect(await verifyOwnerSession('tok', origin, 0, fetcher)).toBe(true);
		expect(fetcher).toHaveBeenCalledWith('https://walkersutton.com/api/admin/session', expect.objectContaining({ headers: { cookie: 'ws_admin=tok' } }));
	});

	it('trusts only an explicit signedIn: true', async () => {
		expect(await verifyOwnerSession('a', origin, 0, answer({ signedIn: false }))).toBe(false);
		expect(await verifyOwnerSession('b', origin, 0, answer({ signedIn: 'yes' }))).toBe(false);
		expect(await verifyOwnerSession('c', origin, 0, answer({}))).toBe(false);
	});

	it('fails closed when the auth site errors or is unreachable', async () => {
		expect(await verifyOwnerSession('a', origin, 0, answer({ signedIn: true }, 500))).toBe(false);
		const down = vi.fn(async () => { throw new Error('down'); });
		expect(await verifyOwnerSession('b', origin, 0, down)).toBe(false);
	});

	it('caches an answer for a minute, then asks again', async () => {
		const fetcher = answer({ signedIn: true });
		await verifyOwnerSession('tok', origin, 0, fetcher);
		await verifyOwnerSession('tok', origin, 59_000, fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await verifyOwnerSession('tok', origin, 61_000, fetcher);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('does not remember a failed check', async () => {
		const down = vi.fn(async () => { throw new Error('down'); });
		await verifyOwnerSession('tok', origin, 0, down);
		const up = answer({ signedIn: true });
		expect(await verifyOwnerSession('tok', origin, 1, up)).toBe(true);
	});
});

describe('signInUrl', () => {
	it('sends the owner to walkersutton.com and back', () => {
		expect(authOrigin()).toBe('https://walkersutton.com');
		expect(signInUrl('https://knit.walkersutton.com/admin')).toBe('https://walkersutton.com/admin?next=https%3A%2F%2Fknit.walkersutton.com%2Fadmin');
	});
});
