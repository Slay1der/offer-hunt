import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "oh_session";

export function members() {
  return (process.env.MEMBERS || "Quzzy,Friend")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters).");
  return s;
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function makeToken(member) {
  const body = Buffer.from(JSON.stringify({ m: member, t: Date.now() })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expected = sign(body);
  const a = Buffer.from(mac || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { m } = JSON.parse(Buffer.from(body, "base64url").toString());
    return members().includes(m) ? m : null;
  } catch {
    return null;
  }
}

export function passcodeOk(input) {
  const real = process.env.APP_PASSCODE || "";
  if (!real) return false;
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function currentMember() {
  const jar = await cookies();
  return readToken(jar.get(COOKIE)?.value);
}

export const sessionCookie = {
  name: COOKIE,
  options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 },
};
