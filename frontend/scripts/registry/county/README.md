# Cancer Registry figures by county

- `run.cjs` (with `lib.cjs`) downloads cases, deaths and stage per wellbeing services county from the Registry's
  statistics app into `raw/`: `node run.cjs raw`. `build.py raw registry_counties.json` builds the JSON.
- `age_rates.cjs` downloads national incidence by 5-year age band and sex, 2020–2024: `node age_rates.cjs raw`.
- `registry_counties.md` lists the exact queries, years, definitions and gaps.
- `../../build_cancer_data.py` turns these and the Statistics Finland population into `src/data/registry.generated.ts`.

Stage is only "localized / non-localized / unknown", and county stage exists only in the preliminary 2021–2025
statistics. Unknown stage is 14–90% by county, so the app treats the spread share as context, not a TNM III–IV figure.
