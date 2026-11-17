const KEY = 'knit-it:deleted:v1';

export function loadDeletions(): string[] {
	try {
		const values = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
	} catch {
		return [];
	}
}

export function markDeleted(kind: 'chart' | 'design', id: string) {
	try {
		const values = new Set(loadDeletions());
		values.add(`${kind}:${id}`);
		localStorage.setItem(KEY, JSON.stringify([...values]));
		window.dispatchEvent(new Event('knit:local-save'));
	} catch {
		// The local delete still succeeds even if its sync marker cannot be written.
	}
}
