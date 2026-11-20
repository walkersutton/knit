import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import medium from '@fontsource/fredoka/files/fredoka-latin-500-normal.woff?inline';
import bold from '@fontsource/fredoka/files/fredoka-latin-700-normal.woff?inline';
import type { Design } from '$lib/sweater/garment';
import { tileOfMotif } from '$lib/sweater/motifs';
import { parseCenterpiece } from '$lib/sweater/centerpiece';
import { SITE } from '$lib/site';

const DENIM = '#465e9d';
const CREAM = '#faf3dc';
const WIDTH = 1200;
const HEIGHT = 630;

const bytes = (dataUrl: string) => Uint8Array.from(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')).buffer;
const fonts = [
	{ name: 'Fredoka', data: bytes(medium), weight: 500 as const, style: 'normal' as const },
	{ name: 'Fredoka', data: bytes(bold), weight: 700 as const, style: 'normal' as const }
];

type Node = { type: string; props: Record<string, unknown> };
/** satori takes React-shaped elements; this builds them without needing React. */
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
	type,
	props: { style: type === 'div' ? { display: 'flex', ...style } : style, children: children.length === 1 ? children[0] : children }
});
const img = (svg: string, width: number, height: number): Node => ({
	type: 'img',
	props: { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width, height }
});

/** Two rows of stockinette Vs, the site's mark, tiled as a backdrop. */
const STITCH = 'M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z';
function stitchesSvg(): string {
	let g = '';
	for (let r = 0; r < 9; r++)
		for (let c = 0; c < 8; c++) {
			const x = 40 + c * 80;
			const y = 70 + r * 70;
			g += `<g transform="translate(${x} ${y}) scale(2.1 1.3)"><path d="${STITCH}"/><path d="${STITCH}" transform="scale(-1 1)"/></g>`;
		}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${HEIGHT}" viewBox="0 0 640 ${HEIGHT}"><g fill="${CREAM}" fill-opacity=".28">${g}</g></svg>`;
}

/** A chart repeated as fabric, in the colours it was shared with. Whole-pixel cells keep the edges crisp. */
function chartSvg(motif: string, color: string, contrast: string, width: number): { svg: string; width: number; height: number } {
	const { st, rows } = tileOfMotif(motif);
	const cell = Math.floor(width / (st * 2));
	const w = st * 2 * cell;
	const hgt = rows * 2 * cell;
	let rects = '';
	for (let ty = 0; ty < 2; ty++)
		for (let tx = 0; tx < 2; tx++)
			[...motif].forEach((ch, k) => {
				if (ch !== '1') return;
				rects += `<rect x="${(tx * st + (k % st)) * cell}" y="${(ty * rows + Math.floor(k / st)) * cell}" width="${cell}" height="${cell}"/>`;
			});
	return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" shape-rendering="crispEdges"><rect width="${w}" height="${hgt}" fill="${color}"/><g fill="${contrast}">${rects}</g></svg>`, width: w, height: hgt };
}

/** A centerpiece drawn once on a square of the main colour, rows a little shorter than stitches are wide, as it knits. */
function centerpieceSvg(cells: string, color: string, contrast: string, size: number): string | null {
	const cp = parseCenterpiece(cells);
	if (!cp) return null;
	const ROW = 0.8;
	const span = Math.max(cp.w, cp.h * ROW) * 1.3;
	const cell = size / span;
	const x0 = (size - cp.w * cell) / 2;
	const y0 = (size - cp.h * ROW * cell) / 2;
	let rects = '';
	for (let j = 0; j < cp.h; j++)
		for (let i = 0; i < cp.w; i++)
			if (cp.cells[j * cp.w + i] === '1') rects += `<rect x="${(x0 + i * cell).toFixed(2)}" y="${(y0 + j * ROW * cell).toFixed(2)}" width="${(cell + 0.5).toFixed(2)}" height="${(ROW * cell + 0.5).toFixed(2)}"/>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${color}"/><g fill="${contrast}">${rects}</g></svg>`;
}

/** A flat garment drawn in the design's colours: stripes for Stripes, dots for any colourwork. */
function sweaterSvg(design: Design): string {
	const { color, contrast, pattern, garment } = design;
	const body = 'M150 60 Q250 110 350 60 L400 80 L470 330 L410 350 L380 250 L380 470 L120 470 L120 250 L90 350 L30 330 L100 80 Z';
	const slipover = 'M165 60 Q250 110 335 60 L380 90 L380 470 L120 470 L120 90 Z';
	const beanie = 'M125 360 Q125 100 250 100 T375 360 V430 H125 Z';
	const sock = 'M140 80H240V310Q240 370 320 395Q400 420 400 470Q400 500 360 500H140Q110 500 110 470V110Q110 80 140 80Z';
	const scarf = 'M150 60 Q250 25 350 60 V420 Q250 455 150 420 Z';
	const shape = garment === 'Beanie' ? beanie : garment === 'Socks' ? sock : garment === 'Scarf' ? scarf : garment === 'Slipover' ? slipover : body;
	let art = '';
	if (pattern === 'Stripes') for (let y = 150; y < 440; y += 70) art += `<rect x="0" y="${y}" width="500" height="26" fill="${contrast}"/>`;
	else if (pattern !== 'Solid')
		for (let y = 170; y < 450; y += 44) for (let x = 140 + ((y / 44) % 2) * 22; x < 380; x += 44) art += `<circle cx="${x}" cy="${y}" r="9" fill="${contrast}"/>`;
	const detail =
		garment === 'Beanie'
			? `<path d="M125 360 H375 V430 H125 Z" fill="${contrast}" fill-opacity=".3"/><path d="M125 360 H375" stroke="${CREAM}" stroke-opacity=".5" stroke-width="8"/>`
			: garment === 'Socks'
				? `<path d="M110 100 H240" stroke="${contrast}" stroke-opacity=".45" stroke-width="36"/><path d="M140 470 H400" stroke="${contrast}" stroke-opacity=".35" stroke-width="20"/>`
				: garment === 'Scarf'
					? `<path d="M150 420 V465 M190 430 V475 M230 437 V480 M270 437 V480 M310 430 V475 M350 420 V465" stroke="${contrast}" stroke-opacity=".6" stroke-width="8" stroke-linecap="round"/>`
					: `<path d="M120 440 H380 V470 H120 Z" fill="${contrast}" fill-opacity=".35"/><path d="M150 60 Q250 110 350 60" fill="none" stroke="${CREAM}" stroke-opacity=".5" stroke-width="10" stroke-linecap="round"/>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
<defs><clipPath id="c"><path d="${shape}"/></clipPath></defs>
<path d="${shape}" fill="${color}"/><g clip-path="url(#c)">${art}</g>
${detail}</svg>`;
}

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text);

type Card = {
	eyebrow: string;
	title: string;
	subtitle?: string;
	byline?: string;
	/** What fills the right-hand side. */
	art?: Node;
};

async function render(card: Card): Promise<Response> {
	const title = clip(card.title, 56);
	const longest = Math.max(...title.split('\n').map((l) => l.length));
	const size = longest > 34 ? 64 : longest > 18 ? 76 : 92;
	const tree = h(
		'div',
		{ width: WIDTH, height: HEIGHT, background: DENIM, color: CREAM, fontFamily: 'Fredoka', position: 'relative', overflow: 'hidden' },
		h('div', { position: 'absolute', right: 0, top: 0 }, img(stitchesSvg(), 640, HEIGHT)),
		h('div', { position: 'absolute', right: 0, top: 0, width: 640, height: HEIGHT, background: `linear-gradient(90deg, ${DENIM}, rgba(70,94,157,0))` }),
		card.art ? h('div', { position: 'absolute', right: 70, top: 65, borderRadius: 28, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.35)' }, card.art) : null,
		h(
			'div',
			{ flexDirection: 'column', justifyContent: 'space-between', width: card.art ? 620 : 900, height: HEIGHT, boxSizing: 'border-box', padding: '64px 0 56px 80px', position: 'relative' },
			h('div', { fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.85 }, card.eyebrow),
			h(
				'div',
				{ flexDirection: 'column' },
				h('div', { fontSize: size, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: card.art ? 540 : 900 }, title),
				card.subtitle ? h('div', { fontSize: 34, fontWeight: 500, marginTop: 24, opacity: 0.85, lineHeight: 1.25 }, clip(card.subtitle, 90)) : null
			),
			h(
				'div',
				{ flexDirection: 'column' },
				card.byline ? h('div', { fontSize: 32, fontWeight: 500, marginBottom: 6 }, card.byline) : null,
				h('div', { fontSize: 28, fontWeight: 500, opacity: 0.7 }, SITE.url.replace('https://', ''))
			)
		)
	);
	const svg = await satori(tree as never, { width: WIDTH, height: HEIGHT, fonts });
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
	return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' } });
}

/** The 3D model the author's browser captured (a base64 JPEG, always 660 × 750 on the card's cream); otherwise a drawn sweater. */
function modelArt(design: Design, photo: string | null): Node {
	if (photo) return h('div', { width: 440, height: 500 }, { type: 'img', props: { src: `data:image/jpeg;base64,${photo}`, width: 440, height: 500 } });
	return h('div', { width: 440, height: 500, background: CREAM, alignItems: 'center', justifyContent: 'center' }, img(sweaterSvg(design), 440, 440));
}

export const patternCard = (name: string, detail: string, author: string, design: Design, photo: string | null = null) =>
	render({ eyebrow: 'Free knitting pattern', title: name, subtitle: detail, byline: `Shared by ${author}`, art: modelArt(design, photo) });

export const chartCard = (name: string, detail: string, author: string, motif: string, color: string, contrast: string) =>
	render({ eyebrow: parseCenterpiece(motif) ? 'Knitted centerpiece' : 'Colourwork chart', title: name, subtitle: detail, byline: `Shared by ${author}`, art: (() => {
			const picture = centerpieceSvg(motif, color, contrast, 440);
			if (picture) return h('div', { width: 440, height: 440 }, img(picture, 440, 440));
			const c = chartSvg(motif, color, contrast, 440);
			return h('div', { width: c.width, height: 440, overflow: 'hidden' }, img(c.svg, c.width, c.height));
		})()
	});

// The Ravelry photo is not fetched here: a slow or missing photo must never break the image.
export const personCard = (username: string, detail: string) => {
	const initial = (username.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
	return render({
		eyebrow: 'Knitter on knit',
		title: username,
		subtitle: detail,
		art: h(
			'div',
			{ width: 360, height: 360, background: CREAM, color: DENIM, alignItems: 'center', justifyContent: 'center', fontSize: 190, fontWeight: 700 },
			initial
		)
	});
};

/** The site-wide image, for pages that have nothing more specific to show. */
export const siteCard = () =>
	render({ eyebrow: 'knit', title: 'Design a sweater.\nGet the pattern.', subtitle: 'Free 3D sweater designer and knitting pattern generator' });
