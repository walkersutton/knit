import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, roll, se, sheet, smooth, TAU, wob } from '../mesh';
import { accessoryScale, fabricScale, finishGarment, type GarmentParts } from './common';

/** A beanie: a ribbed, folded or rolled brim, a stockinette body and a simple crown. */
export function buildHat(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const head = m.head ?? m.chest;
	const brimH = m.brimH ?? 5 * k;
	const crownH = m.crownH ?? 10 * k;
	const hatH = m.hatH ?? brimH + crownH;
	const bodyH = Math.max(1, hatH - crownH);
	const H = brimH + hatH;
	const R = head / TAU;
	const COLS = 96;
	const ROWS = 48;
	const gathered = d.crown === 'Gathered';

	const radius = (y: number) => {
		if (y <= brimH) return R * (d.brimFinish === 'Folded' ? 1.06 - 0.05 * (y / (brimH || 1)) : 1.01);
		if (y <= brimH + bodyH) {
			const t = (y - brimH) / bodyH;
			return R * (d.hatLength === 'Slouchy' ? 1.01 + 0.05 * Math.sin(Math.PI * t) : 1);
		}
		const t = Math.min(1, Math.max(0, (y - brimH - bodyH) / crownH));
		return R * Math.max(0.06, gathered ? 1 - 0.94 * smooth(0.55, 1, t) : Math.pow(1 - t, 0.55));
	};
	const point = (a: number, y: number, out: THREE.Vector3) => {
		const r = radius(y) * (1 + 0.012 * wob(Math.sin(a) * 2, y / (7 * k), Math.cos(a) * 2));
		out.set(-se(Math.sin(a), 2.1) * r, y, -se(Math.cos(a), 2.1) * r * 0.97);
	};
	const center = (_i: number, j: number, out: THREE.Vector3) => out.set(0, (j / ROWS) * (hatH - brimH) + brimH, 0);
	const tint = (i: number, j: number, p: THREE.Vector3) => {
		const a = (i / COLS) * TAU;
		return 1 - 0.06 * Math.max(0, -Math.cos(a)) - 0.05 * (1 - j / ROWS) + 0.03 * wob(p.x / (3 * k), p.y / (3 * k), p.z);
	};

	const fabric: THREE.BufferGeometry[] = [];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];
	const trim: THREE.BufferGeometry[] = [];

	if (d.brimFinish === 'Ribbed') {
		const band = sheet(
			COLS,
			8,
			(i, j, out) => point((i / COLS) * TAU, (j / 8) * brimH, out),
			(i, j) => [(i / COLS) * wraps(head * 0.94), vOf((j / 8) * brimH)],
			(_i, j, out) => out.set(0, (j / 8) * brimH, 0),
			true,
			(i, _j, p) => 1 - 0.05 * Math.max(0, -Math.cos((i / COLS) * TAU)) + 0.03 * wob(p.x, p.y, p.z)
		);
		ribs.push({ kind: d.brimRib, geometry: knitAt(band, 0, (j) => j / 8, COLS) });
	} else {
		const band = sheet(
			COLS,
			8,
			(i, j, out) => point((i / COLS) * TAU, (j / 8) * brimH, out),
			(i, j) => [(i / COLS) * wraps(head), vOf((j / 8) * brimH)],
			(_i, j, out) => out.set(0, (j / 8) * brimH, 0),
			true,
			(i, _j, p) => 1 - 0.05 * Math.max(0, -Math.cos((i / COLS) * TAU)) + 0.03 * wob(p.x, p.y, p.z)
		);
		fabric.push(knitAt(band, 0, (j) => j / 8, COLS));
		if (d.brimFinish === 'Rolled')
			fabric.push(
				knitAt(
					roll(
						COLS,
						(i, out) => point((i / COLS) * TAU, 0, out),
						(i, out) => {
							point((i / COLS) * TAU, 0, out);
							out.setY(0).normalize();
						},
						new THREE.Vector3(0, -1, 0),
						Math.sqrt(k),
						wraps(head),
						vOf
					),
					0,
					0.5
				)
			);
	}

	const crown = sheet(
		COLS,
		ROWS,
		(i, j, out) => point((i / COLS) * TAU, brimH + (j / ROWS) * (hatH - brimH), out),
		(i, j) => [(i / COLS) * wraps(head), vOf(brimH + (j / ROWS) * (hatH - brimH))],
		center,
		true,
		tint
	);
	fabric.push(knitAt(crown, 1, (j) => j / ROWS, COLS));

	if (m.pom) {
		const pom = new THREE.SphereGeometry(1.35 * Math.sqrt(k), 20, 16);
		pom.translate(0, H + 0.8 * Math.sqrt(k), 0);
		trim.push(knitAt(pom, 1, 1));
	}

	const parts: GarmentParts = {
		fabric,
		ribs,
		trim,
		wraps: wraps(head),
		pieces: ['brim', 'crown'],
		whole: [1, 1],
		bodyWhen: (y) => Math.min(1, Math.max(0, y / H)),
		scale: accessoryScale(m)
	};
	return finishGarment(parts);
}
