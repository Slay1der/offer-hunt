import { neon } from "@neondatabase/serverless";

let client = null;
let ready = null;

export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Add a Neon Postgres database in Vercel > Storage.");
    client = neon(url);
  }
  return client;
}

export async function db() {
  const q = sql();
  if (!ready) {
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS roles (
        id BIGSERIAL PRIMARY KEY,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        link TEXT,
        track TEXT NOT NULL DEFAULT 'Software engineering',
        region TEXT NOT NULL DEFAULT 'Other',
        city TEXT NOT NULL DEFAULT '',
        visa TEXT NOT NULL DEFAULT 'unknown',
        type TEXT NOT NULL DEFAULT 'Full-time',
        deadline DATE,
        notes TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'manual',
        added_by TEXT NOT NULL DEFAULT '',
        inbox BOOLEAN NOT NULL DEFAULT FALSE,
        dismissed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await q`CREATE UNIQUE INDEX IF NOT EXISTS roles_link_uq ON roles (link) WHERE link IS NOT NULL AND link <> ''`;
      await q`CREATE TABLE IF NOT EXISTS statuses (
        role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        member TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (role_id, member)
      )`;
      await q`CREATE TABLE IF NOT EXISTS finder_runs (
        id BIGSERIAL PRIMARY KEY,
        ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        scanned INT NOT NULL DEFAULT 0,
        added INT NOT NULL DEFAULT 0,
        errors TEXT NOT NULL DEFAULT ''
      )`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return q;
}
