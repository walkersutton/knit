import type { Design } from './garment';
import { markDeleted } from './deletions';

export type SavedDesign = { id: string; name: string; design: Design; updatedAt: string };
const KEY = 'knit-it:designs:v1';

export function loadDesigns(): SavedDesign[] {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(raw) ? raw.filter((item): item is SavedDesign => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && item.design && typeof item.design === 'object')) : [];
	} catch {
		return [];
	}
}

export function saveDesign(design: Design, name: string) {
	const designs = loadDesigns();
	const item: SavedDesign = { id: crypto.randomUUID(), name: name.trim().slice(0, 60) || 'My sweater', design: structuredClone(design), updatedAt: new Date().toISOString() };
	try {
		localStorage.setItem(KEY, JSON.stringify([item, ...designs]));
		window.dispatchEvent(new Event('knit:local-save'));
		return item;
	} catch {
		return undefined;
	}
}

export function deleteDesign(id: string) {
	try {
		localStorage.setItem(KEY, JSON.stringify(loadDesigns().filter((item) => item.id !== id)));
		markDeleted('design', id);
		window.dispatchEvent(new Event('knit:local-save'));
	} catch {
		// The saved copy remains if storage is unavailable.
	}
}
