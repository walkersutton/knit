import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGarment, PIECE, shapeKey, type Design, type Garment } from './garment';
import type { Knitted } from './progress';
import { makeKnitMaps, tileFor, type KnitMaps } from './yarn';
import { stitchGauge } from './needles';
import { RIBS } from './options';

export type ViewerHandle = {
	setDesign(design: Design): void;
	/** Show only what has been knitted so far; null shows the finished garment. */
	setKnitted(knitted: Knitted | null): void;
	/** Spin half a turn. */
	turn(): void;
	/** Does the slow work for a design in idle time, so `setDesign` with it later is quick. */
	prefetch(design: Design): Promise<void>;
	/** The garment as it stands, front on, as a small image; null if the browser cannot encode one. */
	snapshot(): Promise<Blob | null>;
	/** One slow-down-to-front turn of the garment as `count + 1` frames (the last is the first again), over `background`. */
	spin(count: number, width: number, height: number, background: string): Promise<ImageData[]>;
	dispose(): void;
};

const FOV = 24;
const YAW = -0.36;
const PITCH = 0.06;
const FUZZ = 5000;
const ZOOM_MAX = 3;
/** `when` limits (see Garment) that show every piece whole. */
const WHOLE = [2, 2, 2, 1, 1];

export function createViewer(host: HTMLElement, onView: (view: string) => void, intro = true): ViewerHandle {
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	const canvas = renderer.domElement;
	canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
	host.appendChild(canvas);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 2000);
	const pivot = new THREE.Group();
	const garment = new THREE.Group();
	pivot.add(garment);
	scene.add(pivot);

	// Soft, mostly frontal light like a catalog shot; the key casts real shadows from sleeves and collar.
	scene.add(new THREE.HemisphereLight(0xffffff, 0xb6bcc4, 1.45));
	const key = new THREE.DirectionalLight(0xfff8ee, 1.7);
	key.position.set(-90, 150, 170);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.camera.left = key.shadow.camera.bottom = -80;
	key.shadow.camera.right = key.shadow.camera.top = 80;
	key.shadow.camera.near = 20;
	key.shadow.camera.far = 500;
	key.shadow.bias = -0.0006;
	key.shadow.normalBias = 0.7;
	key.shadow.radius = 7;
	const fill = new THREE.DirectionalLight(0xeaf0ff, 0.55);
	fill.position.set(120, 40, 120);
	const rim = new THREE.DirectionalLight(0xffffff, 0.9);
	rim.position.set(90, 60, -120);
	scene.add(key, fill, rim);
	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environmentIntensity = 0.45;
	pmrem.dispose();

	const blob = document.createElement('canvas');
	blob.width = blob.height = 128;
	const bctx = blob.getContext('2d')!;
	const grad = bctx.createRadialGradient(64, 64, 0, 64, 64, 64);
	grad.addColorStop(0, 'rgba(30,34,40,.34)');
	grad.addColorStop(1, 'rgba(30,34,40,0)');
	bctx.fillStyle = grad;
	bctx.fillRect(0, 0, 128, 128);
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
	floor.rotation.x = -Math.PI / 2;
	scene.add(floor);

	// ── Materials ───────────────────────────────────────────────────────
	// Wool is matte: almost no specular, a soft sheen at grazing angles.
	const cloth = () => new THREE.MeshPhysicalMaterial({ roughness: 1, specularIntensity: 0.12, sheen: 0.6, sheenRoughness: 0.75, vertexColors: true });
	// How far each piece has been knitted: fabric whose `knit` attribute lies past its piece's limit is not drawn.
	const knitNow = Float32Array.from(WHOLE);
	const knitTo = Float32Array.from(WHOLE);
	const knitUniform = { value: knitNow };
	/** Makes a material draw only the knitted part of its geometry. */
	const knitted = <T extends THREE.Material>(mat: T): T => {
		mat.onBeforeCompile = (shader) => {
			shader.uniforms.uKnit = knitUniform;
			shader.vertexShader = 'attribute vec2 knit;\nvarying vec2 vKnit;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvKnit = knit;');
			shader.fragmentShader =
				'uniform float uKnit[5];\nvarying vec2 vKnit;\n' +
				shader.fragmentShader.replace('void main() {', 'void main() {\n\tif (vKnit.y > uKnit[int(vKnit.x + 0.5)] + 0.004) discard;');
		};
		mat.customProgramCacheKey = () => 'knit';
		return mat;
	};
	const fabricMat = knitted(cloth());
	const ribMats = new Map(RIBS.map((kind) => [kind, knitted(cloth())]));
	// The inside of the garment (seen through the neck and cuffs) is the same knit, lit and shadowed like the outside.
	const insideMat = knitted(new THREE.MeshStandardMaterial({ color: 0xb4b4b4, roughness: 1, side: THREE.BackSide }));
	const holeMat = new THREE.MeshBasicMaterial({ color: 0x2c2630, side: THREE.DoubleSide });
	const trimMat = knitted(new THREE.MeshStandardMaterial({ roughness: 0.35 }));
	const seamMat = knitted(new THREE.MeshStandardMaterial({ roughness: 1 }));
	const fuzzMat = knitted(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false }));
	// Unknitted fabric casts no shadow.
	const shadowMat = knitted(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));

	let maps: KnitMaps[] = [];
	let key_ = '';
	let colorKey = '';
	let frameScale = 1;

	// ── Preparing ahead ─────────────────────────────────────────────────
	// Drawing the stitch textures and building the geometry is the slow part of changing the design.
	// Both are written as stepped jobs: `setDesign` runs one straight through, `prefetch` runs it a step
	// at a time in idle time, so that changing the design later only has to swap the finished pieces in.
	type Shape = { children: THREE.Object3D[]; y: number; floorY: number; floorScale: [number, number]; scale: number };
	const readyMaps = new Map<string, KnitMaps[]>();
	const readyShapes = new Map<string, Shape>();
	const inFlight = new Map<string, Promise<void>>();
	const MAX_READY = 3;
	let disposed = false;
	const colorsOf = (d: Design) => [d.color, d.contrast, d.pattern, tileFor(d.pattern, stitchGauge(d) || 18, d.motif).fine, d.pattern === 'Custom' ? d.motif : ''].join('|');
	const disposeMaps = (list: KnitMaps[]) => list.forEach((m) => (m.map.dispose(), m.normalMap.dispose()));
	const disposeShape = (s: Shape) => s.children.forEach((c) => (c as THREE.Mesh).geometry?.dispose());
	const idle = () =>
		new Promise<void>((resolve) => ('requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 250 }) : setTimeout(resolve, 16)));

	/** Runs a stepped job to the end without pausing. */
	function finish<T>(job: Generator<void, T>): T {
		for (;;) {
			const step = job.next();
			if (step.done) return step.value;
		}
	}

	/** Runs a stepped job in idle time and keeps its result (a few at most) until `setDesign` asks for it. */
	async function ahead<T>(store: Map<string, T>, key: string, job: Generator<void, T>, drop: (value: T) => void, current: () => boolean) {
		if (store.has(key)) return;
		const already = inFlight.get(key);
		if (already) return already;
		const task = (async () => {
			for (;;) {
				await idle();
				if (disposed) return;
				const step = job.next();
				if (!step.done) continue;
				// Not wanted any more: the design arrived while it was being prepared.
				if (current()) return drop(step.value);
				store.set(key, step.value);
				if (store.size > MAX_READY) {
					const [oldKey, old] = store.entries().next().value!;
					store.delete(oldKey);
					drop(old);
				}
				return;
			}
		})();
		inFlight.set(key, task);
		await task;
		inFlight.delete(key);
	}

	/** One stitch texture pair per fabric: stockinette, then each rib. */
	function* mapJob(d: Design): Generator<void, KnitMaps[]> {
		const base = { color: d.color, contrast: d.contrast, pattern: d.pattern, motif: d.motif, tile: tileFor(d.pattern, stitchGauge(d) || 18, d.motif), shade: 0.3, bump: 3.4 };
		const made: KnitMaps[] = [];
		for (const part of [{ kind: 'stockinette' as const }, ...RIBS.map((rib) => ({ kind: 'rib' as const, rib }))]) {
			const m = makeKnitMaps({ ...base, ...part });
			// Hand the pixels to the GPU now rather than on the first frame that shows them.
			if (!disposed) (renderer.initTexture(m.map), renderer.initTexture(m.normalMap));
			made.push(m);
			yield;
		}
		return made;
	}

	function applyMaps(next: KnitMaps[], d: Design) {
		disposeMaps(maps);
		maps = next;
		[fabricMat, ...ribMats.values()].forEach((mat, i) => {
			mat.map = maps[i].map;
			mat.normalMap = maps[i].normalMap;
			const tone = new THREE.Color(d.color);
			const hsl = { h: 0, s: 0, l: 0 };
			tone.getHSL(hsl);
			mat.sheen = 0.2 + 0.5 * hsl.l; // dark yarn should stay dark
			mat.sheenColor = tone.lerp(new THREE.Color(0xffffff), 0.4);
			mat.needsUpdate = true;
		});
		insideMat.map = maps[0].map;
		insideMat.needsUpdate = true;
		const main = new THREE.Color(d.color);
		trimMat.color.set(d.pattern === 'Solid' ? d.color : d.contrast).multiplyScalar(0.8);
		seamMat.color.copy(main).multiplyScalar(0.74);
		fuzzMat.color.copy(main).lerp(new THREE.Color(0xffffff), 0.1);
	}

	function clear() {
		for (const child of [...garment.children]) {
			garment.remove(child);
			(child as THREE.Mesh).geometry?.dispose();
		}
	}

	function* shapeJob(d: Design): Generator<void, Shape> {
		const built = buildGarment(d);
		yield;
		const children: THREE.Object3D[] = [];
		const solids: THREE.Mesh[] = [new THREE.Mesh(built.fabric, fabricMat)];
		for (const r of built.ribs) solids.push(new THREE.Mesh(r.geometry, ribMats.get(r.kind) ?? ribMats.get(RIBS[0])!));
		const knit = solids.slice();
		const linings = solids.map((m) => new THREE.Mesh(m.geometry.clone(), insideMat));
		for (const lining of linings) lining.receiveShadow = true;
		children.push(...linings);
		if (built.trim) solids.push(new THREE.Mesh(built.trim, trimMat));
		for (const mesh of solids) {
			mesh.castShadow = mesh.receiveShadow = true;
			mesh.customDepthMaterial = shadowMat;
		}
		children.push(...solids);
		if (built.holes) children.push(new THREE.Mesh(built.holes, holeMat));

		// Centre the garment on the pivot.
		const box = new THREE.Box3().setFromBufferAttribute(built.fabric.getAttribute('position') as THREE.BufferAttribute);
		const mid = box.getCenter(new THREE.Vector3());
		yield;
		if (built.seams.length) yield* addSeams(built, solids, children);
		yield;
		addFuzz(knit, built.scale, children);
		return {
			children,
			y: -mid.y,
			floorY: box.min.y - mid.y - 7 * built.scale,
			floorScale: [(box.max.x - box.min.x) * 0.95, (box.max.z - box.min.z) * 2.6],
			scale: built.scale
		};
	}

	function applyShape(shape: Shape) {
		clear();
		frameScale = shape.scale;
		garment.add(...shape.children);
		garment.position.set(0, shape.y, 0);
		floor.position.y = shape.floorY;
		floor.scale.set(shape.floorScale[0], shape.floorScale[1], 1);
		fit();
	}

	/** Project the raglan lines onto whatever surface is outermost, front and back. */
	function* addSeams(g: Garment, solids: THREE.Mesh[], out: THREE.Object3D[]): Generator<void> {
		const ray = new THREE.Raycaster();
		const origin = new THREE.Vector3();
		const dir = new THREE.Vector3();
		// A detached copy, so hits come back in the garment's own coordinates.
		const targets = [new THREE.Mesh(solids[0].geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))];
		for (const [a, b] of g.seams)
			for (const face of [1, -1]) {
				yield; // one seam side at a time, so preparing ahead never holds up a frame
				const pts: THREE.Vector3[] = [];
				for (let s = 0; s <= 22; s++) {
					const t = s / 22;
					// A slight outward bow, like a real raglan line.
					const x = a.x + (b.x - a.x) * t + Math.sign(a.x) * Math.sin(Math.PI * t) * 0.9;
					const y = a.y + (b.y - a.y) * t;
					origin.set(x, y, face * 200);
					dir.set(0, 0, -face);
					ray.set(origin, dir);
					const hit = ray.intersectObjects(targets, false)[0];
					if (hit) pts.push(hit.point.clone().setZ(hit.point.z + face * 0.05));
				}
				if (pts.length < 4) continue;
				// The seam appears with the yoke rows it runs across.
				const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.13, 6);
				const pos = tube.getAttribute('position');
				const knit = new Float32Array(pos.count * 2);
				for (let k = 0; k < pos.count; k++) knit.set([PIECE.body, g.bodyWhen(pos.getY(k))], k * 2);
				tube.setAttribute('knit', new THREE.BufferAttribute(knit, 2));
				out.push(new THREE.Mesh(tube, seamMat));
			}
	}

	/** A halo of short loose fibres, the thing that makes knitwear look soft at its edges. */
	function addFuzz(sources: THREE.Mesh[], scale: number, out: THREE.Object3D[]) {
		const fibres = new Float32Array(FUZZ * 12);
		const knit = new Float32Array(FUZZ * 8);
		let o = 0;
		const a = new THREE.Vector3();
		const b = new THREE.Vector3();
		const c = new THREE.Vector3();
		const n = new THREE.Vector3();
		const p = new THREE.Vector3();
		const q = new THREE.Vector3();
		const rnd = () => Math.random() - 0.5;
		const totalTris = sources.reduce((sum, m) => sum + m.geometry.getIndex()!.count / 3, 0);
		for (const mesh of sources) {
			const pos = mesh.geometry.getAttribute('position');
			const nor = mesh.geometry.getAttribute('normal');
			const when = mesh.geometry.getAttribute('knit');
			const idx = mesh.geometry.getIndex()!;
			const tris = idx.count / 3;
			const count = Math.round((FUZZ * tris) / totalTris);
			for (let h = 0; h < count && o < fibres.length; h++) {
				const t = Math.floor(Math.random() * tris) * 3;
				const [ia, ib, ic] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
				let u = Math.random();
				let v = Math.random();
				if (u + v > 1) (u = 1 - u), (v = 1 - v);
				a.fromBufferAttribute(pos, ia);
				b.fromBufferAttribute(pos, ib);
				c.fromBufferAttribute(pos, ic);
				p.copy(a).addScaledVector(b.sub(a), u).addScaledVector(c.sub(a), v);
				n.fromBufferAttribute(nor, ia);
				const len = (0.2 + Math.random() * Math.random() * 0.8) * scale;
				q.copy(p).addScaledVector(n, len * 0.55).add(a.set(rnd(), rnd() - 0.15, rnd()).multiplyScalar(len * 0.7));
				fibres.set([p.x, p.y, p.z, q.x, q.y, q.z], o);
				p.copy(q).addScaledVector(n, len * 0.25).add(a.set(rnd(), rnd() - 0.2, rnd()).multiplyScalar(len * 0.8));
				fibres.set([q.x, q.y, q.z, p.x, p.y, p.z], o + 6);
				// A fibre is there once the stitch it grows from is.
				for (let e = 0; e < 4; e++) knit.set([when.getX(ia), when.getY(ia)], (o / 3 + e) * 2);
				o += 12;
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(fibres.subarray(0, o), 3));
		g.setAttribute('knit', new THREE.BufferAttribute(knit.subarray(0, (o / 3) * 2), 2));
		out.push(new THREE.LineSegments(g, fuzzMat));
	}

	// ── Camera + motion ─────────────────────────────────────────────────
	let yaw = reduced || !intro ? YAW : YAW - 0.7;
	let yawT = YAW;
	let pitch = PITCH;
	let pitchT = PITCH;
	let dragging = false;
	let running = false;
	let raf = 0;
	let last = 0;
	let view = '';
	let zoom = 1;
	let baseDist = 1;
	let tanHalf = 1;
	// Camera slide (world units) so zoom can home in on the cursor instead of the centre.
	let panX = 0;
	let panY = 0;
	let drawn = false;

	function fit() {
		const w = host.clientWidth || 1;
		const h = host.clientHeight || 1;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
		tanHalf = tan;
		baseDist = Math.max((45 * frameScale) / tan, (52 * frameScale) / (tan * camera.aspect));
		clampPan();
		camera.position.set(panX, panY, baseDist / zoom);
		camera.updateProjectionMatrix();
		invalidate();
	}

	function frame(now: number) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		const f = reduced ? 1 : 1 - Math.exp(-dt * 9);
		yaw += (yawT - yaw) * f;
		pitch += (pitchT - pitch) * f;
		pivot.rotation.set(pitch, yaw, 0);
		camera.position.set(panX, panY, baseDist / zoom);
		// The fabric grows (or unravels) to the knitter's new place.
		let growing = 0;
		for (let i = 0; i < knitNow.length; i++) {
			knitNow[i] += (knitTo[i] - knitNow[i]) * f;
			growing += Math.abs(knitTo[i] - knitNow[i]);
		}
		if (growing < 2e-3) knitNow.set(knitTo);
		renderer.render(scene, camera);
		drawn = true;

		const turn = (((yawT % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / Math.PI;
		const name = turn < 0.25 || turn > 1.75 ? 'Front' : turn > 0.75 && turn < 1.25 ? 'Back' : 'Side';
		if (name !== view) onView((view = name));

		const settled = Math.abs(yawT - yaw) + Math.abs(pitchT - pitch) < 4e-4;
		if (dragging || !settled || growing >= 2e-3) raf = requestAnimationFrame(frame);
		else running = false;
	}
	function invalidate() {
		if (running) return;
		running = true;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	}

	// ── Input: drag to orbit, 1:1 while held, a little throw on release; pinch to zoom ──
	let px = 0;
	let py = 0;
	let vx = 0;
	let pinch = 0;
	const pointers = new Map<number, { x: number; y: number }>();
	// Never slide past the edge of the un-zoomed frame; at zoom 1 there is no slide.
	function clampPan() {
		const k = 1 - 1 / zoom;
		const mx = baseDist * tanHalf * camera.aspect * k;
		const my = baseDist * tanHalf * k;
		panX = Math.min(mx, Math.max(-mx, panX));
		panY = Math.min(my, Math.max(-my, panY));
	}
	// Zoom toward a screen point (client coords), keeping the surface under it in place.
	const setZoom = (z: number, cx?: number, cy?: number) => {
		const before = baseDist / zoom;
		zoom = Math.min(ZOOM_MAX, Math.max(1, z));
		if (cx !== undefined && cy !== undefined) {
			const r = canvas.getBoundingClientRect();
			const nx = ((cx - r.left) / (r.width || 1)) * 2 - 1;
			const ny = 1 - ((cy - r.top) / (r.height || 1)) * 2;
			const dd = before - baseDist / zoom;
			panX += nx * tanHalf * camera.aspect * dd;
			panY += ny * tanHalf * dd;
		}
		clampPan();
		invalidate();
	};
	const spread = () => {
		const [a, b] = [...pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y) || 1;
	};
	const midpoint = () => {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	};
	const grab = (x: number, y: number) => {
		dragging = true;
		px = x;
		py = y;
		vx = 0;
	};
	const down = (e: PointerEvent) => {
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		canvas.setPointerCapture(e.pointerId);
		if (pointers.size === 2) {
			dragging = false;
			pinch = spread();
		} else if (pointers.size === 1) {
			grab(e.clientX, e.clientY);
			canvas.style.cursor = 'grabbing';
		}
		invalidate();
	};
	const move = (e: PointerEvent) => {
		const p = pointers.get(e.pointerId);
		if (!p) return;
		p.x = e.clientX;
		p.y = e.clientY;
		if (pointers.size >= 2) {
			const d = spread();
			const m = midpoint();
			setZoom((zoom * d) / pinch, m.x, m.y);
			pinch = d;
			return;
		}
		if (!dragging) return;
		const dx = e.clientX - px;
		vx = vx * 0.6 + dx * 0.4;
		// Slower when zoomed in, so the surface stays under the finger.
		yawT += (dx * 0.009) / zoom;
		yaw = yawT;
		if (e.pointerType === 'mouse') pitch = pitchT = Math.min(0.55, Math.max(-0.3, pitchT + ((e.clientY - py) * 0.005) / zoom));
		px = e.clientX;
		py = e.clientY;
	};
	const up = (e: PointerEvent) => {
		if (!pointers.delete(e.pointerId)) return;
		if (pointers.size === 1) {
			// One finger left after a pinch: carry on orbiting from where it is.
			const [rest] = [...pointers.values()];
			grab(rest.x, rest.y);
			return;
		}
		if (pointers.size || !dragging) return;
		dragging = false;
		canvas.style.cursor = 'grab';
		if (!reduced) yawT += (vx * 0.06) / zoom;
		invalidate();
	};
	// Trackpad pinch arrives as ctrl+wheel (Chrome, Firefox) or gesture events (Safari); keep it off the page.
	const wheel = (e: WheelEvent) => {
		if (!e.ctrlKey) return;
		e.preventDefault();
		setZoom(zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
	};
	let gestureZoom = 1;
	const gestureStart = (e: Event) => {
		e.preventDefault();
		gestureZoom = zoom;
	};
	const gestureChange = (e: Event) => {
		e.preventDefault();
		const g = e as Event & { scale: number; clientX: number; clientY: number };
		if (!pointers.size) setZoom(gestureZoom * g.scale, g.clientX, g.clientY);
	};
	// Two fingers on the canvas are always a pinch, never a page scroll or page zoom.
	const touch = (e: TouchEvent) => {
		if (e.touches.length > 1 && e.cancelable) e.preventDefault();
	};
	canvas.addEventListener('pointerdown', down);
	canvas.addEventListener('pointermove', move);
	canvas.addEventListener('pointerup', up);
	canvas.addEventListener('pointercancel', up);
	canvas.addEventListener('wheel', wheel, { passive: false });
	canvas.addEventListener('gesturestart', gestureStart);
	canvas.addEventListener('gesturechange', gestureChange);
	canvas.addEventListener('touchstart', touch, { passive: false });
	canvas.addEventListener('touchmove', touch, { passive: false });
	const observer = new ResizeObserver(fit);
	observer.observe(host);

	return {
		setDesign(d) {
			const nextColor = colorsOf(d);
			if (nextColor !== colorKey) {
				colorKey = nextColor;
				const ready = readyMaps.get(nextColor);
				readyMaps.delete(nextColor);
				applyMaps(ready ?? finish(mapJob(d)), d);
			}
			const next = shapeKey(d);
			if (next !== key_) {
				key_ = next;
				const ready = readyShapes.get(next);
				readyShapes.delete(next);
				applyShape(ready ?? finish(shapeJob(d)));
			}
			invalidate();
		},
		snapshot() {
			// Draw now, in this task, so the canvas still holds the frame when it is read.
			pivot.rotation.set(pitch, yaw, 0);
			camera.position.set(panX, panY, baseDist / zoom);
			renderer.render(scene, camera);
			return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
		},
		async spin(count, width, height, background) {
			const out = document.createElement('canvas');
			out.width = width;
			out.height = height;
			const ctx = out.getContext('2d', { willReadFrequently: true })!;
			ctx.imageSmoothingQuality = 'high';
			const frames: ImageData[] = [];
			camera.position.set(panX, panY, baseDist / zoom);
			for (let k = 0; k <= count; k++) {
				// Eases to a stop facing front, the way `turn` does, but gently enough that no frame jumps far.
				const t = k / count;
				pivot.rotation.set(pitch, yaw + Math.PI * 2 * (1 - (1 - t) ** 2), 0);
				renderer.render(scene, camera);
				ctx.fillStyle = background;
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(canvas, 0, 0, width, height);
				frames.push(ctx.getImageData(0, 0, width, height));
				if (k % 8 === 7) await new Promise((resolve) => setTimeout(resolve));
			}
			pivot.rotation.set(pitch, yaw, 0);
			return frames;
		},
		async prefetch(d) {
			const colors = colorsOf(d);
			const shape = shapeKey(d);
			await ahead(readyMaps, colors, mapJob(d), disposeMaps, () => colors === colorKey);
			await ahead(readyShapes, shape, shapeJob(d), disposeShape, () => shape === key_);
		},
		setKnitted(k) {
			// Body and sleeves count 0–1 down the yoke, then 1–2 on to the hem or cuff. A piece not yet begun shows nothing.
			const hang = (part: number) => (k!.yoke < 1 ? k!.yoke || -1 : 1 + part);
			knitTo.set(k ? [hang(k.body), hang(k.sleeves[0]), hang(k.sleeves[1]), k.neck || -1, k.bands || -1] : WHOLE);
			// Nothing on screen yet: open at the knitter's place instead of unravelling to it.
			if (reduced || !drawn) knitNow.set(knitTo);
			invalidate();
		},
		turn() {
			yawT = Math.round((yawT - YAW) / Math.PI) * Math.PI + Math.PI + YAW;
			pitchT = PITCH;
			invalidate();
		},
		dispose() {
			disposed = true;
			readyMaps.forEach(disposeMaps);
			readyShapes.forEach(disposeShape);
			cancelAnimationFrame(raf);
			observer.disconnect();
			clear();
			maps.forEach((m) => (m.map.dispose(), m.normalMap.dispose()));
			scene.environment?.dispose();
			renderer.dispose();
			renderer.forceContextLoss(); // hand the graphics memory back now, not when the garbage collector gets round to it
			canvas.remove();
		}
	};
}
