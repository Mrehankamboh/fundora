const { fundoraPriceSeeds } = require("./catalog");

let ready = false;

async function ensureSchema(sql) {
  if (ready) return;

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text,
      name text NOT NULL DEFAULT '',
      country text,
      phone text,
      city text,
      experience text,
      platform text,
      referral text,
      role text NOT NULL DEFAULT 'user',
      blocked boolean NOT NULL DEFAULT false,
      google_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_uidx ON users (google_id) WHERE google_id IS NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      evaluation_type text NOT NULL,
      account_size numeric NOT NULL,
      platform text NOT NULL DEFAULT 'MetaTrader 5',
      fee numeric NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenge_prices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_name text NOT NULL,
      account_size numeric NOT NULL,
      price numeric NOT NULL,
      leverage text NOT NULL DEFAULT '1:100',
      UNIQUE (challenge_name, account_size)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rewards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount numeric NOT NULL DEFAULT 0,
      method text NOT NULL DEFAULT 'Rise',
      notes text,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM challenge_prices`;
  if (!Number(count)) {
    for (const row of fundoraPriceSeeds()) {
      await sql`
        INSERT INTO challenge_prices (challenge_name, account_size, price, leverage)
        VALUES (${row.challenge_name}, ${row.account_size}, ${row.price}, ${row.leverage})
        ON CONFLICT (challenge_name, account_size) DO NOTHING
      `;
    }
  }

  ready = true;
}

module.exports = { ensureSchema };
