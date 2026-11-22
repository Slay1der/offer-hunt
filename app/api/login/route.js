import { NextResponse } from "next/server";
import { makeToken, members, passcodeOk, sessionCookie } from "../../../lib/auth.js";

export async function POST(req) {
  const { passcode, member } = await req.json().catch(() => ({}));
  if (!passcodeOk(passcode)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  if (!members().includes(member)) return NextResponse.json({ error: "Pick who you are" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.name, makeToken(member), sessionCookie.options);
  return res;
}
