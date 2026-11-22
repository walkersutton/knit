<script lang="ts">
	/** A grand, multi-stage celebration over the page. Call `burst()`; it plays on a canvas, then clears itself. */
	let { colors }: { colors: string[] } = $props();

	let canvas = $state<HTMLCanvasElement>();
	let frame = 0;

	type Bit = { x: number; y: number; vx: number; vy: number; size: number; angle: number; spin: number; color: string; life: number; shape: 'rect' | 'dot' | 'streamer'; drag: number; born: number };

	const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

	export function burst() {
		if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		cancelAnimationFrame(frame);
		const ratio = window.devicePixelRatio || 1;
		const width = innerWidth;
		const height = innerHeight;
		canvas.width = width * ratio;
		canvas.height = height * ratio;
		const g = canvas.getContext('2d');
		if (!g) return;
		g.scale(ratio, ratio);

		const bits: Bit[] = [];
		const add = (x: number, y: number, angle: number, speed: number, born: number, shape: Bit['shape'], drag = 0.985) =>
			bits.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: shape === 'streamer' ? 14 + Math.random() * 14 : shape === 'dot' ? 3 + Math.random() * 3 : 6 + Math.random() * 7,
				angle: Math.random() * Math.PI * 2,
				spin: (Math.random() - 0.5) * 0.45,
				color: pick(colors),
				life: 1,
				shape,
				drag,
				born
			});
		const shapeOf = (): Bit['shape'] => (Math.random() < 0.55 ? 'rect' : Math.random() < 0.5 ? 'dot' : 'streamer');

		// A schedule of stages, each a function that adds particles at its moment.
		const scale = Math.min(1, width / 900) * 0.5 + 0.5;
		const stages: { at: number; fire: () => void; done?: boolean }[] = [];
		// 1. Cannons from both lower corners, three volleys.
		for (const [i, at] of [0, 350, 700].entries())
			stages.push({
				at,
				fire: () => {
					for (const side of [-1, 1])
						for (let n = 0; n < 90 * scale; n++) {
							const spread = 0.35 + Math.random() * 0.75;
							const a = side < 0 ? -spread - 0.1 : -Math.PI + spread + 0.1;
							add(side < 0 ? 0 : width, height * 0.95, a, (12 + Math.random() * 14 + i * 2) * scale, performance.now(), shapeOf());
						}
				}
			});
		// 2. Starburst fireworks across the upper sky.
		for (const [x, y, at] of [
			[0.25, 0.3, 900],
			[0.75, 0.25, 1100],
			[0.5, 0.18, 1350],
			[0.15, 0.5, 1700],
			[0.85, 0.5, 1850]
		] as const)
			stages.push({
				at,
				fire: () => {
					const hue = pick(colors);
					const cx = width * x;
					const cy = height * y;
					for (let n = 0; n < 70; n++) {
						const a = (n / 70) * Math.PI * 2 + Math.random() * 0.1;
						const speed = (4 + Math.random() * 5) * scale;
						add(cx, cy, a, speed, performance.now(), 'dot', 0.955);
						bits.at(-1)!.color = Math.random() < 0.7 ? hue : pick(colors);
						bits.at(-1)!.size = 2.5 + Math.random() * 2.5;
					}
				}
			});
		// 3. A long shower of confetti falling from the top.
		for (let at = 1500; at < 3300; at += 90)
			stages.push({
				at,
				fire: () => {
					for (let n = 0; n < 7 * scale; n++) add(Math.random() * width, -20, Math.PI / 2 + (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 3, performance.now(), shapeOf(), 0.995);
				}
			});

		const start = performance.now();
		const tick = (now: number) => {
			const elapsed = now - start;
			for (const s of stages) if (!s.done && elapsed >= s.at) ((s.done = true), s.fire());
			g.clearRect(0, 0, width, height);
			let alive = stages.some((s) => !s.done);
			for (const b of bits) {
				const gravity = b.shape === 'streamer' ? 0.16 : 0.28;
				b.vy += gravity;
				b.vx *= b.drag;
				b.vy *= b.drag;
				// Light flutter sideways as it falls.
				b.x += b.vx + Math.sin((now - b.born) / 220 + b.angle) * 0.6;
				b.y += b.vy;
				b.angle += b.spin;
				// Everything fades over its last second or so.
				if (now - b.born > 2600) b.life = Math.max(0, b.life - 0.025);
				if (b.life <= 0 || b.y > height + 30) continue;
				alive = true;
				g.save();
				g.globalAlpha = b.life;
				g.translate(b.x, b.y);
				g.rotate(b.angle);
				g.fillStyle = b.color;
				g.strokeStyle = b.color;
				if (b.shape === 'dot') {
					g.beginPath();
					g.arc(0, 0, b.size, 0, Math.PI * 2);
					g.fill();
				} else if (b.shape === 'streamer') {
					// A ribbon that curls as it falls, like a strand of yarn.
					g.lineWidth = 2.5;
					g.lineCap = 'round';
					g.beginPath();
					g.moveTo(-b.size, 0);
					g.quadraticCurveTo(0, Math.sin(b.angle * 2) * b.size * 0.6, b.size, 0);
					g.stroke();
				} else {
					g.scale(1, Math.cos(b.angle * 1.7));
					g.fillRect(-b.size / 2, -b.size / 3, b.size, b.size * 0.6);
				}
				g.restore();
			}
			if (alive) frame = requestAnimationFrame(tick);
			else g.clearRect(0, 0, width, height);
		};
		frame = requestAnimationFrame(tick);
	}
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 60;
	}
</style>
