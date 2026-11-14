# Ajoissa — cancer, on time

Hackathon prototype for the AstraZeneca challenge. Spec: `docs/final-ideas.md`. Visual reference: `docs/design/reference.html`.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL. Three pages: `#/patient`, `#/hospital`, `#/county`.

Everything runs in the browser (localStorage key `ajoissa-v1`). County figures are real published data: Finnish Cancer Registry cases, deaths and stage, Statistics Finland population and income, THL Sotkanet screening turnout, risk factors and waiting lists. Hospital patients and the moving map on the home page are simulated. Every number carries a source badge that says which. "Reset demo" in the sidebar clears everything.

## Quick test path

1. Patient → **Load example** → Pathway tab shows an overdue referral → pick a reason → copy the drafted message.
2. Patient → Privacy → share with hospital.
3. Hospital → your record appears at the top as **You** → open it to see the shared diary and risk.
4. County → click any tile → brief → print.

## Rebuild data

```bash
cd frontend/scripts/registry/county
node run.cjs raw && python3 build.py raw registry_counties.json   # Cancer Registry, by county
node age_rates.cjs raw                                             # national rates by age and sex
cd ../../..                                                        # back to frontend/
python3 scripts/fetch_statfin.py                                   # Statistics Finland population
python3 scripts/build_cancer_data.py                               # writes src/data/registry.generated.ts
```

THL Sotkanet values in `src/data/counties.ts` and `src/pages/county/towns.ts` (turnout, risk factors, waiting lists) and the Statistics Finland projection and town figures were pulled once from the open APIs on 14 Nov 2026; there is no script for them.
