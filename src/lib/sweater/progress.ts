import { validCustom } from './fit';
import type { Design } from './garment';
import { cleanNeedles } from './needles';
import { sections } from './options';
import type { PatternSection, Step } from './pattern';

/**
 * A knitter's place in a pattern.
 *
 * Progress is a number per step: rounds done for a step with a tally, otherwise 1 once ticked off.
 */
export type Progress = Record<string, number>;

/** One thing to do and tick off. Sections worked twice (sleeves) give one task per pass. */
export type Task = { key: string; section: string; pass: number; index: number; step: Step; total: number };

export const stepKey = (section: string, pass: number, index: number) => `${section}.${pass}.${index}`;

/** Every step to tick off, in knitting order. */
export function tasksOf(sections: PatternSection[]): Task[] {
	const out: Task[] = [];
	for (const s of sections)
		for (let pass = 0; pass < (s.twice ? 2 : 1); pass++)
			s.steps.forEach((step, index) => {
				if (!step.note) out.push({ key: stepKey(s.id, pass, index), section: s.id, pass, index, step, total: step.tally?.rows.length || 1 });
			});
	return out;
}

export const doneOf = (t: Task, p: Progress) => Math.min(t.total, Math.max(0, p[t.key] ?? 0));
export const isDone = (t: Task, p: Progress) => doneOf(t, p) >= t.total;

/** Steps finished, steps in all, and the first one still to do. */
export function summarize(tasks: Task[], p: Progress) {
	const done = tasks.filter((t) => isDone(t, p)).length;
	return { done, total: tasks.length, current: tasks.find((t) => !isDone(t, p)) };
}

/**
 * How much of each piece is on the needles or finished, from 0 (not started) to 1. The first sleeve
 * is the first pass of the sleeve section.
 */
export type Knitted = { yoke: number; body: number; sleeves: [number, number]; neck: number; bands: number };

/**
 * The fabric a knitter has made so far, for the 3D view; null before anything is knitted.
 *
 * A piece is as long as the furthest step done in it, so ticking "knit until the body measures…"
 * shows that much body even if the steps before it were never ticked. Body and sleeves hang from
 * the yoke, so starting either means the yoke is finished.
 */
export function knittedOf(sections: PatternSection[], p: Progress): Knitted | null {
	const piece = (id: string, pass = 0) => {
		const s = sections.find((x) => x.id === id);
		if (!s) return 0;
		let at = 0;
		let reached = 0;
		let started = false;
		s.steps.forEach((step, index) => {
			if (step.note) return;
			const from = at;
			at += step.adds ?? 0;
			const total = step.tally?.rows.length || 1;
			const n = Math.min(total, Math.max(0, p[stepKey(id, pass, index)] ?? 0));
			if (!n) return;
			started = true;
			reached = Math.max(reached, from + ((at - from) * n) / total);
		});
		// A cast-on or picked-up edge has no length yet, but it is there: show a sliver.
		return started && at ? Math.max(0.03, reached / at) : 0;
	};
	const k: Knitted = { yoke: piece('yoke'), body: piece('body'), sleeves: [piece('sleeves', 0), piece('sleeves', 1)], neck: piece('neck'), bands: piece('bands') };
	if (k.body || k.sleeves[0] || k.sleeves[1]) k.yoke = 1;
	return k.yoke || k.neck || k.bands ? k : null;
}

/**
 * The place of a knitter who has just finished the step `key` and everything before it. Rounds
 * already counted on that step show it part-way through instead.
 */
export function progressAt(tasks: Task[], key: string, p: Progress = {}): Progress {
	const at = tasks.findIndex((t) => t.key === key);
	const out: Progress = {};
	tasks.slice(0, at + 1).forEach((t, i) => (out[t.key] = (i === at && doneOf(t, p)) || t.total));
	return out;
}

/**
 * Identifies the written pattern a design produces. Colours and the ribbing needle are left out:
 * they do not change the steps, so recolouring a sweater keeps your place. The main needle only
 * counts when it is not the standard one, which changes the gauge and every stitch count.
 */
export const signature = (d: Design) =>
	Object.entries(d)
		// Custom measurements only count while they are in use; switching back to a size leaves them out.
		.filter(([key, value]) => key !== 'color' && key !== 'contrast' && key !== 'ribNeedle' && (key !== 'motif' || d.pattern === 'Custom') && (key !== 'needle' || value) && (key !== 'custom' || d.size === 'Custom'))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${key === 'custom' ? JSON.stringify(value) : value}`)
		.join('|');

// ── Saved on this device ────────────────────────────────────────────────
export type Mode = 'concise' | 'beginner';
/** `needles` are the sizes (mm) the knitter owns. */
export type Saved = { design?: Design; mode?: Mode; needles: number[]; progress: Record<string, Progress> };

const KEY = 'knit-it:v1';
/** Patterns to remember progress for; the least recently touched are dropped first. */
const KEEP = 6;

/** A saved design is only used if it has exactly the default's fields, each choice set to an option the designer still offers. */
function validDesign(value: unknown, like: Design): value is Design {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	const keys = Object.keys(like);
	const fields = sections.flatMap((s) => s.groups).flatMap((g) => g.fields);
	return Object.keys(v).length === keys.length && keys.every((key) => key in v) && validCustom(v.custom) && fields.every((f) => f.options.some((o) => o.value === v[f.key]));
}

/** A design as text for a link, so a sweater can be opened in the designer exactly as it was. */
export const encodeDesign = (d: Design) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** The design a link carries, or undefined unless it is a whole design the designer still offers. */
export function decodeDesign(text: string, like: Design): Design | undefined {
	try {
		const bytes = Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
		const design = { ...like, ...JSON.parse(new TextDecoder().decode(bytes)) };
		return validDesign(design, like) ? design : undefined;
	} catch {
		return undefined;
	}
}

export function load(like: Design): Saved {
	const empty: Saved = { needles: [], progress: {} };
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
		if (!raw || typeof raw !== 'object') return empty;
		const progress: Record<string, Progress> = {};
		for (const [sig, p] of Object.entries(raw.progress ?? {})) {
			if (!p || typeof p !== 'object') continue;
			const clean = Object.entries(p).filter(([, n]) => typeof n === 'number' && n > 0);
			if (clean.length) progress[sig] = Object.fromEntries(clean);
		}
		// Fields added since the design was saved take their defaults.
		const design = raw.design && typeof raw.design === 'object' ? { ...like, ...raw.design } : undefined;
		return { design: validDesign(design, like) ? design : undefined, needles: cleanNeedles(raw.needles), mode: raw.mode === 'concise' || raw.mode === 'beginner' ? raw.mode : undefined, progress };
	} catch {
		return empty; // Private windows and blocked storage: carry on without saving.
	}
}

export function save(saved: Saved, current: string) {
	try {
		// Keep the current pattern last, so it is the last to be dropped.
		const entries = Object.entries(saved.progress).filter(([sig, p]) => sig !== current && Object.keys(p).length);
		const progress = Object.fromEntries(entries.slice(-(KEEP - 1)));
		if (saved.progress[current] && Object.keys(saved.progress[current]).length) progress[current] = saved.progress[current];
		localStorage.setItem(KEY, JSON.stringify({ ...saved, progress }));
	} catch {
		// Nothing to do: the page works without it.
	}
}
