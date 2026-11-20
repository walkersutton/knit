import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

export type GarmentParts = {
	fabric: THREE.BufferGeometry[];
	ribs: { kind: string; geometry: THREE.BufferGeometry }[];
	trim?: THREE.BufferGeometry[];
	wraps: number;
	pieces: string[];
	whole: number[];
	bodyWhen: (y: number) => number;
};

/**
 * Accessories are far smaller than a top, and a scarf far longer. The viewer frames a top of `scale` 1 in about
 * 90 × 104 world units, so the scale is chosen to make the accessory fill that frame the way a sweater does. The
 * fuzz follows the same scale, so its fibres stay in proportion on screen.
 */
function frameFor(box: THREE.Box3) {
	const size = box.getSize(new THREE.Vector3());
	return Math.max(size.y / 70, Math.max(size.x, size.z) / 80, 0.18);
}

export function finishGarment(parts: GarmentParts): Garment {
	const pieceIndex: Record<string, number> = {};
	parts.pieces.forEach((name, i) => (pieceIndex[name] = i));
	// Stand the accessory over the turntable's axis, so it turns in place and stays in frame.
	const all = [...parts.fabric, ...parts.ribs.map((r) => r.geometry), ...(parts.trim ?? [])];
	const bounds = new THREE.Box3();
	for (const g of all) {
		g.computeBoundingBox();
		bounds.union(g.boundingBox!);
	}
	const mid = bounds.getCenter(new THREE.Vector3());
	for (const g of all) g.translate(-mid.x, 0, -mid.z);
	bounds.translate(new THREE.Vector3(-mid.x, 0, -mid.z));
	return {
		fabric: mergeGeometries(parts.fabric)!,
		ribs: parts.ribs.map(({ kind, geometry }) => ({ kind, geometry })),
		trim: parts.trim?.length ? mergeGeometries(parts.trim.map((g) => g.toNonIndexed()))! : null,
		holes: null,
		seams: [],
		bodyWhen: parts.bodyWhen,
		scale: frameFor(bounds),
		bounds,
		bodyWraps: parts.wraps,
		pieces: parts.pieces,
		whole: parts.whole,
		pieceIndex
	};
}
