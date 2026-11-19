-- Run once against the Neon Postgres database configured for knit.
CREATE TABLE IF NOT EXISTS users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	ravelry_user_id text NOT NULL UNIQUE,
	ravelry_username text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

-- The Ravelry profile photo, refreshed at each sign-in. It is shown in the circles of knitters on the home page.
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text;
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash text PRIMARY KEY,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS account_data (
	user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	data jsonb NOT NULL DEFAULT '{}'::jsonb,
	revision integer NOT NULL DEFAULT 1,
	updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_data ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

-- Patterns their authors have shared. Anyone can read them at /pattern/<id>; only the author can remove one.
CREATE TABLE IF NOT EXISTS shared_patterns (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name text NOT NULL,
	design jsonb NOT NULL,
	-- Hash of the design, so sharing the same design twice returns the same link.
	design_key text NOT NULL,
	garment text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (user_id, design_key)
);
-- The 3D model as a PNG (base64), captured in the author's browser when they share, for link previews. Optional: older patterns have none.
ALTER TABLE shared_patterns ADD COLUMN IF NOT EXISTS og_image text;
CREATE INDEX IF NOT EXISTS shared_patterns_created_at_idx ON shared_patterns(created_at DESC);

-- Colourwork charts their authors have shared. Anyone can read them at /chart/<id>; only the author can remove one.
CREATE TABLE IF NOT EXISTS shared_charts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name text NOT NULL,
	-- A string of '0' and '1', one cell per stitch, top row first (see validMotif).
	motif text NOT NULL,
	color text NOT NULL,
	contrast text NOT NULL,
	-- 'standard' (12 × 16) or 'fine' (24 × 32).
	size text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	-- Sharing the same chart in the same colours twice returns the same link.
	UNIQUE (user_id, motif, color, contrast)
);
CREATE INDEX IF NOT EXISTS shared_charts_created_at_idx ON shared_charts(created_at DESC);

-- Likes from signed-in knitters. The most-liked chart and pattern are the community favourites on the home page.
CREATE TABLE IF NOT EXISTS chart_likes (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	chart_id uuid NOT NULL REFERENCES shared_charts(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, chart_id)
);
CREATE INDEX IF NOT EXISTS chart_likes_chart_id_idx ON chart_likes(chart_id);

CREATE TABLE IF NOT EXISTS pattern_likes (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	pattern_id uuid NOT NULL REFERENCES shared_patterns(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, pattern_id)
);
CREATE INDEX IF NOT EXISTS pattern_likes_pattern_id_idx ON pattern_likes(pattern_id);

-- A few public fields from the Ravelry profile (location, about me, favourite colours), refreshed at each sign-in. Shown on the knitter's page at /people/<username>.
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio jsonb;

-- The author's own words about a shared chart or pattern (yarn, ideas, fit), shown on its page. Plain text, at most 1000 characters.
ALTER TABLE shared_charts ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE shared_patterns ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
