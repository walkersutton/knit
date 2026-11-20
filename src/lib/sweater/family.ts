import type { Design } from './garment';

/** The shape a design is built on. Derived from `garment` so links and saved designs stay flat. */
export type GarmentFamily = 'top' | 'hat' | 'sock' | 'scarf';

const FAMILY: Record<string, GarmentFamily> = {
	Sweater: 'top',
	'T-shirt': 'top',
	Slipover: 'top',
	Cardigan: 'top',
	Beanie: 'hat',
	Socks: 'sock',
	Scarf: 'scarf'
};

export const familyOf = (d: Pick<Design, 'garment'>): GarmentFamily => FAMILY[d.garment] ?? 'top';

export const isTop = (d: Pick<Design, 'garment'>) => familyOf(d) === 'top';

/** Garment types that can carry a word or picture: accessories deliberately do not, yet. */
export const centerpieceGarments = ['Sweater', 'T-shirt', 'Slipover'];
