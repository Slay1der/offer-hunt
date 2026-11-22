import { guarded, json, STAGES } from "../../../../../lib/api.js";

export async function PUT(req, { params }) {
  const { id } = await params;
  return guarded(async ({ me, q }) => {
    const b = await req.json().catch(() => ({}));
    const stage = STAGES.includes(b.stage) ? b.stage : "";
    const note = String(b.note ?? "").trim().slice(0, 300);
    await q`INSERT INTO statuses (role_id, member, stage, note, updated_at) VALUES (${id}, ${me}, ${stage}, ${note}, now())
      ON CONFLICT (role_id, member) DO UPDATE SET stage = EXCLUDED.stage, note = EXCLUDED.note, updated_at = now()`;
    await q`UPDATE roles SET inbox = FALSE WHERE id = ${id} AND ${stage} <> ''`;
    return json({ ok: true });
  });
}
