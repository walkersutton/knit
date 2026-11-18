/** The few public fields of a Ravelry profile that knit shows on a knitter's page. */
export type Bio = { location?: string; about?: string; faveColors?: string; faveCurse?: string };

const LIMITS = { location: 80, about: 600, faveColors: 120, faveCurse: 120 } as const;

const text = (value: unknown, max: number) => {
	if (typeof value !== 'string') return undefined;
	const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
	return clean || undefined;
};

/**
 * Pick the bio out of Ravelry's profile JSON. Only plain-text fields are kept (never `about_me_html`), each
 * trimmed and capped, so whatever Ravelry sends can be shown as text without further care. Returns null if nothing is usable.
 */
export function cleanBio(user: unknown): Bio | null {
	const u = (user ?? {}) as Record<string, unknown>;
	const bio: Bio = {
		location: text(u.location, LIMITS.location),
		about: text(u.about_me, LIMITS.about),
		faveColors: text(u.fave_colors, LIMITS.faveColors),
		faveCurse: text(u.fave_curse, LIMITS.faveCurse)
	};
	for (const key of Object.keys(bio) as (keyof Bio)[]) if (bio[key] === undefined) delete bio[key];
	return Object.keys(bio).length ? bio : null;
}

/** A bio read back from the database, re-cleaned so a bad row can never put anything odd on the page. */
export function readBio(value: unknown): Bio | null {
	const v = (value ?? {}) as Record<string, unknown>;
	return cleanBio({ location: v.location, about_me: v.about, fave_colors: v.faveColors, fave_curse: v.faveCurse });
}
