# Executive Consultation Studio v2

## Branch

`feature/executive-consultation-v2`, based on `ceo-consultation-preview`.

## Preview

Isolated project `myos-executive-studio-preview`, deployment `dpl_3P82ysYBBKse7orsaK93hyNLaVVv`.

https://myos-executive-studio-preview-3l7yiftr9-mmedcon-techs-projects.vercel.app/

Vercel labeled that first deployment `production` even though `target` was omitted. It is a new project, behind Vercel Authentication, and it does not replace the existing CEO consultation demo. The studio still refuses a durable database in that environment and uses `/tmp`, so records there are ephemeral. The original demo URL still returns the unchanged static preview.

## Implemented

- Six stages preserved: Audience, Friction, Reality check, Configure, Solution, Next steps. Italian labels preserved from the prototype.
- Home with four categories, a split discovery workspace, product mockups, a live pricing configurator, in-person and remote onboarding, and a consultation summary.
- English and Italian for navigation, questions, pricing, onboarding, consent, recommendations, proposals, and errors.
- Time burden from the customer's own frequency and duration. It is labeled as time involved, not savings.
- Rule-based recommendations with the required JSON fields, validated on the server. A model call exists only on the server, only after explicit consent, and falls back to the rules when there is no key or the call times out.
- Plans seeded from the prototype: voice minutes 0, 0, 250, 750. The reconstructed 60 and 200 were not applied. Prices are editable and labeled as hypotheses. Setup and the monthly fee are separate. Video is capped.
- Organization-scoped SQLite records for consultations, answers, events, recommendations, plans, proposals, onboarding, asset metadata, consent, knowledge sources, and a usage-event table that nothing writes to yet.
- Dashboard counts from stored consultations. Twin usage is shown as not instrumented.

## Simulated or not connected

- Avatar, voice, meeting, CRM, and hologram experiences are interactive demos or explicit gaps.
- Remote files are checked in the browser and are not uploaded. Only a filename and declared size can be stored, and only after identity consent.
- The voice timer does not record or upload audio.
- On Vercel, without a provisioned database, the store uses a temporary disk and can disappear. No production database was created.
- No OpenAI key is configured, and no paid model call was made.

## Tests

`npm test` — 31 tests, passing. They cover time math, plan changes, the recommendation schema, meetings and Zoom as not operational, CRM and holograms, contradictions, no measurable pain, invented model evidence, Italian copy, consent, tenancy, a missing key, a timeout, admin price edits, export, and the unchanged original files.

`npx tsc --noEmit` and `npx next build` succeed.

A headless Chrome walk opened a consultation, showed 8.7 hours from 4 × 30 minutes, priced four 45-second videos at €99, switched the configurator to Italian, and rendered the home page at mobile and tablet widths.

## Remaining

- A durable staging database, if consultations must survive a serverless restart.
- A real identity provider. Staging sign-in is a named session, not production authentication.
- Provider-specific capture specs, confirmed before any recording session.
- Instrumentation before any usage or cost number is shown as real.
- An admin code on the preview, if price edits should be unlocked there.

## Changelog

- Added `apps/executive-studio` and left the original preview and `src/app` byte-for-byte unchanged.
- Replaced the single simulated page with a responsive consultation room in the MYOS palette.
- Added server recommendations, consent, pricing hypotheses, onboarding, summaries, and a dashboard.
- Documented the voice-minute mismatch between the prototype and the reconstructed table.

## Blockers

- This repository has no existing OpenAI integration and no key. The model path is implemented and uncalled.
- The Vercel account available here is not the account that hosts `myos-ceo-consultation-demo`. That project was not modified.
- Vercel marked the new project's first deployment as production. No durable database is attached. The deployment is behind Vercel Authentication.
- The first build's API returned 500 because the studio refused to open a database while `VERCEL_ENV` was `production`. A follow-up allows only an ephemeral `/tmp` file in that case. A second deployment carries that fix.
- No staging database was provisioned. Creating one would be new infrastructure and was not approved.
