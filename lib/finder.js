import { toRole } from "./match.js";

const UA = { "User-Agent": "offer-hunt-tracker/1.0 (personal job tracker)", Accept: "application/json" };

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const list = (v, d) => (v ?? d).split(",").map((s) => s.trim()).filter(Boolean);

export const SOURCES = {
  async remotive() {
    const out = [];
    for (const cat of ["software-dev", "devops"]) {
      const j = await getJson(`https://remotive.com/api/remote-jobs?category=${cat}&limit=300`);
      for (const x of j.jobs || [])
        out.push({ company: x.company_name, title: x.title, link: x.url, location: x.candidate_required_location, remote: true, text: x.description, extraType: x.job_type, source: "Remotive" });
    }
    return out;
  },
  async arbeitnow() {
    const out = [];
    for (let page = 1; page <= 3; page++) {
      const j = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      for (const x of j.data || [])
        out.push({ company: x.company_name, title: x.title, link: x.url, location: x.location, remote: !!x.remote, text: x.description, visaFlag: x.visa_sponsorship === true ? true : undefined, extraType: (x.job_types || []).join(" "), source: "Arbeitnow" });
      if (!j.links?.next) break;
    }
    return out;
  },
  async remoteok() {
    const j = await getJson("https://remoteok.com/api");
    return (Array.isArray(j) ? j : []).filter((x) => x && x.position).map((x) => ({ company: x.company, title: x.position, link: x.url, location: x.location || "Remote", remote: true, text: x.description, source: "RemoteOK" }));
  },
  async greenhouse() {
    const out = [];
    for (const board of list(process.env.GREENHOUSE_BOARDS, "stripe,datadog,cloudflare,gitlab,mongodb,elastic,airbnb,dropbox,twilio,hubspot,databricks,figma,coinbase,samsara,intercom")) {
      try {
        const j = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
        for (const x of j.jobs || [])
          out.push({ company: j.meta?.name || board, title: x.title, link: x.absolute_url, location: x.location?.name, text: x.content, source: `Greenhouse:${board}` });
      } catch {}
    }
    return out;
  },
  async lever() {
    const out = [];
    for (const co of list(process.env.LEVER_COMPANIES, "palantir,spotify,plaid,wealthsimple")) {
      try {
        const j = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(co)}?mode=json`);
        for (const x of Array.isArray(j) ? j : [])
          out.push({ company: co.charAt(0).toUpperCase() + co.slice(1), title: x.text, link: x.hostedUrl, location: x.categories?.location, text: x.descriptionPlain || x.description, extraType: x.categories?.commitment, source: `Lever:${co}` });
      } catch {}
    }
    return out;
  },
};

export async function findRoles(q) {
  const errors = [];
  let scanned = 0;
  const found = [];
  const results = await Promise.allSettled(Object.entries(SOURCES).map(async ([name, fn]) => [name, await fn()]));
  for (const r of results) {
    if (r.status === "rejected") { errors.push(String(r.reason?.message || r.reason).slice(0, 200)); continue; }
    const [, items] = r.value;
    scanned += items.length;
    for (const it of items) {
      const role = toRole(it);
      if (role) found.push(role);
    }
  }
  const seen = new Set();
  let added = 0;
  for (const r of found) {
    if (seen.has(r.link)) continue;
    seen.add(r.link);
    const rows = await q`INSERT INTO roles (company, title, link, track, region, city, visa, type, source, added_by, inbox)
      VALUES (${r.company}, ${r.title}, ${r.link}, ${r.track}, ${r.region}, ${r.city}, ${r.visa}, ${r.type}, ${r.source}, 'auto-finder', TRUE)
      ON CONFLICT (link) WHERE link IS NOT NULL AND link <> '' DO NOTHING RETURNING id`;
    if (rows.length) added++;
  }
  await q`INSERT INTO finder_runs (scanned, added, errors) VALUES (${scanned}, ${added}, ${errors.join(" | ")})`;
  return { scanned, matched: seen.size, added, errors };
}
