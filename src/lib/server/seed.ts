// The designs knit's house account shares, so the libraries and the home page's favourites have something good in
// them from the start. Pure data: `scripts/seed.ts` writes it through the same functions a knitter's share uses.
import { encodeCenterpiece, textCenterpiece } from '$lib/sweater/centerpiece';
import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
import type { Design } from '$lib/sweater/garment';
import { choose } from '$lib/sweater/options';

/** The house account. Its Ravelry id can never be a real one (those are numbers), so no knitter signs in as it. */
export const SEED_USER = { ravelryUserId: 'seed:knit', username: 'knit' };

export type SeedChart = { name: string; motif: string; color: string; contrast: string; notes: string };
export type SeedPattern = { name: string; design: Design; notes: string };

const C = {
	brick: '#c8543e',
	clay: '#d99172',
	mustard: '#e8bd53',
	cream: '#faf3dc',
	oatmeal: '#d8c9b0',
	sage: '#78917a',
	forest: '#2f5a48',
	sky: '#9dbfe0',
	denim: '#465e9d',
	plum: '#665181',
	rose: '#b45c89',
	charcoal: '#302c32'
};

// ── Repeating charts: 12 stitches × 16 rows, '#' in the contrast colour ──

/** A 12 × 16 repeat from a function of stitch and row. */
const tile = (on: (i: number, j: number) => boolean) => Array.from({ length: 16 * 12 }, (_, k) => (on(k % 12, Math.floor(k / 12)) ? '1' : '0')).join('');
/** A 12 × 8 drawing worked twice, the second time shifted half a repeat across (a half-drop). */
const halfDrop = (rows: string[]) => tile((i, j) => rows[j % 8][(j < 8 ? i : i + 6) % 12] === '#');
const drawn = (rows: string[]) => tile((i, j) => rows[j][i] === '#');

const HEARTS = halfDrop(['............', '..##.##.....', '.#######....', '.#######....', '..#####.....', '...###......', '....#.......', '............']);
const PINES = halfDrop(['.....#......', '....###.....', '...#####....', '....###.....', '..#######...', '.#########..', '.....#......', '............']);
const TULIPS = halfDrop(['............', '..#.#.#.....', '..#####.....', '..#####.....', '...###......', '.#..#..#....', '..#.#.#.....', '...###......']);
const STAR = drawn([
	'......#.....',
	'...#..#..#..',
	'....#.#.#...',
	'.....###....',
	'..#########.',
	'.....###....',
	'....#.#.#...',
	'...#..#..#..',
	'......#.....',
	'............',
	'............',
	'#.#.#.#.#.#.',
	'............',
	'.#.#.#.#.#.#',
	'............',
	'............'
]);
const RIC_RAC = tile((i, j) => j % 8 < 4 && Math.abs((i % 6) - 3) === j % 4);
const GINGHAM = tile((i, j) => ((i >> 1) + (j >> 1)) % 2 === 0);
const PEAKS_REPEAT = tile((i, j) => (i < 6 ? (i + j) % 6 : (12 - i + j) % 6) < 2);
const POLKA = tile((i, j) => ([1, 2].includes(i % 6) && [1, 2].includes(j % 8)) || ([4, 5].includes(i % 6) && [5, 6].includes(j % 8)));
const LATTICE = tile((i, j) => (i + j) % 4 === 0 || (i - j + 16) % 4 === 0);
const WAVES = tile((i, j) => ['..####......', '.#....#.....', '#......#...#', '........###.', '', '', '', ''][j % 8][i] === '#');

export const charts: SeedChart[] = [
	{ name: 'Little Hearts', motif: HEARTS, color: C.cream, contrast: C.brick, notes: 'A half-drop of small hearts. Short floats, so it suits a first colourwork project.' },
	{ name: 'Selbu Star', motif: STAR, color: C.denim, contrast: C.cream, notes: 'An eight-point star over a dotted band, after the Norwegian mittens.' },
	{ name: 'Pine Forest', motif: PINES, color: C.oatmeal, contrast: C.forest, notes: 'Rows of little firs, each row stepped half a tree along.' },
	{ name: 'Ric Rac', motif: RIC_RAC, color: C.mustard, contrast: C.plum, notes: 'A zigzag band every eight rows, like the braid on a dress hem.' },
	{ name: 'Gingham', motif: GINGHAM, color: C.sky, contrast: C.denim, notes: 'Two-by-two checks. Lovely on socks and hats.' },
	{ name: 'Peaks and Valleys', motif: PEAKS_REPEAT, color: C.charcoal, contrast: C.oatmeal, notes: 'Nested peaks stacked up the fabric. Floats are never more than four stitches.' },
	{ name: 'Polka Dots', motif: POLKA, color: C.rose, contrast: C.cream, notes: 'Staggered two-stitch dots. Carry the cream loosely behind.' },
	{ name: 'Tulip Field', motif: TULIPS, color: C.sage, contrast: C.brick, notes: 'Tulips with their leaves, in a half-drop so the field never lines up.' },
	{ name: 'Garden Lattice', motif: LATTICE, color: C.cream, contrast: C.sage, notes: 'A diamond trellis in a single line of stitches.' },
	{ name: 'Sea Swell', motif: WAVES, color: C.denim, contrast: C.sky, notes: 'A rolling double line, one wave across each repeat.' }
];

// ── Centerpieces: a picture worked once, '#' in the contrast colour ──

const grid = (rows: string[]) => encodeCenterpiece({ w: rows[0].length, h: rows.length, cells: rows.map((r) => [...r].map((c) => (c === '#' ? '1' : '0')).join('')).join('') });
const words = (text: string) => encodeCenterpiece(textCenterpiece(text)!.centerpiece);

const BIG_HEART = grid([
	'..###...###..',
	'.#####.#####.',
	'#############',
	'#############',
	'#############',
	'.###########.',
	'..#########..',
	'...#######...',
	'....#####....',
	'.....###.....',
	'......#......'
]);
const PEAKS = grid([
	'..........#..........',
	'.........###.........',
	'....#...#####........',
	'...###.#######...#...',
	'..#############.###..',
	'.###################.',
	'#####################',
	'.....................',
	'#.#.#.#.#.#.#.#.#.#.#'
]);
const CAT = grid([
	'#...........#',
	'##.........##',
	'###.......###',
	'#############',
	'#############',
	'##..#####..##',
	'##..#####..##',
	'#############',
	'#####...#####',
	'######.######',
	'.###########.',
	'..#########..'
]);
const MUSHROOM = grid([
	'.....#####.....',
	'...#########...',
	'..###..####.##.',
	'.####..#######.',
	'###########..##',
	'###.#####....##',
	'###############',
	'.....#####.....',
	'.....#####.....',
	'.....#####.....',
	'....#######....'
]);
const ANCHOR = grid([
	'....###....',
	'....#.#....',
	'....###....',
	'.#########.',
	'.....#.....',
	'.....#.....',
	'.....#.....',
	'.....#.....',
	'#....#....#',
	'##...#...##',
	'.##..#..##.',
	'..#######..'
]);
const SAILBOAT = grid([
	'.......#.......',
	'.......##......',
	'.......###.....',
	'.....#.####....',
	'....##.#####...',
	'...###.######..',
	'..####.#######.',
	'.#####.#######.',
	'.......#.......',
	'###############',
	'.#############.',
	'..###########..',
	'#..#..#..#..#..'
]);
const MOON = grid([
	'...#####.....',
	'.####........',
	'.###......#..',
	'###......###.',
	'###.......#..',
	'###..........',
	'###.......#..',
	'.###.........',
	'.####........',
	'...#####.....'
]);
const STRAWBERRY = grid([
	'.....#.....',
	'..##.#.##..',
	'...#####...',
	'.#########.',
	'####.###.##',
	'###########',
	'##.####.###',
	'.#########.',
	'.###.#####.',
	'..#######..',
	'...#####...',
	'....###....'
]);

export const centerpieces: SeedChart[] = [
	{ name: 'Big Heart', motif: BIG_HEART, color: C.cream, contrast: C.rose, notes: 'One bold heart. Lovely in the centre of a crew neck.' },
	{ name: 'Hygge', motif: words('HYGGE'), color: C.forest, contrast: C.cream, notes: 'For the jumper you live in from October to March.' },
	{ name: 'The Peaks', motif: PEAKS, color: C.sky, contrast: C.charcoal, notes: 'A range of mountains over a dotted shoreline.' },
	{ name: 'Night Cat', motif: CAT, color: C.mustard, contrast: C.charcoal, notes: 'A black cat with its eyes and nose left in the main colour.' },
	{ name: 'Toadstool', motif: MUSHROOM, color: C.oatmeal, contrast: C.brick, notes: 'A spotted toadstool. Small enough for the left chest.' },
	{ name: 'Anchor', motif: ANCHOR, color: C.denim, contrast: C.cream, notes: 'A classic sailor anchor. Try it on a boat neck.' },
	{ name: 'Sailboat', motif: SAILBOAT, color: C.cream, contrast: C.denim, notes: 'Two sails on a little hull, with a ripple of water below.' },
	{ name: 'Crescent Moon', motif: MOON, color: C.plum, contrast: C.mustard, notes: 'A moon and a couple of stars, for a bedtime sweater.' },
	{ name: 'Strawberry', motif: STRAWBERRY, color: C.cream, contrast: C.brick, notes: 'A ripe strawberry with its seeds left in cream.' },
	{ name: 'Oui', motif: words('OUI'), color: C.brick, contrast: C.cream, notes: 'Three letters, big enough to read from across the room.' }
];

// ── Patterns: whole garments, some wearing the charts and centerpieces above ──

const centerpiece = (name: string) => centerpieces.find((c) => c.name === name)!.motif;

/** A design from the defaults, with the garment picked through `choose` so it gets the garment's own adjustments. */
function design(garment: string, fields: Partial<Design>): Design {
	const d: Design = { ...DEFAULT_DESIGN };
	choose(d, 'garment', garment);
	return { ...d, ...fields };
}

export const patterns: SeedPattern[] = [
	{
		name: 'Harbour Pullover',
		design: design('Sweater', { pattern: 'Stripes', stripeWidth: 'Regular', color: C.denim, contrast: C.cream, fit: 'Relaxed', neckline: 'Crew', gauge: 18 }),
		notes: 'A Breton-ish striped raglan in worsted. Easy to knit, easy to wear.'
	},
	{
		name: 'Sunday Market Cardigan',
		design: design('Cardigan', { color: C.mustard, contrast: C.brick, neckline: 'V-neck', fit: 'Relaxed', bodyRib: '2×2', sleeveRib: '2×2', gauge: 22 }),
		notes: 'A plain mustard cardigan in DK with brick edges, for throwing on over everything.'
	},
	{
		name: 'First Frost Sweater',
		design: design('Sweater', { pattern: 'Snowflakes', color: C.charcoal, contrast: C.cream, neckline: 'Mock neck', fit: 'Relaxed', gauge: 22 }),
		notes: 'Snowflakes all over, with a little mock neck to keep the wind out.'
	},
	{
		name: 'Big Heart Sweater',
		design: design('Sweater', { centerpiece: centerpiece('Big Heart'), color: C.cream, contrast: C.rose, fit: 'Oversized', neckline: 'Crew', gauge: 18 }),
		notes: 'An oversized cream crew with one big heart on the front.'
	},
	{
		name: 'Hygge Turtleneck',
		design: design('Sweater', { centerpiece: centerpiece('Hygge'), color: C.forest, contrast: C.cream, neckline: 'Turtleneck', bodyLength: 'Long', fit: 'Relaxed', gauge: 13 }),
		notes: 'Bulky, long and warm, with the word across the chest.'
	},
	{
		name: 'Night Cat Slipover',
		design: design('Slipover', { centerpiece: centerpiece('Night Cat'), centerpieceAt: 'Left chest', color: C.mustard, contrast: C.charcoal, neckline: 'V-neck', gauge: 22 }),
		notes: 'A sleeveless V-neck with a cat on the left chest. Wear it over a shirt.'
	},
	{
		name: 'Little Hearts Tee',
		design: design('T-shirt', { wearer: 'Kid', size: 'S', pattern: 'Hearts', color: C.cream, contrast: C.rose, neckline: 'Boat', gauge: 22 }),
		notes: 'A short-sleeved tee for a small person, with hearts all over.'
	},
	{
		name: 'Allotment Socks',
		design: design('Socks', { pattern: 'Checks', color: C.sage, contrast: C.oatmeal, sockLength: 'Crew', heel: 'Flap', gauge: 28 }),
		notes: 'Checked crew socks in fingering yarn, sturdy enough for wellies.'
	},
	{
		name: 'Ferry Beanie',
		design: design('Beanie', { pattern: 'Stripes', stripeWidth: 'Narrow', color: C.brick, contrast: C.cream, hatLength: 'Slouchy', pomPom: 'Pom-pom', gauge: 18 }),
		notes: 'A slouchy striped hat with a pom-pom, for windy crossings.'
	},
	{
		name: 'Fireside Scarf',
		design: design('Scarf', { pattern: 'Chevron', color: C.forest, contrast: C.mustard, scarfLength: 'Long', fringe: 'Long', gauge: 13 }),
		notes: 'A long chevron scarf in bulky yarn, finished with a generous fringe.'
	}
];
