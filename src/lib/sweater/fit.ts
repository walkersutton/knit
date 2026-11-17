/**
 * A knitter's own measurements, in cm, as they are taken on the body (not on a garment).
 * They replace the XS to XL sizes: the pattern is written to these numbers plus the ease the fit asks for.
 */
export type Custom = {
	/** Round the fullest part of the chest. */
	chest: number;
	/** Finished body length, back of the neck down to the hem. */
	length: number;
	/** Underarm to wrist, with the arm relaxed. */
	arm: number;
};

export const CUSTOM = 'Custom';

export const LIMITS: Record<keyof Custom, { min: number; max: number }> = {
	chest: { min: 40, max: 160 },
	length: { min: 25, max: 100 },
	arm: { min: 15, max: 70 }
};

/** How much of the full arm each sleeve length covers. */
export const ARM_SHARE: Record<string, number> = { Short: 0.15, '3/4': 0.62, Full: 1 };

const SIZE_STEP = { XS: -3, S: -1.5, M: 0, L: 1.5, XL: 3 } as Record<string, number>;
const WEARER_SCALE = { Junior: 0.8, Kid: 0.62, Baby: 0.46 } as Record<string, number>;

export const wearerScale = (wearer: string) => WEARER_SCALE[wearer] ?? 1;
export const sizeStep = (size: string) => SIZE_STEP[size] ?? 0;

/** The body measurements a standard size is cut for: where "Custom" starts from, so the numbers are never blank. */
export function standardBody(wearer: string, size: string): Custom {
	const k = wearerScale(wearer);
	const step = sizeStep(size);
	// Bigger sizes are taller and longer in the arm as well as wider.
	return { chest: round(k * (96 + 4 * step)), length: round(k * (56 + 1.2 * step)), arm: round(k * (44 + step)) };
}

export const clamp = (key: keyof Custom, cm: number) => Math.min(LIMITS[key].max, Math.max(LIMITS[key].min, cm));
export const round = (n: number) => Math.round(n * 10) / 10;

export type Unit = 'cm' | 'in';
export const toUnit = (cm: number, unit: Unit) => (unit === 'in' ? round(cm / 2.54) : round(cm));
export const fromUnit = (n: number, unit: Unit) => (unit === 'in' ? n * 2.54 : n);

/** Saved designs only keep custom measurements that are whole, finite and within what the pattern can be written for. */
export function validCustom(value: unknown): value is Custom | null {
	if (value === null) return true;
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return (Object.keys(LIMITS) as (keyof Custom)[]).every((k) => typeof v[k] === 'number' && Number.isFinite(v[k]) && v[k] >= LIMITS[k].min && v[k] <= LIMITS[k].max);
}
