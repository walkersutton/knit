import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lerp } from '../mesh';
import { stitchGauge } from '../needles';
import { TILE_ROWS, TILE_ST, tileFor } from '../motifs';
import type { Design, Garment, Measurements } from '../garment';

/** Chart tiles round a tube, and rows down it: the same layout the tops use. */
export function fabricScale(d: Design, m: Measurements) {
	const unit = tileFor(d.pattern, m.gauge || stitchGauge(d) || 18, d.motif).fine ? 2 : 1;
	const wraps = (circumference: number) => unit * Math.max(1, Math.round((circumference * m.stPerCm) / (TILE_ST * unit)));
	const vOf = (cm: number) => (cm * m.rowPerCm) / TILE_ROWS;
	return { wraps, vOf, k: m.k };
}

export function accessoryScale(m: Measurements) {
	return lerp(1, m.k, 0.6);
}

export type GarmentParts = {
	fabric: THREE.BufferGeometry[];
	ribs: { kind: string; geometry: THREE.BufferGeometry }[];
	trim?: THREE.BufferGeometry[];
	wraps: number;
	pieces: string[];
	whole: number[];
	bodyWhen: (y: number) => number;
	scale: number;
};

export function finishGarment(parts: GarmentParts): Garment {
	const pieceIndex: Record<string, number> = {};
	parts.pieces.forEach((name, i) => (pieceIndex[name] = i));
	return {
		fabric: mergeGeometries(parts.fabric)!,
		ribs: parts.ribs.map(({ kind, geometry }) => ({ kind, geometry })),
		trim: parts.trim?.length ? mergeGeometries(parts.trim.map((g) => g.toNonIndexed()))! : null,
		holes: null,
		seams: [],
		bodyWhen: parts.bodyWhen,
		scale: parts.scale,
		bodyWraps: parts.wraps,
		pieces: parts.pieces,
		whole: parts.whole,
		pieceIndex
	};
}
