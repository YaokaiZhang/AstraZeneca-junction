# Ajoissa: equal cancer care, in every county

Our entry for the AstraZeneca challenge "Equal Care Across Finland" (Junction 2026). Ajoissa is a screening monitor
for every wellbeing services county. For bowel, breast and cervical cancer screening, it shows where the county loses
people, compares each step with Finland, says what to do first, and writes a one-page plan for the county.

## Run it

```bash
cd frontend
npm install
LLM_KEY=sk-ant-... npm run dev      # http://localhost:5173
```

`LLM_KEY` is an Anthropic API key. It stays on the server (`frontend/server/llm.ts`, a Vite plugin that adds
`/api/briefing` and `/api/health`) and is never sent to the browser. Without it, everything still works: the plan
uses a fixed template briefing and says so.

Open `#/` for the landing page and `#/monitor` for the monitor. A county and programme can be linked directly, for
example `#/monitor?c=helsinki&p=breast` (`p` is `bowel`, `breast` or `cervical`).

## What it does

- **Three steps per programme**, county against Finland (2024 round):
  - Bowel: kit sent back, colonoscopy after a positive test, wait for the colonoscopy.
  - Breast: came for the mammogram, result on record, wait for further tests.
  - Cervical: came for the test, colposcopy on record, wait for colposcopy.
- **Where to start**: the step furthest past our warning line, or the reporting gap if follow-up figures are almost
  entirely missing from the register (shown as "check data", not as missed care).
- **What to do**: one proven action, who does it and how often, what it achieves (a published study's effect applied
  to the county's 2024 numbers, labelled as an estimate) and what it takes (extra tests or appointments a week).
- **One-page plan**: printable A4 with small charts. The AI writes a four-line briefing from our calculated figures
  and a few cited passages from approved sources (`frontend/knowledge/`). Every number and citation it writes is
  checked; if one doesn't match, the template briefing is used instead.
- **The evidence**: the numbers table with better or worse than Finland, the proven options, what we calculated
  ourselves, and every source with a link.

## Link to the National Cancer Strategy 2026–2035

- **Goal 2** (p. 5): 80% attendance in every screening programme in every county. This is the only official target
  the monitor shows.
- **Goal 3** (p. 5): patients reach treatment within target times. Time to treatment is not published by county, so
  the follow-up and wait steps (positive test to colonoscopy, further tests or colposcopy) are the closest public
  figures; bowel also shows the registry's count of people who started surgery or pre-surgery treatment.
- **Equality** (p. 5): regional differences used to steer services. Every figure is shown against Finland.

## What is real and what is not

- **Real, published data**: Finnish Cancer Registry screening statistics by county (2024 round; bowel also 2022 and
  2023), Statistics Finland population tables, the National Cancer Strategy and its implementation roadmap, and the
  published studies listed under "See the evidence". Waits were read from the Registry's charts (to about 0.1 month).
- **Our calculations**: the warning lines, the effect of each action on this county, what it takes, and the bowel
  2031 estimate. Each tab lists them under "What we calculated ourselves".
- **Demo only**: the nurse's daily follow-up list uses made-up people (it says so on screen). No patient-level or
  personal data is used anywhere.

## Tests

```bash
cd frontend
npm test        # screening calculations for all three programmes, and the AI briefing checks (retrieval, validation)
npm run lint
npm run build
```

After editing a source in `frontend/knowledge/sources/`, rebuild the retrieval index with `npm run rag:index`.

## Where things are

- `frontend/src/pages/monitor/`: the monitor. Data in `data.ts` (bowel), `breastData.ts`, `cervicalData.ts`;
  calculations in `model.ts` (bowel) and `programmes.ts` (breast, cervical); the plan in `ActionSheet.tsx` and
  `ProgrammeMonitor.tsx`.
- `frontend/server/`: the briefing endpoint and the retrieval and validation code (`server/rag/`).
- `frontend/knowledge/`: the approved sources the AI may cite.

## Earlier pages

The repository also holds earlier patient, hospital and county pages and their data scripts
(`frontend/scripts/`). They are hidden while `SHOW_FULL_STORY` is `false` in `frontend/src/config.ts`, and their
addresses redirect to the landing page. `docs/final-ideas.md` is the earlier draft of the idea, not the current spec.
