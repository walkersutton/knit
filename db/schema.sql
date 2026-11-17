-- Run once against the Neon Postgres database configured for Knit It.
CREATE TABLE IF NOT EXISTS users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	ravelry_user_id text NOT NULL UNIQUE,
	ravelry_username text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

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
