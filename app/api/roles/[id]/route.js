import { guarded, json, cleanRole } from "../../../../lib/api.js";

export async function PATCH(req, { params }) {
  const { id } = await params;
  return guarded(async ({ q }) => {
    const b = await req.json().catch(() => ({}));
    if (b.action === "keep") {
      await q`UPDATE roles SET inbox = FALSE WHERE id = ${id}`;
      return json({ ok: true });
    }
    if (b.action === "dismiss") {
      await q`UPDATE roles SET dismissed = TRUE, inbox = FALSE WHERE id = ${id}`;
      return json({ ok: true });
    }
    const r = cleanRole(b);
    if (!r.company || !r.title) return json({ error: "Company and role title are needed" }, 400);
    await q`UPDATE roles SET company=${r.company}, title=${r.title}, link=${r.link}, track=${r.track}, region=${r.region},
      city=${r.city}, visa=${r.visa}, type=${r.type}, deadline=${r.deadline}, notes=${r.notes}, inbox=FALSE WHERE id=${id}`;
    return json({ ok: true });
  });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  return guarded(async ({ q }) => {
    await q`UPDATE roles SET dismissed = TRUE, inbox = FALSE WHERE id = ${id}`;
    return json({ ok: true });
  });
}
