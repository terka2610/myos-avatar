# MYOS Executive Consultation Studio

A consultation room for any founder or executive. It keeps the six stages of the original CEO consultation preview, and adds live discovery, a pricing hypothesis, consent, and an organization-scoped record.

The original preview stays at `ceo-consultation/index.html`. This app does not modify it, and it does not modify `src/app`.

## Run

```bash
cd apps/executive-studio
npm install
npm test
npm run dev
```

The dev server uses `http://localhost:3210`. The database file is `data/studio.db` and is gitignored. The process refuses to open a database when `APP_ENV` or `VERCEL_ENV` is `production`.

## Environment

Copy `.env.example`. All of these are optional:

- `OPENAI_API_KEY` — server only. If it is missing, or the call times out, the rule-based recommendation is used. The key is never sent to the browser.
- `STUDIO_ADMIN_CODE` — required before price edits on a shared preview. Local development allows an admin unlock without it.
- `STUDIO_DB_PATH` — override the database file. Do not point it at a production database.
- `APP_ENV` — `development` locally. Never `production` for this studio.

No model call is made by the tests or the build.

## What is real here

- The six-stage consultation, in English and Italian.
- Time burden from the customer's figures, labeled as time involved.
- A pricing catalog seeded from the original prototype, editable by an admin.
- Recommendations from recorded answers, with a server-side model path that stays closed until consent and a key are both present.
- Organization-scoped consultations, consent records, exports, onboarding metadata, and a consultation dashboard.

## What is not operational

Avatar rendering, voice cloning, Zoom, Teams, CRM write-back, holographic hardware, podcast production, and twin usage metrics. The product screens label these as demos or as not operational. No synthetic identity is created.
