"use client";
import { useState } from "react";

export default function LoginForm({ members }) {
  const [member, setMember] = useState(members[0] || "");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member, passcode }) });
    setBusy(false);
    if (res.ok) window.location.href = "/";
    else setErr((await res.json().catch(() => ({}))).error || "Couldn't sign in");
  }

  return (
    <main className="band login">
      <form className="sheet" onSubmit={submit}>
        <h1>Offer Hunt Tracker</h1>
        <p className="note">Sign in to track roles together.</p>
        <div className="f">
          <label>Who are you?</label>
          <div className="tabs">
            {members.map((m) => (
              <button type="button" key={m} className="tab" aria-pressed={m === member} onClick={() => setMember(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="f">
          <label htmlFor="pc">Shared passcode</label>
          <input id="pc" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="err">{err}</div>
        <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
