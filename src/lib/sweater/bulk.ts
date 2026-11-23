/** Helpers for changing many saved or shared items at once from the profile page. */

/** Thrown by a step to stop the whole batch: signed out, or a limit that every later item would also hit. */
export class BulkStop extends Error {}

export type BulkResult = { done: string[]; failed: { id: string; message: string }[]; stopped: string | null };

/** Runs step for each id in order. One item failing does not stop the rest; a BulkStop does, and its message is kept. */
export async function runBulk(ids: string[], step: (id: string) => Promise<void> | void): Promise<BulkResult> {
	const result: BulkResult = { done: [], failed: [], stopped: null };
	for (const id of ids) {
		try {
			await step(id);
			result.done.push(id);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Something went wrong.';
			if (e instanceof BulkStop) {
				result.stopped = message;
				break;
			}
			result.failed.push({ id, message });
		}
	}
	return result;
}

/** One sentence for what a batch did: "Shared 3 designs. 1 failed." */
export function summarize(result: BulkResult, verb: string, noun: string, total = result.done.length + result.failed.length): string {
	const n = (count: number) => `${count} ${noun}${count === 1 ? '' : 's'}`;
	const parts = [result.done.length ? `${verb} ${n(result.done.length)}.` : ''];
	if (result.failed.length) parts.push(`${result.failed.length} failed.`);
	const left = total - result.done.length - result.failed.length;
	if (result.stopped) parts.push(`${result.stopped}${left > 0 ? ` ${n(left)} left alone.` : ''}`);
	return parts.filter(Boolean).join(' ') || 'Nothing changed.';
}

/** JSON with object keys sorted, so two designs written with fields in a different order compare equal. */
export function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value as Record<string, unknown>)
			.filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : 1))
			.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}
export const sameValue = (a: unknown, b: unknown) => stable(a) === stable(b);

/** Calls the API and turns a failed response into an error; sign-out and limit responses stop the batch. */
export async function call(url: string, init: RequestInit, fallback: string): Promise<Response> {
	const response = await fetch(url, init);
	if (response.ok) return response;
	const message = (await response.json().catch(() => null))?.message ?? fallback;
	if (response.status === 401 || response.status === 409) throw new BulkStop(response.status === 401 ? 'Sign in with Ravelry again to continue.' : message);
	throw new Error(message);
}
