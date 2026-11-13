# Phase 1 audit — CEO Consultation Studio prototype

Source of truth: `ceo-consultation/index.html` on `ceo-consultation-preview` (commit `584ac1a`). The file is a single self-contained page. This repository has no package manifest, no API routes, no database, and no OpenAI integration. `src/app` is an unrelated earlier template (GovLearn / MyKeja copy) and is not the consultation prototype.

The original file is left unchanged. Executive Consultation Studio v2 lives in `apps/executive-studio`.

## What works in the browser today

- Six stages, in order: Audience, Friction, Reality check, Configure, Solution, Next steps. Italian labels in the prototype: Pubblico, Problema, Impatto reale, Configura, Soluzione, Passi successivi.
- Language switch (EN / IT) for the headline, subhead, stage names, and the back / continue controls.
- Audience choices: employees, new employees, new clients, prospects, visitors, other.
- Pain choices: slow content, employee onboarding, client onboarding, repeat meetings, repeat strategy questions, front desk / events, something else.
- Free-text notes, a last example, consequence, task owner, and one branch prompt that changes with the pain.
- Weekly time figure: `frequency × minutes per occurrence`. The page says this is not guaranteed savings.
- Configuration: videos per month, average seconds, voice minutes, capture method, Italian-speaking human support, optional podcast.
- Derived generated minutes: `videos × seconds / 60`.
- Subscription comparison for four plans, manual plan selection, and a suggested minimum fit.
- Meetings and the reception kiosk do not receive an automatic package. The copy sends them to a feasibility review.
- Local suggestion text for a custom question. A hook (`window.MYOS_RECOMMEND_ENDPOINT`) can POST to a server only after the AI-consent checkbox, but no endpoint is configured.
- Consent checkboxes for recording and for a future third-party AI provider.
- Export: download JSON, copy a text brief, save and reload a `localStorage` draft (`myos-consult-prototype`).
- Onboarding checklist text: headshot guidance, avatar video guidance, 20+ minutes of voice, remote or in-person capture, separate podcast consent.
- Overage figures shown as suggestions: €15 per extra video minute, €0.25 per extra voice minute.
- A mobile layout that stacks the sidebar and the cards.

## What is simulated

- The avatar “preview” is a CSS drawing. No likeness, voice, or video is generated.
- “Analyze the problem” returns a canned paragraph. No model is called.
- Prices, packages, and time figures are labeled as proposals, not a contract.
- The onboarding checklist does not accept files.
- Nothing is saved on a server. The draft sits in the browser.

## What needs a backend

- Authenticated, organization-scoped consultations and an audit trail of answer changes.
- Consent records before any identifiable content is sent to an external model.
- A server-side recommendation with schema validation, plus a rule-based fallback when no key is configured or the call times out.
- Durable proposals, onboarding records, knowledge sources, and asset metadata (not biometric binaries).
- An admin-editable price catalog.
- A consultation dashboard and a per-customer change timeline.
- Usage and cost metrics, only after real instrumentation exists.

## Gaps in the prototype

- Several stage bodies stay in English when Italian is selected (stage 2 help, stage 3, stage 4, stage 5, and most of stage 6).
- The opening line and the notes placeholder name a specific executive and company. v2 must work for any founder.
- Capture options name one customer office and one venue (H-FARM). v2 keeps three modes — remote, customer office, MyOS studio — without naming a customer.
- Default video quantity is 10, which can imply usage the customer never stated. v2 starts quantities blank.
- The full consultation, including notes, is written to `localStorage` on request, with no warning about shared devices. v2 keeps explicit local save, off by default, and treats the server record as the default.
- There is no tenant isolation, so a shared deployment of this file would mix data in the browser only.

## Pricing reconciliation

Prototype catalog (the figures a consultant sees on the live preview):

| Plan | Monthly | Setup | Videos | Generated minutes (`cap`) | Max seconds | Voice minutes |
|---|---:|---:|---:|---:|---:|---:|
| Video Presence | €99 | €249 | 6 | 6 | 60 | 0 |
| Executive Content | €299 | €499 | 20 | 20 | 90 | 0 |
| Knowledge + Onboarding | €799 | €1,500 | 20 | 25 | 120 | 250 |
| Leadership Platform | €1,499 | €3,000 | 40 | 50 | 120 | 750 |

The overnight brief’s table matches monthly fees, setup fees, video counts, and video minutes. Its voice column (60 / 200 / 250 / 750) does not match the prototype for the first two plans. Video Presence’s 60 is the prototype’s maximum clip length in seconds, not a voice allowance. Executive Content has no 200-minute voice pool in the prototype. v2 seeds the prototype figures, labels every price as a hypothesis, and leaves them editable. The 60 / 200 reconstruction was not applied.

## Safety boundary for v2

- New app, new branch, new database file, preview deployment only.
- `ceo-consultation/index.html` and `src/app/**` stay byte-for-byte identical.
- No production environment variables, no production database, no paid model calls during build or test.
