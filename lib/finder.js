import { toRole } from "./match.js";

const UA = { "User-Agent": "offer-hunt-tracker/1.0 (personal job tracker)", Accept: "application/json" };

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
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
    const boards = list(process.env.GREENHOUSE_BOARDS, "stripe,datadog,cloudflare,gitlab,mongodb,elastic,airbnb,dropbox,twilio,hubspot,databricks,figma,coinbase,samsara,intercom");
    const res = await Promise.allSettled(boards.map(async (board) => {
      const j = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
      return (j.jobs || []).map((x) => ({ company: j.meta?.name || board, title: x.title, link: x.absolute_url, location: x.location?.name, text: x.content, source: `Greenhouse:${board}` }));
    }));
    return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
  async lever() {
    const cos = list(process.env.LEVER_COMPANIES, "palantir,spotify,plaid,wealthsimple");
    const res = await Promise.allSettled(cos.map(async (co) => {
      const j = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(co)}?mode=json`);
      return (Array.isArray(j) ? j : []).map((x) => ({ company: co.charAt(0).toUpperCase() + co.slice(1), title: x.text, link: x.hostedUrl, location: x.categories?.location, text: x.descriptionPlain || x.description, extraType: x.categories?.commitment, source: `Lever:${co}` }));
    }));
    return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
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
  const unique = found.filter((r) => (seen.has(r.link) ? false : (seen.add(r.link), true)));
  let added = 0;
  for (let i = 0; i < unique.length; i += 15) {
    const chunk = unique.slice(i, i + 15);
    const rows = await Promise.all(chunk.map((r) => q`INSERT INTO roles (company, title, link, track, region, city, visa, type, source, added_by, inbox)
      VALUES (${r.company}, ${r.title}, ${r.link}, ${r.track}, ${r.region}, ${r.city}, ${r.visa}, ${r.type}, ${r.source}, 'auto-finder', TRUE)
      ON CONFLICT (link) WHERE link IS NOT NULL AND link <> '' DO NOTHING RETURNING id`));
    added += rows.filter((x) => x.length).length;
  }
  await q`INSERT INTO finder_runs (scanned, added, errors) VALUES (${scanned}, ${added}, ${errors.join(" | ")})`;
  return { scanned, matched: unique.length, added, errors };
}
