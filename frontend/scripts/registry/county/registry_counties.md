# Finnish Cancer Registry figures per wellbeing services county

File: `registry_counties.json`, in the same folder as this note.
Retrieved: 2026-11-14, by driving the Registry's Shiny app with headless Playwright.

## Source

- App: https://tilastot.syoparekisteri.fi/syovat/ . The English UI is `?_inputs_&language=%22en%22`, the iframe URL used on https://cancerregistry.fi/statistics/cancer-statistics/.
- The app's Help (`help_main_en.html`) gives the citation: "Finnish Cancer Registry, https://tilastot.syoparekisteri.fi/syovat, data from 2026-04-02, version 2026-04-22-001". Licence: CC BY 4.0.
- The latest final statistics year is 2024. Preliminary statistics cover up to 2025.
- I found no static CSV or Excel files with a county breakdown on cancerregistry.fi:
  - "Statistics by theme" has only childhood cancer and fact sheets.
  - "Cancer in Finland" offers annual PDF reports.
  - Everything regional lives in the Shiny app, which has its own .csv and .xlsx download buttons. I used those.
- Area menu: there are 21 wellbeing services counties plus "City of Helsinki" (code 10190), 5 collaborative areas, Åland and "Whole country". So Helsinki and the other four HUS-area counties each come separately. No hospital-district fallback was needed.

## Queries (Area = all 22 county codes + Whole country in every query)

| JSON field | "I am interested in" | "Show values categorised by" | "Show these values" | Sex | Sites |
|---|---|---|---|---|---|
| cases, incidence rates | New cancer cases (incidence) | Latest 5-year period (2020-2024) | Diagnosed cancer cases (the CSV also carries the rates) | Both together | Lung, trachea (C33-34); Colon and rectum (C18-20); Anus (C21); Pancreas (C25); Liver (C22) |
| same | same | same | same | Female | Breast (C50); Cervix uteri (C53) |
| deaths, mortality rates | Deaths due to cancer (Cancer mortality) | Latest 5-year period (2020-2024) | Cancer deaths | as above | as above |
| stageCounts, lateShare, unknownStageShare | Preliminary statistics 2025 (incidence) | Cancer stage (2021-2025) | Diagnosed cancer cases, preliminary | as above | as above |
| prelimCasesTotal5y_2021_2025 | Preliminary statistics 2025 (incidence) | Latest 5-year period (2021-2025) | Diagnosed cancer cases, preliminary | as above | as above |
| `_whole_country_final_stage_2020_2024` | New cancer cases (incidence) | Cancer stage (2020-2024) | Diagnosed cancer cases | as above | as above |

The raw CSV and XLSX downloads plus screenshots are in `scratchpad/agentA/raw/` (`inc_*`, `mort_*`, `pstage_*`, `pinc_*`, `stage_*`). Scripts: `scratchpad/agentA/run.js` (Playwright) and `scratchpad/agentA/build.py` (builds the JSON).

## Definitions

- **cases** = the app's "Diagnosed cancer cases" for 2020-2024 divided by 5. The app reports the 5-year total. I checked this: total ÷ (crude rate per 100,000 per year) = 5 × the population.
  - Region = municipality of residence at the start of the year of diagnosis.
  - Multiple primaries follow IARC rules.
- **deaths** = "Cancer deaths" for 2020-2024 divided by 5.
  - These are cause-of-death counts from Statistics Finland, allocated by region of residence in the year of death.
  - Deaths in a period are not the same people as the cases in that period.
- **breast**: women only (Sex = Female). Choosing "Both together" would add male breast cancer.
- **cervical**: C53, women.
- **bowel**: C18-C20 ("Colon and rectum"). Anus C21 is stored separately under `anusC21`. `casesC18_21` and `deathsC18_21` give the sum, if you prefer C18-C21.
- **Rates** (all per 100,000 per year, taken from the same CSVs):
  - `incCrudeRate`, `incASR_Finland2014`, `incASR_World`
  - `mortCrudeRate`, `mortASR_Finland2014`, `mortASR_World`
  - The age-standardised rates (Finland 2014 standard population) are the best county-to-county comparison the app offers.
- **expected**: null everywhere. The app publishes no expected counts or SIRs.

### Stage

- **What the Registry publishes.** "Cancer stage" has only three categories: **Localized**, **Non-localized** and **Unknown**.
  - It is not TNM. There is no III-IV or regional/distant split.
  - Neither the app Help nor the quality description defines the categories further. My reading of the Registry's traditional coding is that "Non-localized" lumps together regional lymph-node spread, distant metastasis and infiltration of neighbouring tissue. That is my interpretation, not a statement from the source.
- **County stage exists only in the preliminary statistics, 2021-2025.**
  - In the final statistics, the "Cancer stage (2020-2024)" tab disappears from the menu as soon as any region other than Whole country is chosen.
  - So county stage comes from the preliminary 2021-2025 data. The stage years are therefore shifted by one year from cases and deaths (2020-2024), and 2025 is preliminary.
  - National final 2020-2024 stage is stored in `_whole_country_final_stage_2020_2024`. It is within 2.5 percentage points of the preliminary national figures.
- **lateShare** = Non-localized / (Localized + Non-localized). Unknown stage is **excluded** from the denominator.
- **unknownStageShare** = Unknown / all cases in the preliminary 2021-2025 data. The stage rows add up exactly to the "Latest 5-year period (2021-2025)" total; I checked every cell.
- **nonLocalizedShareOfAllCases** = Non-localized / all cases. Treat it as a lower bound for "late".
- **Strong caveat: do not read lateShare as "share at stage III-IV".**
  - Unknown stage is very common: nationally 37-40% for breast, 54-57% for lung, bowel and cervix, 62-63% for pancreas and 84-85% for liver (final and preliminary data). By county it ranges from 14% to over 90%.
  - The 2023 Cancer in Finland report (section 4.4) explains why: stage comes from clinical cancer notifications, which the Registry receives for only about 40% of new cases. Unknown-stage share is therefore mostly a measure of how actively each county reports.
  - "Localized" is very rare for some sites nationally (bowel 924 vs 8,382 non-localized in 2020-2024; lung 815 vs 6,050; liver 77 vs 379). So "Non-localized" is much broader than TNM III-IV. For bowel and lung it will include many stage II and some stage I cases.
  - Breast (about 57% non-localized among known stage) and cervix (about 25%) look more plausible, but the same caveat applies.
- **Suggested use.** Use lateShare only as a relative, known-stage indicator, shown together with unknownStageShare. Or keep the app's placeholder clinical lateShare and show the Registry stage as context. Do not mix it with TNM-based numbers.

## Suppression and nulls

The Registry blanks every count of 1-4 to protect privacy. Those values are null in the JSON and were not back-calculated. The app still shows a rate for blanked counts; I did not use those rates to recover counts.

- **deaths = null** for cervical cancer in Itä-Uusimaa, Etelä-Karjala and Keski-Pohjanmaa: 1-4 deaths in 5 years, i.e. under 1 a year.
- **lateShare = null** for 41 of the 132 county × cancer cells, because Localized or Non-localized was blanked. Mostly liver, cervix and some pancreas cells, plus lung in Etelä-Karjala, Keski-Suomi, Pohjanmaa and Kainuu, and bowel in Keski-Suomi, Satakunta and Keski-Pohjanmaa.
  - For 38 of these, `lateShareBounds` = [min, max] gives the range implied by a blanked count of 1-4.
  - Kainuu liver, Kainuu cervix and Keski-Pohjanmaa cervix have both categories blanked, so no bounds.
- cases, unknownStageShare and the rates are filled for all 132 cells.

## Not obtained

- Expected counts or SIRs: not published by the app.
- TNM III-IV or a regional/distant split: not published. Only Localized / Non-localized / Unknown exists.
- County stage for the final 2020-2024 statistics: the app offers it only for Whole country. I used the preliminary 2021-2025 data instead.
- Åland is not one of the 22 ids. It is excluded, but it is counted in Whole country.

## JSON layout

- `<countyId>` → `<cancerId>` → `{cases, deaths, lateShare, unknownStageShare, years, stageYears, ...extras}`
  - County ids match `frontend/src/data/counties.ts`.
  - Cancer ids: lung, bowel, pancreas, liver, breast, cervical.
- `_whole_country` has the same structure for all of Finland.
- `_whole_country_final_stage_2020_2024`: national stage from the final statistics.
- `_meta`: definitions.
