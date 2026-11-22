# Offer Hunt Tracker

A shared job tracker for two people hunting for international SWE and DevOps roles. Each role on the board carries a separate stage and note for each person. An auto-finder runs every morning and drops new early-career roles into **New finds**.

## Features

- Passcode sign-in, with a profile for each person (set in `MEMBERS`)
- Your own stage on each role: Saved → Applied → Assessment → Interviewing → Offer / Rejected
- Views: New finds, My pipeline, Both of us, All roles
- Filters by track (SWE or DevOps/Cloud/SRE), region and visa sponsorship, sorted by deadline
- Daily auto-finder (Vercel Cron, 06:00 UTC) plus a **Find roles now** button. Sources:
  - Remotive (remote software-dev and devops)
  - Arbeitnow (Europe, mostly Germany)
  - RemoteOK
  - Greenhouse company boards (`GREENHOUSE_BOARDS`)
  - Lever company boards (`LEVER_COMPANIES`)

  The finder keeps only junior, graduate, intern and new-grad titles. It flags visa sponsorship or "no sponsorship" from the posting text and skips US roles that don't mention sponsorship.

## Deploy on Vercel

1. Import this repo at vercel.com/new.
2. In the project, open **Storage → Create → Neon (Postgres)** and connect it. This sets `DATABASE_URL`.
3. Add environment variables (see `.env.example`):
   - `APP_PASSCODE`: shared passcode
   - `SESSION_SECRET`: random string, 32+ characters
   - `MEMBERS`: e.g. `Quzzy,Ada`
   - `CRON_SECRET`: random string; Vercel sends it to the cron route
4. Redeploy. Tables are created automatically on the first request.

## Local dev

```bash
cp .env.example .env.local   # fill in DATABASE_URL etc.
npm install
npm run dev
npm test                     # role-matching tests
```
