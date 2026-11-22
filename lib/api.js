import { NextResponse } from "next/server";
import { currentMember } from "./auth.js";
import { db } from "./db.js";

export const json = (data, status = 200) => NextResponse.json(data, { status });

export async function guarded(fn) {
  try {
    const me = await currentMember();
    if (!me) return json({ error: "Not signed in" }, 401);
    const q = await db();
    return await fn({ me, q });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "Server error" }, 500);
  }
}

const TRACKS = ["Software engineering", "DevOps / Cloud / SRE", "Either"];
const REGIONS = ["UK", "Europe", "US / Canada", "Remote", "Nigeria", "Other"];
const TYPES = ["Graduate / new grad", "Internship", "Full-time", "Contract"];
export const STAGES = ["", "saved", "applied", "oa", "interview", "offer", "rejected", "skipped"];

const str = (v, n) => String(v ?? "").trim().slice(0, n);
const pick = (v, list, d) => (list.includes(v) ? v : d);

export function cleanRole(b) {
  const link = str(b.link, 1000);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(b.deadline || "") ? b.deadline : null;
  return {
    company: str(b.company, 120),
    title: str(b.title, 200),
    link: /^https?:\/\//i.test(link) ? link : null,
    track: pick(b.track, TRACKS, TRACKS[0]),
    region: pick(b.region, REGIONS, "Other"),
    city: str(b.city, 120),
    visa: pick(b.visa, ["yes", "no", "unknown"], "unknown"),
    type: pick(b.type, TYPES, "Full-time"),
    deadline,
    notes: str(b.notes, 800),
  };
}
