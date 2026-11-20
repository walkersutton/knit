import { describe, expect, it, vi } from 'vitest';
import { hostnamesFrom, verifyTurnstile } from './turnstile';

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const base = { secret: 's3cret', action: 'feedback', hostnames: new Set(['knit.walkersutton.com']), ip: '1.2.3.4' };
const good = { success: true, action: 'feedback', hostname: 'knit.walkersutton.com' };

describe('verifyTurnstile', () => {
	it('accepts a good token for this action and hostname, sending secret, token and ip', async () => {
		const fetcher = answer(good);
		expect(await verifyTurnstile('tok', { ...base, fetcher })).toBe(true);
		const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
		const sent = init.body as URLSearchParams;
		expect([sent.get('secret'), sent.get('response'), sent.get('remoteip')]).toEqual(['s3cret', 'tok', '1.2.3.4']);
	});

	it('turns away missing or oversized tokens without asking', async () => {
		const fetcher = answer(good);
		for (const token of [undefined, '', 42, 'x'.repeat(2049)]) expect(await verifyTurnstile(token, { ...base, fetcher })).toBe(false);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('fails closed without a secret or allowed hostnames', async () => {
		expect(await verifyTurnstile('tok', { ...base, secret: '', fetcher: answer(good) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, hostnames: new Set(), fetcher: answer(good) })).toBe(false);
	});

	it('rejects failures, other actions, other hostnames, errors and bad bodies', async () => {
		expect(await verifyTurnstile('tok', { ...base, fetcher: answer({ ...good, success: false }) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, fetcher: answer({ ...good, action: 'signup' }) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, fetcher: answer({ ...good, hostname: 'evil.example' }) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, fetcher: answer(good, 500) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, fetcher: vi.fn(async () => new Response('not json')) })).toBe(false);
		expect(await verifyTurnstile('tok', { ...base, fetcher: vi.fn(async () => Promise.reject(new Error('offline'))) })).toBe(false);
	});

	it('skips the action and hostname check only when told to (test keys)', async () => {
		expect(await verifyTurnstile('tok', { ...base, hostnames: null, fetcher: answer({ success: true, hostname: 'example.com' }) })).toBe(true);
	});
});

describe('hostnamesFrom', () => {
	it('reads a comma list, else falls back to the origin host', () => {
		expect([...hostnamesFrom(' a.com, b.com ,', undefined)]).toEqual(['a.com', 'b.com']);
		expect([...hostnamesFrom('', 'https://knit.walkersutton.com')]).toEqual(['knit.walkersutton.com']);
		expect(hostnamesFrom(undefined, 'nonsense').size).toBe(0);
	});
});
