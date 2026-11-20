import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

/**
 * Check that the requester is authenticated via walkersutton.com.
 *
 * walkersutton.com sets a session cookie for the `.walkersutton.com` domain.
 * Because knit runs on `knit.walkersutton.com`, that cookie is sent with every
 * request.  We verify the cookie exists and has a non-empty value.
 *
 * The cookie name is configurable via ADMIN_AUTH_COOKIE (defaults to
 * `__session`, which is the Supabase convention).  If you use a different
 * auth system, set the env var to match.
 */
export const load: LayoutServerLoad = async ({ cookies }) => {
	const cookieName = env.ADMIN_AUTH_COOKIE ?? '__session';
	const token = cookies.get(cookieName);
	if (!token) error(401, 'Unauthorized');
	return {};
};
