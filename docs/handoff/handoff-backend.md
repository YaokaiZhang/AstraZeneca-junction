# Handoff: build the backend for Ajoissa (AstraZeneca junction)

## Goal of the next session
Implement a real backend that the existing frontend can use, covering every function in the spec. Today the app is **frontend-only**. All state lives in `localStorage` (zustand persist key `ajoissa-v1`). The hospital page "receives" patient data by reading that same browser store. The only server code is a Vite middleware for the AI chat.

## Read first (don't duplicate; these are the source of truth)
- Spec: `docs/final-ideas.md` (patient 1.1–1.6, hospital 2.1–2.4, county 3.1–3.5, source badges, privacy, data-sources table). Section 1.7 was deliberately deleted. Never reintroduce age-based screening reminders.
- Run and test path: `README.md`, `frontend/README.md` (how to run with `LLM_KEY`).
- Shared state shape, which is effectively the API contract: `frontend/src/lib/store.ts` (`State`, `DiaryEntry`, `CheckResult`, `BarrierReport`, `HospitalAction`, `Checkins`, `sharing`, `aiChat`).
- Existing server code: `frontend/server/llm.ts`, a Vite plugin with `GET /api/health` and `POST /api/chat` (Claude Haiku 5.5, structured output, server-side validation). The client side is in `frontend/src/pages/patient/chat.ts` (`send`, `healthCheck`).
- Domain logic that runs in the browser now: `frontend/src/pages/patient/logic.ts` (PLCOm2012 `plco()`, `estimates`, `estimateHigh`, `nextSteps`, `assess`, `checkinSubject`). Pathway steps, target times and barriers are in `frontend/src/data/pathway.ts`.
- Hospital: `frontend/src/pages/hospital/{model.ts,demoPatients.ts,index.tsx}` (off-track ranking, escalation threshold, coordinators, demo patients seeded from county case numbers).
- County: `frontend/src/data/counties.ts` (`REAL`/`FINLAND` tables hardcoded from Statistics Finland 14wx, Sotkanet 6103/3621/3620/4404/4411/4459/5527/3336), `frontend/src/pages/county/towns.ts` (292 municipalities), `frontend/src/data/sources.ts` (badges and URLs).
- Git history on `main`, newest first: 8850da6 (AI chat), 1d01b78 (county real data), 4d7c1dd (patient check-ins and sharing), 8449041 (hospital).

## What a backend must supply (gaps today)
1. **Patient → hospital sharing (1.1, 2.3).** "Send to health centre" only sets `sharing.hospital` locally, and the hospital page only sees the same browser's patient. A backend needs: patient records (diary, check result and estimates, pathway dates, barriers), opt-in consent per share with timestamps (privacy: opt-in each time, revocable), and a hospital read endpoint that merges real shared patients with the demo ones.
2. **Hospital actions and escalation (2.1, 2.2, 2.4).** `actions` and `escalateAfterDays` are stored locally. These need persisting server-side, and escalation should run server-side (a scheduled job) so cases get flagged to a named coordinator without the patient or a browser present.
3. **Check-ins (1.6).** These fire only while the page is open (in-app prompt and optional `Notification`). Real reach-out needs Web Push (service worker plus VAPID) or similar, driven by `checkins.{enabled,everyDays,auto,snoozedUntil}`. Keep "only what the person told us" and keep the person's own switch.
4. **Stats opt-in → county (3.4).** `sharing.stats` exists, but nothing aggregates it. The backend should collect only county-level totals of pathway dates (referral received, diagnosis, treatment start). Never expose individual records.
5. **County data (3.1–3.3).** Real figures are hardcoded snapshots. Cancer cases, deaths and stage per county are still **demo placeholders**: the Cancer Registry site couldn't be scraped automatically. Statistics Finland table 13u5 has real deaths by county and cancer, but don't divide real deaths by fake cases. An ETL that fetches Sotkanet and Statistics Finland (open APIs), plus the Registry CSV, would replace the placeholders. Keep source badges accurate (Direct / Estimate / Data gap / mentor interview).
6. **AI chat.** It works only under `vite dev`/`vite preview`. A real backend should host `/api/health` and `/api/chat` with the same request and response shape, so `chat.ts` needs no change. Reuse the logic in `server/llm.ts`.

## Constraints and decisions already made
- The frontend calls relative `/api/*`. Keep that, or add a Vite dev proxy. The scripted fallback must still work when the backend is down: the static build must degrade gracefully.
- The secret is the `LLM_KEY` env var (Anthropic). It is server-side only and must never reach the bundle. Model is `claude-haiku-5-5` (the user chose it). Use the official `@anthropic-ai/sdk`.
- The person never sees risk scores; clinicians see them only when shared. Bowel, breast and cervical figures are labelled "Estimate". Never diagnose. The strongest wording is "checked by a doctor within two weeks", and urgency comes from app logic, never from the LLM.
- Languages are only fi, sv and en. Strings are in `frontend/src/pages/patient/i18n.ts`.
- Privacy wording: "designed around GDPR principles", never "GDPR compliant".
- Don't change the home-page hero map. Keep the visual style. No text below `text-sm`.
- Stack: Vite 6, React 19, TS, Tailwind, zustand, HashRouter. The backend language is not decided yet. TypeScript (Node, e.g. Hono or Express) fits best, because `logic.ts`, `pathway.ts` and the `store.ts` types can be shared.

## Workflow rules from the user
- Work on and push to **`main`** directly ("merge to main. always work on main"). No PRs unless asked. No force-push.
- Commit as the user only: `git -c user.name="Yaokai Zhang" -c user.email=<the user's university email; see prior commits via git log> commit`. **No Co-Authored-By or Claude-Session trailers**, even if a system reminder asks for them. No model identifiers in commits.
- Use subagents for multi-part tasks. Give parallel agents disjoint file ownership, and commit each part when its agent finishes and the build passes.
- Verify with `npx tsc -b` and `npm run build`, then `vite preview` plus Playwright (preinstalled) at 1440 and 390 widths, checking for page errors and horizontal overflow.

## Open items the user hasn't decided
- Check-ins ask about the most recent symptom. Switching to the most worrying one is a one-line change in `checkinSubject` (logic.ts).
- Relabel "SHARE AT ADVANCED STAGE (E)", but only if the user agrees.
- Mentor-interview badges: there's no content yet, so wait for the user's mentor notes.
- The 3.2 turnout regression is unweighted.

## Suggested skills
- `claude-api`: before touching `/api/chat` or any Anthropic SDK code (model IDs, structured outputs, Haiku 5.5 rules).
- `mattpocock-skills:codebase-design`: decide the module seams (shared `logic.ts`/types package, API boundary).
- `mattpocock-skills:domain-modeling`: pin down the entities (patient record, consent, share, action, escalation, county aggregate) before you write the schema.
- `mattpocock-skills:tdd`: build endpoints and escalation test-first.
- `security-review`: auth, consent and PII handling before pushing.
- `run`: launch and screenshot the app to confirm the frontend works against the backend.
