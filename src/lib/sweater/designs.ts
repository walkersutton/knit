import type { Design } from './garment';
import { markDeleted } from './deletions';

import { cleanNotes } from './library';

/** `notes` is the knitter's own words about the design: yarn, fit, who it is for. */
export type SavedDesign = { id: string; name: string; design: Design; updatedAt: string; notes?: string };
const KEY = 'knit-it:designs:v1';

export function loadDesigns(): SavedDesign[] {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(raw) ? raw.filter((item): item is SavedDesign => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && item.design && typeof item.design === 'object')) : [];
	} catch {
		return [];
	}
}

/**
 * Saves a design. With the id of one already saved it replaces that one in place; otherwise it adds a new one.
 * Notes left out keep the ones already saved.
 */
export function saveDesign(design: Design, name: string, id?: string, notes?: string) {
	const designs = loadDesigns();
	const kept = cleanNotes(notes ?? designs.find((d) => d.id === id)?.notes);
	const item: SavedDesign = {
		id: id && designs.some((d) => d.id === id) ? id : crypto.randomUUID(),
		name: name.trim().slice(0, 60) || 'My sweater',
		// Plain data: callers may pass a reactive $state proxy, which structuredClone rejects.
		design: JSON.parse(JSON.stringify(design)) as Design,
		updatedAt: new Date().toISOString(),
		...(kept && { notes: kept })
	};
	try {
		localStorage.setItem(KEY, JSON.stringify([item, ...designs.filter((d) => d.id !== item.id)]));
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
