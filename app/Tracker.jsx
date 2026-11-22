"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

const STAGES = [["", "Not started"], ["saved", "Saved"], ["applied", "Applied"], ["oa", "Assessment"], ["interview", "Interviewing"], ["offer", "Offer"], ["rejected", "Rejected"], ["skipped", "Skipped"]];
const TALLY = ["saved", "applied", "oa", "interview", "offer", "rejected"];
const TRACKS = ["Software engineering", "DevOps / Cloud / SRE", "Either"];
const REGIONS = ["UK", "Europe", "US / Canada", "Remote", "Nigeria", "Other"];
const TYPES = ["Graduate / new grad", "Internship", "Full-time", "Contract"];
const label = (k) => (STAGES.find((s) => s[0] === k) || STAGES[0])[1];
const daysLeft = (d) => (d ? Math.ceil((new Date(d + "T23:59:59") - Date.now()) / 864e5) : null);
const blank = { company: "", title: "", link: "", track: TRACKS[0], region: REGIONS[0], city: "", visa: "unknown", type: TYPES[0], deadline: "", notes: "" };

async function api(url, method = "GET", body) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { window.location.href = "/login"; throw new Error("Signed out"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function Tracker() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState({ t: "Loading roles…", warn: false });
  const [view, setView] = useState("mine");
  const [stageFilter, setStageFilter] = useState("");
  const [f, setF] = useState({ q: "", track: "", region: "", visa: "", sort: "due" });
  const [form, setForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [finding, setFinding] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api("/api/roles"); setData(d); setMsg((m) => (m.t.startsWith("Loading") || m.t.startsWith("Can't") ? { t: "" } : m)); }
    catch (e) { setMsg({ t: "Can't reach the tracker right now: " + e.message, warn: true }); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const me = data?.me;
  const roles = data?.roles || [];
  const mates = (data?.members || []).filter((m) => m !== me);
  const st = (r, m) => r.status?.[m] || {};
  const inbox = roles.filter((r) => r.inbox);

  const counts = useMemo(() => {
    const c = Object.fromEntries(TALLY.map((k) => [k, 0]));
    roles.forEach((r) => { const s = st(r, me).stage; if (s in c) c[s]++; });
    return c;
  }, [roles, me]);

  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    let out = roles.filter((r) => {
      if (view === "finds") return r.inbox;
      if (r.inbox && view !== "all") return false;
      if (q && !`${r.company} ${r.title} ${r.city} ${r.notes}`.toLowerCase().includes(q)) return false;
      if (f.track && r.track !== f.track && r.track !== "Either") return false;
      if (f.region && r.region !== f.region) return false;
      if (f.visa && r.visa !== f.visa) return false;
      const s = st(r, me).stage || "";
      if (stageFilter && s !== stageFilter) return false;
      if (view === "mine" && !stageFilter && (s === "rejected" || s === "skipped")) return false;
      if (view === "both" && !Object.values(r.status || {}).some((x) => x.stage && x.stage !== "skipped")) return false;
      return true;
    });
    if (view === "finds") {
      out = out.filter((r) => (!f.track || r.track === f.track) && (!f.region || r.region === f.region) && (!f.visa || r.visa === f.visa) && (!q || `${r.company} ${r.title} ${r.city}`.toLowerCase().includes(q)));
    }
    const key = (r) => r.deadline || "9999";
    out.sort((a, b) => (f.sort === "new" ? new Date(b.created_at) - new Date(a.created_at) : f.sort === "co" ? a.company.localeCompare(b.company) : key(a).localeCompare(key(b))));
    return out;
  }, [roles, view, f, stageFilter, me]);

  async function act(fn, ok) {
    try { await fn(); if (ok) setMsg({ t: ok }); await load(); }
    catch (e) { setMsg({ t: e.message, warn: true }); }
  }

  const setStage = (r, stage) => act(() => api(`/api/roles/${r.id}/status`, "PUT", { stage, note: st(r, me).note || "" }));
  const setNote = (r, note) => { if (note.trim() !== (st(r, me).note || "")) act(() => api(`/api/roles/${r.id}/status`, "PUT", { stage: st(r, me).stage || "", note })); };

  async function findNow() {
    setFinding(true);
    setMsg({ t: "Searching job boards… this can take up to a minute." });
    try {
      const r = await api("/api/find", "POST");
      setMsg({ t: `Scanned ${r.scanned} postings, ${r.matched} matched, ${r.added} new added to New finds.${r.errors.length ? " Some sources failed: " + r.errors.length : ""}` });
      await load();
      if (r.added) setView("finds");
    } catch (e) { setMsg({ t: e.message, warn: true }); }
    setFinding(false);
  }

  async function save(e) {
    e.preventDefault();
    if (form.link && !/^https?:\/\//i.test(form.link)) return setForm({ ...form, err: "Links must start with http:// or https://" });
    const { id, err, ...body } = form;
    try { await (id ? api(`/api/roles/${id}`, "PATCH", body) : api("/api/roles", "POST", body)); setForm(null); await load(); }
    catch (e2) { setForm({ ...form, err: e2.message }); }
  }

  async function logout() { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const lastRun = data?.lastRun ? new Date(data.lastRun.ran_at).toLocaleString() : "never";

  return (
    <main className="band">
      <div className="top">
        <h1>Offer Hunt Tracker</h1>
        <div className="who">
          {me ? <>Signed in as <b>{me}</b>{mates.length ? <> · tracking with <b>{mates.join(", ")}</b></> : null} · <button className="link" onClick={logout}>Sign out</button></> : "Connecting…"}
        </div>
      </div>

      <div className="tabs" role="group" aria-label="View">
        {[["finds", `New finds${inbox.length ? ` (${inbox.length})` : ""}`], ["mine", "My pipeline"], ["both", "Both of us"], ["all", "All roles"]].map(([k, l]) => (
          <button key={k} className="tab" aria-pressed={view === k} onClick={() => { setView(k); setStageFilter(""); }}>{l}</button>
        ))}
      </div>

      <div className="finds">
        <span>The auto-finder checks Remotive, Arbeitnow, RemoteOK and company boards every morning. Last run: <b>{lastRun}</b>{data?.lastRun ? ` · ${data.lastRun.added} new` : ""}</span>
        <button className="btn" onClick={findNow} disabled={finding}>{finding ? "Searching…" : "Find roles now"}</button>
      </div>

      <div className="tally" aria-label="My stages">
        {TALLY.map((k) => (
          <button key={k} aria-pressed={stageFilter === k} onClick={() => { setStageFilter(k); if (view === "finds") setView("mine"); }}>
            <span className="n">{counts[k]}</span><span className="l">{label(k)}</span>
          </button>
        ))}
        <button aria-pressed={stageFilter === ""} onClick={() => setStageFilter("")}><span className="n">{roles.filter((r) => !r.inbox).length}</span><span className="l">Tracked roles</span></button>
      </div>

      <div className="bar">
        <input type="search" placeholder="Search company, role, city" aria-label="Search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select aria-label="Track" value={f.track} onChange={(e) => setF({ ...f, track: e.target.value })}><option value="">All tracks</option>{TRACKS.map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="Region" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}><option value="">All regions</option>{REGIONS.map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="Visa" value={f.visa} onChange={(e) => setF({ ...f, visa: e.target.value })}><option value="">Any visa</option><option value="yes">Sponsors visa</option><option value="unknown">Visa unknown</option><option value="no">No sponsorship</option></select>
        <select aria-label="Sort" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}><option value="due">Deadline first</option><option value="new">Newest first</option><option value="co">Company A–Z</option></select>
        <button className="btn primary" onClick={() => setForm({ ...blank })}>+ Add role</button>
      </div>

      <div className={"note" + (msg.warn ? " warn" : "")}>{msg.t}</div>

      <div className="list">
        {data && !list.length && (
          <div className="empty">{view === "finds" ? "No new finds right now. Tap “Find roles now” or check back tomorrow morning." : roles.length ? "No roles match these filters." : "No roles yet. Add one, or run the finder."}</div>
        )}
        {list.map((r) => {
          const mine = st(r, me), dl = daysLeft(r.deadline);
          const due = dl === null ? "" : dl < 0 ? `Closed ${-dl}d ago` : dl === 0 ? "Due today" : `${dl}d left`;
          const head = `${r.company} — ${r.title}`;
          return (
            <article key={r.id} className={"row" + (r.inbox ? " new" : "")}>
              <div>
                <h3>{r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">{head}</a> : head}</h3>
                <div className="meta">
                  <span className="chip">{r.region}{r.city ? ` · ${r.city}` : ""}</span>
                  <span className="chip">{r.track}</span>
                  <span className="chip">{r.type}</span>
                  <span className={"chip " + (r.visa === "yes" ? "yes" : r.visa === "no" ? "no" : "")}>{r.visa === "yes" ? "Sponsors visa" : r.visa === "no" ? "No sponsorship" : "Visa unknown"}</span>
                  {due && <span className={"due" + (dl <= 7 ? " hot" : "")}>{due} · {r.deadline}</span>}
                </div>
                {r.notes && <div className="note" style={{ marginTop: 6 }}>{r.notes}</div>}
                <div className="src">{r.added_by === "auto-finder" ? `Found by auto-finder · ${r.source}` : `Added by ${r.added_by || "someone"}`}</div>
              </div>
              <div className="side">
                {r.inbox ? (
                  <>
                    <button className="btn primary" onClick={() => act(() => api(`/api/roles/${r.id}`, "PATCH", { action: "keep" }), "Moved to tracked roles.")}>Keep</button>
                    <button className="btn" onClick={() => act(() => api(`/api/roles/${r.id}`, "PATCH", { action: "dismiss" }))}>Dismiss</button>
                  </>
                ) : (
                  <>
                    <select aria-label={`My stage for ${r.company}`} value={mine.stage || ""} onChange={(e) => setStage(r, e.target.value)}>
                      {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    {mates.map((m) => (
                      <span key={m} className="mate">{m}: <b>{label(st(r, m).stage || "")}</b>{st(r, m).note ? ` · ${st(r, m).note}` : ""}</span>
                    ))}
                  </>
                )}
              </div>
              {!r.inbox && (
                <div className="actions">
                  <input key={`${r.id}-${mine.note || ""}`} placeholder="My note (e.g. applied via referral, OA on Friday)" defaultValue={mine.note || ""} aria-label="My note" onBlur={(e) => setNote(r, e.target.value)} />
                  <button className="link" onClick={() => setForm({ ...blank, ...r, deadline: r.deadline || "", link: r.link || "" })}>Edit</button>
                  <button className="link red" onClick={() => { if (confirmDel === r.id) { setConfirmDel(null); act(() => api(`/api/roles/${r.id}`, "DELETE")); } else { setConfirmDel(r.id); setTimeout(() => setConfirmDel((c) => (c === r.id ? null : c)), 4000); } }}>
                    {confirmDel === r.id ? "Tap again to remove" : "Remove"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {form && (
        <div className="modal open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setForm(null); }}>
          <form className="sheet" onSubmit={save}>
            <h2>{form.id ? "Edit role" : "Add a role"}</h2>
            <div className="two">
              <div className="f"><label htmlFor="co">Company</label><input id="co" required maxLength={120} value={form.company} onChange={set("company")} autoFocus /></div>
              <div className="f"><label htmlFor="ti">Role title</label><input id="ti" required maxLength={200} value={form.title} onChange={set("title")} /></div>
            </div>
            <div className="f"><label htmlFor="li">Posting link</label><input id="li" type="url" placeholder="https://" value={form.link} onChange={set("link")} /></div>
            <div className="two">
              <div className="f"><label htmlFor="tr">Track</label><select id="tr" value={form.track} onChange={set("track")}>{TRACKS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="f"><label htmlFor="rg">Region</label><select id="rg" value={form.region} onChange={set("region")}>{REGIONS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="f"><label htmlFor="ci">City / country</label><input id="ci" maxLength={120} value={form.city} onChange={set("city")} /></div>
              <div className="f"><label htmlFor="vi">Visa sponsorship</label><select id="vi" value={form.visa} onChange={set("visa")}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div>
              <div className="f"><label htmlFor="ty">Type</label><select id="ty" value={form.type} onChange={set("type")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="f"><label htmlFor="dd">Deadline</label><input id="dd" type="date" value={form.deadline} onChange={set("deadline")} /></div>
            </div>
            <div className="f"><label htmlFor="no">Shared notes</label><textarea id="no" rows={2} maxLength={800} value={form.notes} onChange={set("notes")} placeholder="Referral contact, requirements, salary range…" /></div>
            <div className="err">{form.err}</div>
            <div className="bar" style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn primary">Save role</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
