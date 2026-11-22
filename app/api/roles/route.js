import { guarded, json, cleanRole } from "../../../lib/api.js";
import { members } from "../../../lib/auth.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return guarded(async ({ me, q }) => {
    const roles = await q`SELECT id, company, title, link, track, region, city, visa, type,
      to_char(deadline, 'YYYY-MM-DD') AS deadline, notes, source, added_by, inbox, created_at
      FROM roles WHERE dismissed = FALSE ORDER BY created_at DESC LIMIT 2000`;
    const statuses = await q`SELECT role_id, member, stage, note, updated_at FROM statuses`;
    const [run] = await q`SELECT ran_at, scanned, added, errors FROM finder_runs ORDER BY ran_at DESC LIMIT 1`;
    const byRole = {};
    for (const s of statuses) (byRole[s.role_id] ||= {})[s.member] = { stage: s.stage, note: s.note, at: s.updated_at };
    return json({ me, members: members(), lastRun: run || null, roles: roles.map((r) => ({ ...r, status: byRole[r.id] || {} })) });
  });
}

export async function POST(req) {
  return guarded(async ({ me, q }) => {
    const r = cleanRole(await req.json().catch(() => ({})));
    if (!r.company || !r.title) return json({ error: "Company and role title are needed" }, 400);
    if (r.link) {
      const dup = await q`SELECT id, dismissed FROM roles WHERE link = ${r.link}`;
      if (dup.length) {
        await q`UPDATE roles SET dismissed = FALSE, inbox = FALSE WHERE id = ${dup[0].id}`;
        return json({ id: dup[0].id, existing: true });
      }
    }
    const [row] = await q`INSERT INTO roles (company, title, link, track, region, city, visa, type, deadline, notes, added_by)
      VALUES (${r.company}, ${r.title}, ${r.link}, ${r.track}, ${r.region}, ${r.city}, ${r.visa}, ${r.type}, ${r.deadline}, ${r.notes}, ${me})
      RETURNING id`;
    await q`INSERT INTO statuses (role_id, member, stage) VALUES (${row.id}, ${me}, 'saved')`;
    return json({ id: row.id }, 201);
  });
}
