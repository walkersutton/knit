import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, roll, se, sheet, smooth, TAU, wob } from '../mesh';
import { fabricScale, finishGarment, type GarmentParts } from './common';

/**
 * A beanie as it sits on a head, drawn over an invisible one: an oval head, longer front to back and a little
 * fuller behind, with a rounded dome over the temples. The knitted length is laid along the head from the crown
 * down, so a snug hat ends round the ears and forehead, and the hat is worn tipped back a touch, lower over the
 * nape than the brow. A slouchy hat's extra length bags out and droops behind; a gathered crown puckers where
 * the stitches are drawn together.
 */
export function buildHat(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const head = m.head ?? m.chest;
	const brimH = m.brimH ?? 5 * k;
	const crownH = m.crownH ?? 10 * k;
	const hatH = m.hatH ?? brimH + crownH;
	const R = head / TAU;
	const COLS = 96;
	const ROWS = 64;
	const BRIM_ROWS = 8;
	const gathered = d.crown === 'Gathered';

	// Stretched round the head, the fabric gives up a little of its length.
	const STRETCH = 0.94;
	const brimOn = brimH * STRETCH;
	const lenOn = (brimH + hatH) * STRETCH;

	// ── The head ───────────────────────────────────────────────────────
	// Seen from above: an egg, longer front to back (front is +z) and broadest behind the ears.
	const ring = (a: number, r: number) => {
		const back = Math.cos(a);
		return [-se(Math.sin(a), 2.1) * r * 0.89 * (1 + 0.05 * back), -se(back, 2.1) * r * 1.1] as const;
	};
	const outward = (i: number, out: THREE.Vector3) => {
		const [x, z] = ring((i / COLS) * TAU, 1);
		return out.set(x, 0, z).normalize();
	};
	// Seen from the side: a dome over the temples, then near-upright sides down past the ears. `meridian` holds
	// (fraction of R, height) from the crown down, with the arc length to each point.
	const domeH = R * 1.02;
	const meridian: { r: number; y: number; arc: number }[] = [];
	const DOME = 80;
	for (let j = 0; j <= DOME; j++) {
		const phi = (Math.PI / 2) * (1 - j / DOME);
		meridian.push({ r: se(Math.cos(phi), 2.3), y: domeH * se(Math.sin(phi), 2.3), arc: 0 });
	}
	for (let j = 1; j <= 60; j++) {
		const y = -(j / 60) * R * 2;
		meridian.push({ r: 1 - 0.05 * smooth(0, R * 1.2, -y), y, arc: 0 });
	}
	for (let j = 1; j < meridian.length; j++)
		meridian[j].arc = meridian[j - 1].arc + Math.hypot((meridian[j].r - meridian[j - 1].r) * R, meridian[j].y - meridian[j - 1].y);
	const domeArc = meridian[DOME].arc;
	const onHead = (arc: number) => {
		let j = 1;
		while (j < meridian.length - 1 && meridian[j].arc < arc) j++;
		const a = meridian[j - 1];
		const b = meridian[j];
		const t = Math.min(1, Math.max(0, (arc - a.arc) / (b.arc - a.arc || 1)));
		return { r: a.r + (b.r - a.r) * t, y: a.y + (b.y - a.y) * t };
	};
	// The head takes the hat down to just over the ears at most; any length beyond that is slouch.
	const fit = Math.min(lenOn, domeArc + R * 0.95);
	const slouch = lenOn - fit;
	const edgeY = onHead(fit).y;

	/** Where the hat's fabric lies, `s` up from the brim edge, before the slouch, as (fraction of R, height). */
	const lay = (s: number) => {
		const p = onHead(fit * (1 - s / lenOn));
		return { r: p.r, y: p.y - edgeY };
	};
	// A slouchy hat's spare length puffs out round the crown, fuller behind than over the brow, where the hat still
	// lies on the forehead; above the temples the whole crown then flops backwards.
	const puff = (q: number, a: number) => 1 + (slouch / R) * 0.22 * Math.sin(Math.PI * smooth(0.2, 1.05, q)) * (0.35 + 0.65 * Math.max(0, Math.cos(a)));
	const topY = lay(lenOn).y;
	const bendFrom = -edgeY * 0.55;
	// The bend builds up gradually (angle ∝ u²) so the back softens into a fold instead of creasing. `spine` is
	// the bent centre line, sampled up the hat: its height, how far back it has gone, and the angle it leans at.
	const lean = Math.min(0.9, (slouch / R) * 0.9);
	const span = Math.max(1, topY + 2 * k - bendFrom);
	const SPINE = 64;
	const spine: { y: number; z: number; th: number }[] = [{ y: bendFrom, z: 0, th: 0 }];
	for (let j = 1; j <= SPINE; j++) {
		const th = lean * Math.pow(j / SPINE, 2);
		const prev = spine[j - 1];
		const dy = span / SPINE;
		const mid = (prev.th + th) / 2;
		spine.push({ y: prev.y + Math.cos(mid) * dy, z: prev.z - Math.sin(mid) * dy, th });
	}
	const bend = (out: THREE.Vector3) => {
		if (out.y <= bendFrom || lean === 0) return out;
		const f = Math.min(SPINE, ((out.y - bendFrom) / span) * SPINE);
		const j = Math.min(SPINE - 1, Math.floor(f));
		const t = f - j;
		const a = spine[j];
		const b = spine[j + 1];
		const th = a.th + (b.th - a.th) * t;
		const cy = a.y + (b.y - a.y) * t;
		const cz = a.z + (b.z - a.z) * t;
		return out.set(out.x, cy + out.z * Math.sin(th), cz + out.z * Math.cos(th));
	};

	const tmp = new THREE.Vector3();
	const crownS = (j: number) => brimOn + (j / ROWS) * (lenOn - brimOn);
	const crownPoint = (i: number, j: number, out: THREE.Vector3) => {
		const a = (i / COLS) * TAU;
		const s = crownS(j);
		const q = s / lenOn;
		const p = lay(s);
		// Gathered crowns pucker into soft pleats where the stitches are drawn in.
		const pleat = gathered ? 1 + 0.08 * Math.sin(a * 12) * smooth(0.82, 1, q) : 1;
		const r = p.r * R * puff(q, a) * pleat * (1 + 0.01 * wob(Math.sin(a) * 2, p.y / (6 * k), Math.cos(a) * 2));
		const [x, z] = ring(a, r);
		const dip = gathered ? 0.5 * k * smooth(0.9, 1, q) : 0;
		return bend(out.set(x, p.y - dip, z));
	};
	const crown = sheet(
		COLS,
		ROWS,
		crownPoint,
		(i, j) => [(i / COLS) * wraps(head), vOf(crownS(j) / STRETCH)],
		(_i, j, out) => bend(out.set(0, Math.min(lay(crownS(j)).y, topY - 0.5 * k), 0)),
		true,
		(i, j, p) => {
			const a = (i / COLS) * TAU;
			return 1 - 0.07 * Math.max(0, -Math.cos(a)) - 0.08 * (1 - j / ROWS) + 0.04 * smooth(0.6, 1, j / ROWS) + 0.03 * wob(p.x / (3 * k), p.y / (3 * k), p.z);
		}
	);

	const fabric: THREE.BufferGeometry[] = [knitAt(crown, 1, (j) => j / ROWS, COLS)];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];

	// The brim: rib hugs a touch; a folded brim is a double layer that stands proud of the body.
	const brimR = d.brimFinish === 'Folded' ? 1.045 : d.brimFinish === 'Ribbed' ? 0.995 : 1;
	const brimPoint = (i: number, j: number, out: THREE.Vector3) => {
		const a = (i / COLS) * TAU;
		const u = j / BRIM_ROWS;
		const p = lay(u * brimOn);
		const flare = d.brimFinish === 'Folded' ? 1 + 0.012 * Math.sin(Math.PI * u) : 1;
		const [x, z] = ring(a, p.r * R * brimR * flare);
		return out.set(x, p.y, z);
	};
	const band = sheet(
		COLS,
		BRIM_ROWS,
		brimPoint,
		(i, j) => [(i / COLS) * wraps(d.brimFinish === 'Ribbed' ? head * 0.94 : head), vOf((j / BRIM_ROWS) * brimH)],
		(_i, j, out) => out.set(0, lay((j / BRIM_ROWS) * brimOn).y, 0),
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
		// Out of the crown along its axis, which leans back with the slouch.
		const axis = (s: number, out: THREE.Vector3) => bend(out.set(0, lay(s).y, 0));
		const up = axis(lenOn, new THREE.Vector3()).sub(axis(crownS(ROWS - 6), tmp)).normalize();
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

	// Worn tipped back a touch: the brim rides higher over the brow than over the nape. Then stand it on y = 0.
	const tilt = new THREE.Matrix4().makeRotationX(-0.17);
	const all = [...fabric, ...ribs.map((r) => r.geometry)];
	let floor = Infinity;
	let height = -Infinity;
	for (const g of all) {
		g.applyMatrix4(tilt);
		g.computeBoundingBox();
		floor = Math.min(floor, g.boundingBox!.min.y);
		height = Math.max(height, g.boundingBox!.max.y);
	}
	for (const g of all) g.translate(0, -floor, 0);
	height -= floor;

	const parts: GarmentParts = {
		fabric,
		ribs,
		wraps: wraps(head),
		pieces: ['brim', 'crown'],
		whole: [1, 1],
		bodyWhen: (y) => Math.min(1, Math.max(0, y / height))
	};
	return finishGarment(parts);
}
