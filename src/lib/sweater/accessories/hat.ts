import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, roll, se, sheet, smooth, TAU, wob } from '../mesh';
import { fabricScale, finishGarment, type GarmentParts } from './common';

/**
 * A beanie as it sits on a head: a brim (ribbed, folded or rolled), a straight body, and a domed crown that
 * closes at the top. A slouchy hat's extra length flops gently backwards; a gathered crown puckers where the
 * stitches are drawn together.
 */
export function buildHat(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const head = m.head ?? m.chest;
	const brimH = m.brimH ?? 5 * k;
	const crownH = m.crownH ?? 10 * k;
	const hatH = m.hatH ?? brimH + crownH;
	// On a head the crown rounds off over a good part of the hat, whatever the decreases: draw at least that much dome.
	const domeH = Math.max(crownH, (head / TAU) * 0.95);
	const bodyH = Math.max(1, hatH - domeH);
	const topY = brimH + hatH;
	const R = head / TAU;
	const COLS = 96;
	const ROWS = 56;
	const BRIM_ROWS = 8;
	const gathered = d.crown === 'Gathered';
	const slouchy = d.hatLength === 'Slouchy';

	// Above `bendFrom` the hat curves back: barely for a snug hat, a soft flop for a slouchy one.
	const bendFrom = brimH + bodyH * (slouchy ? 0.75 : 0.8);
	const bendBy = slouchy ? 0.5 : 0.05;
	const kappa = bendBy / Math.max(1, topY - bendFrom);
	const bend = (x: number, y: number, z: number, out: THREE.Vector3) => {
		if (y <= bendFrom || kappa === 0) return out.set(x, y, z);
		const rho = 1 / kappa;
		const theta = (y - bendFrom) * kappa;
		return out.set(x, bendFrom + (rho + z) * Math.sin(theta), -rho + (rho + z) * Math.cos(theta));
	};

	// A head is a little longer front to back than it is wide.
	const ring = (a: number, r: number) => [-se(Math.sin(a), 2.15) * r * 0.97, -se(Math.cos(a), 2.15) * r * 1.03] as const;
	const outward = (i: number, out: THREE.Vector3) => {
		const [x, z] = ring((i / COLS) * TAU, 1);
		return out.set(x, 0, z).normalize();
	};

	// The profile above the brim: a straight body, then a dome. Rows are spaced by arc length so stitches stay even.
	const bodyRows = Math.round((ROWS * bodyH) / (bodyH + domeH * 1.35));
	const profile: { y: number; r: number; s: number; t: number }[] = [];
	for (let j = 0; j <= ROWS; j++) {
		let y: number;
		let r: number;
		let t = 0;
		if (j <= bodyRows) {
			const u = j / (bodyRows || 1);
			y = brimH + u * bodyH;
			r = R * (slouchy ? 1 + 0.12 * smooth(0.1, 1, u) : 1 - 0.03 * u * u);
		} else {
			t = (j - bodyRows) / (ROWS - bodyRows);
			const theta = (t * Math.PI) / 2;
			const e = gathered ? 2 : 2.25;
			const base = slouchy ? R * 1.12 : R * 0.97;
			r = base * se(Math.cos(theta), e) * (slouchy ? 1 + 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.6)) : 1);
			y = brimH + bodyH + domeH * se(Math.sin(theta), e) - (gathered ? 0.6 * k * smooth(0.82, 1, t) : 0);
		}
		const prev = profile[j - 1];
		profile.push({ y, r, t, s: prev ? prev.s + Math.hypot(y - prev.y, r - prev.r) : 0 });
	}

	const tmp = new THREE.Vector3();
	const crownPoint = (i: number, j: number, out: THREE.Vector3) => {
		const a = (i / COLS) * TAU;
		const p = profile[j];
		// Gathered crowns pucker into soft pleats where the stitches are drawn in.
		const pleat = gathered ? 1 + 0.07 * Math.sin(a * 12) * smooth(0.55, 1, p.t) : 1;
		const r = p.r * pleat * (1 + 0.01 * wob(Math.sin(a) * 2, p.y / (6 * k), Math.cos(a) * 2));
		const [x, z] = ring(a, r);
		return bend(x, p.y, z, out);
	};
	const crown = sheet(
		COLS,
		ROWS,
		crownPoint,
		(i, j) => [(i / COLS) * wraps(head), vOf(brimH + profile[j].s)],
		(_i, j, out) => bend(0, Math.min(profile[j].y, topY - 0.5 * k), 0, out),
		true,
		(i, j, p) => {
			const a = (i / COLS) * TAU;
			return 1 - 0.07 * Math.max(0, -Math.cos(a)) - 0.08 * (1 - j / ROWS) + 0.04 * smooth(0.6, 1, profile[j].t) + 0.03 * wob(p.x / (3 * k), p.y / (3 * k), p.z);
		}
	);

	const fabric: THREE.BufferGeometry[] = [knitAt(crown, 1, (j) => j / ROWS, COLS)];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];

	// The brim: rib draws in a touch; a folded brim is a double layer that stands proud of the body.
	const brimR = d.brimFinish === 'Folded' ? 1.055 : d.brimFinish === 'Ribbed' ? 0.985 : 1;
	const brimPoint = (i: number, j: number, out: THREE.Vector3) => {
		const a = (i / COLS) * TAU;
		const u = j / BRIM_ROWS;
		const flare = d.brimFinish === 'Folded' ? 1 + 0.012 * Math.sin(Math.PI * u) : 1;
		const [x, z] = ring(a, R * brimR * flare);
		return bend(x, u * brimH, z, out);
	};
	const band = sheet(
		COLS,
		BRIM_ROWS,
		brimPoint,
		(i, j) => [(i / COLS) * wraps(d.brimFinish === 'Ribbed' ? head * 0.94 : head), vOf((j / BRIM_ROWS) * brimH)],
		(_i, j, out) => out.set(0, (j / BRIM_ROWS) * brimH, 0),
		true,
		(i, _j, p) => 1 - 0.06 * Math.max(0, -Math.cos((i / COLS) * TAU)) + 0.03 * wob(p.x, p.y, p.z)
	);
	const brim = knitAt(band, 0, (j) => j / BRIM_ROWS, COLS);
	if (d.brimFinish === 'Ribbed') ribs.push({ kind: d.brimRib, geometry: brim });
	else fabric.push(brim);

	if (d.brimFinish === 'Folded') {
		// The fold line: a soft rounded lip where the brim turns back on itself.
		fabric.push(
			knitAt(
				roll(
					COLS,
					(i, out) => brimPoint(i, BRIM_ROWS, out),
					outward,
					new THREE.Vector3(0, -1, 0),
					0.35 * Math.sqrt(k),
					wraps(head),
					vOf,
					8
				),
				0,
				1
			)
		);
	}
	if (d.brimFinish === 'Rolled')
		fabric.push(
			knitAt(
				roll(
					COLS,
					(i, out) => brimPoint(i, 0, out),
					outward,
					new THREE.Vector3(0, -1, 0),
					0.75 * Math.sqrt(k),
					wraps(head),
					vOf
				),
				0,
				0.5
			)
		);

	if (m.pom) {
		// A full, slightly lumpy pom-pom sewn to the very top.
		const pomR = 4.2 * Math.sqrt(k);
		const top = crownPoint(0, ROWS, new THREE.Vector3());
		const up = bend(0, topY + 1, 0, new THREE.Vector3()).sub(bend(0, topY, 0, tmp)).normalize();
		const pom = new THREE.SphereGeometry(pomR, 40, 28);
		const pos = pom.getAttribute('position') as THREE.BufferAttribute;
		const n = new THREE.Vector3();
		for (let v = 0; v < pos.count; v++) {
			n.fromBufferAttribute(pos, v).normalize();
			const lump = 1 + 0.07 * wob(n.x * 4, n.y * 4, n.z * 4) + 0.04 * wob(n.x * 11, n.z * 11, n.y * 11);
			pos.setXYZ(v, n.x * pomR * lump, n.y * pomR * lump * 0.94, n.z * pomR * lump);
		}
		pom.computeVertexNormals();
		pom.translate(top.x + up.x * pomR * 0.8, top.y + up.y * pomR * 0.8, top.z + up.z * pomR * 0.8);
		const uv = pom.getAttribute('uv') as THREE.BufferAttribute;
		const pomWraps = wraps(TAU * pomR);
		for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * pomWraps, vOf(uv.getY(v) * Math.PI * pomR));
		const colour = new Float32Array(pos.count * 3);
		for (let v = 0; v < pos.count; v++) colour.fill(0.92 + 0.1 * Math.abs(Math.sin(v * 12.9898) * 43758.5453 % 1), v * 3, v * 3 + 3);
		pom.setAttribute('color', new THREE.BufferAttribute(colour, 3));
		fabric.push(knitAt(pom, 1, 1));
	}

	const parts: GarmentParts = {
		fabric,
		ribs,
		wraps: wraps(head),
		pieces: ['brim', 'crown'],
		whole: [1, 1],
		bodyWhen: (y) => Math.min(1, Math.max(0, y / topY))
	};
	return finishGarment(parts);
}
