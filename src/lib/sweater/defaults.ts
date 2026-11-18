import type { Design } from './garment';

/** The design the designer opens with, and the shape every saved or shared design is checked against. */
export const DEFAULT_DESIGN: Design = {
	wearer: 'Adult',
	garment: 'Sweater',
	construction: 'Raglan',
	size: 'M',
	custom: null,
	fit: 'Relaxed',
	bodyLength: 'Regular',
	sleeveLength: 'Full',
	neckline: 'Crew',
	sleeveShape: 'Straight',
	hemFinish: 'Ribbed',
	bodyRib: '1×1',
	bodyRibLength: 'Regular',
	slits: 'None',
	neckRib: '1×1',
	neckDepth: 'Regular',
	cuffFinish: 'Ribbed',
	sleeveRib: '1×1',
	cuffLength: 'Regular',
	pattern: 'Solid',
	motif: '',
	color: '#465e9d',
	contrast: '#faf3dc',
	gauge: 18,
	needle: 0,
	ribNeedle: 0
};
