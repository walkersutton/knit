import * as THREE from 'three';

/** Small shared pieces for turning measurements into stitchable 3D fabric. */
export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/** Superellipse coordinate: e = 2 is a circle, larger is boxier. */
export const se = (c: number, e: number) => Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
/** Cheap smooth noise in -1..1, for uneven cloth. */
export const wob = (x: number, y: number, z: number) =>
	(Math.sin(x * 1.7 + y * 0.9 + 1.3) * Math.sin(y * 1.3 - z * 1.1 + 0.4) + Math.sin(x * 0.6 - z * 1.9 + 2.1) * Math.sin(y * 2.3 + x * 0.8) * 0.6) / 1.6;

export type PosFn = (i: number, j: number, out: THREE.Vector3) => void;
export type TintFn = (i: number, j: number, p: THREE.Vector3) => number;

/** A (cols × rows) quad sheet. `center` gives a point "inside" each vertex so faces can be wound outward; `tint` bakes soft shading into vertex colours. */
export function sheet(cols: number, rows: number, pos: PosFn, uv: (i: number, j: number) => [number, number], center: PosFn, closed = true, tint?: TintFn) {
	const stride = cols + 1;
	const P = new Float32Array(stride * (rows + 1) * 3);
	const U = new Float32Array(stride * (rows + 1) * 2);
	const C = new Float32Array(stride * (rows + 1) * 3).fill(1);
	const v = new THREE.Vector3();
	for (let j = 0; j <= rows; j++)
		for (let i = 0; i <= cols; i++) {
			const k = j * stride + i;
			pos(i, j, v);
			P.set([v.x, v.y, v.z], k * 3);
			U.set(uv(i, j), k * 2);
			if (tint) C.fill(Math.min(1.08, Math.max(0.35, tint(i, j, v))), k * 3, k * 3 + 3);
		}
	const idx: number[] = [];
	for (let j = 0; j < rows; j++)
		for (let i = 0; i < cols; i++) {
			const a = j * stride + i;
			idx.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(P, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
	g.setAttribute('color', new THREE.BufferAttribute(C, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	const n = g.getAttribute('normal') as THREE.BufferAttribute;
	if (closed)
		for (let j = 0; j <= rows; j++) {
			const a = j * stride;
			const b = a + cols;
			v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
			n.setXYZ(a, v.x, v.y, v.z);
			n.setXYZ(b, v.x, v.y, v.z);
		}
	// Wind faces outward.
	let facing = 0;
	const c = new THREE.Vector3();
	for (let j = 0; j <= rows; j += 2)
		for (let i = 0; i <= cols; i += 3) {
			const k = j * stride + i;
			center(i, j, c);
			facing += (P[k * 3] - c.x) * n.getX(k) + (P[k * 3 + 1] - c.y) * n.getY(k) + (P[k * 3 + 2] - c.z) * n.getZ(k);
		}
	if (facing < 0) flip(g);
	return g;
}

/** Tags a geometry with the piece it belongs to and when it is knitted: one value, or one per row of a sheet `cols` wide. */
export function knitAt(g: THREE.BufferGeometry, piece: number, when: number | ((row: number) => number), cols = 0) {
	const n = g.getAttribute('position').count;
	const K = new Float32Array(n * 2);
	for (let k = 0; k < n; k++) K.set([piece, typeof when === 'number' ? when : when(Math.floor(k / (cols + 1)))], k * 2);
	g.setAttribute('knit', new THREE.BufferAttribute(K, 2));
	return g;
}

export function flip(g: THREE.BufferGeometry) {
	const idx = g.getIndex()!;
	for (let k = 0; k < idx.count; k += 3) {
		const a = idx.getX(k);
		idx.setX(k, idx.getX(k + 1));
		idx.setX(k + 1, a);
	}
	const n = g.getAttribute('normal');
	for (let k = 0; k < n.count; k++) n.setXYZ(k, -n.getX(k), -n.getY(k), -n.getZ(k));
}

export function mirrorX(src: THREE.BufferGeometry) {
	const g = src.clone();
	const p = g.getAttribute('position');
	const n = g.getAttribute('normal');
	for (let k = 0; k < p.count; k++) {
		p.setX(k, -p.getX(k));
		n.setX(k, -n.getX(k));
	}
	const idx = g.getIndex()!;
	for (let k = 0; k < idx.count; k += 3) {
		const a = idx.getX(k);
		idx.setX(k, idx.getX(k + 1));
		idx.setX(k + 1, a);
	}
	return g;
}

/** A rolled rim (I-cord or stockinette curl) around an edge loop. */
export function roll(
	cols: number,
	edge: (i: number, out: THREE.Vector3) => void,
	radial: (i: number, out: THREE.Vector3) => void,
	axial: THREE.Vector3,
	r: number,
	uWraps: number,
	vOf: (cm: number) => number,
	rows = 10
) {
	const p = new THREE.Vector3();
	const q = new THREE.Vector3();
	return sheet(
		cols,
		rows,
		(i, j, out) => {
			const phi = (j / rows) * TAU;
			edge(i, p);
			radial(i, q);
			out.copy(p).addScaledVector(axial, r * 0.7 + r * Math.sin(phi)).addScaledVector(q, r * Math.cos(phi));
		},
		(i, j) => [(i / cols) * uWraps, vOf((j / rows) * TAU * r)],
		(i, _j, out) => {
			edge(i, out);
			out.addScaledVector(axial, r * 0.7);
		}
	);
}
