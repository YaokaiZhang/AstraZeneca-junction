# Finnish cancer incidence by age and sex (2020–2024)

Data file: `incidence_age_sex.json` (same folder).

## Source
- Finnish Cancer Registry, Cancer statistics application (R Shiny): https://tilastot.syoparekisteri.fi/syovat/ (linked from https://cancerregistry.fi/statistics/). I used this source; NORDCAN was not needed.
- Retrieved on 2026-11-14 with headless Playwright (scripts: `fetch.js`, `build.py`). The raw CSV downloads (the app's ".CSV" button, wide table, `;`-separated, decimal comma) and screenshots are in `raw/`.
- Area: Whole country. Sex: Male and Female, each separately.
- Period: **2020–2024**, the latest 5-year period the app offers. Rates are per 100 000 person-years (per 100 000 per year). Counts in the raw files are totals for the whole 5-year period.

## Queries (I am interested in → Show values categorised by → Show these values)
| raw file | theme | tab | value |
|---|---|---|---|
| inc_ag5_rate.csv | New cancer cases (incidence) | Age group (5y.) (2020-2024) | Rate per 100,000 (CSV also has cases) |
| inc_ag5_all.csv | same, site = All cancers combined | Age group (5y.) | Rate + cases (used only to get person-years) |
| inc_latest5.csv | incidence | Latest 5-year period (2020-2024) | cases, crude rate, age-standardised rates |
| inc_stage.csv | incidence | Cancer stage (2020-2024) | cases by stage |
| mort_latest5.csv | Deaths due to cancer (Cancer mortality) | Latest 5-year period (2020-2024) | deaths, rates |
| mort_ag5.csv | mortality | Age group (5y.) (2020-2024) | mortality rate + deaths |

## Definitions
- `bowel` = Colon and rectum, **ICD-10 C18–20** (the registry's own grouping). Anus (C21) is published as a separate site and is stored as `anus`. `bowel_C18_21` is a **derived** sum of the C18–20 and C21 rates. The two can be added because they share the same population denominator. C21 adds only about 1–2 per 100 000 at older ages.
- `breast` = C50 (women and men). `cervical` = Cervix uteri C53 (women only). `lung` = Lung, trachea C33–34.
- `rate5`: the published crude age-specific rates for 18 bands, 0–4 … 85+.
- `rate10`: the app's 9 bands, 0–9 … 70–79, 80+ (80+ = 80–84 and 85+). Each value is a **population-weighted** mean of the two 5-year rates. The weights are person-years per sex and 5-year band, calculated as cases ÷ rate × 100 000 from the registry's all-sites table for 2020–2024 (stored in `person_years_2020_2024`). They add up to about 2.81 M women and 2.75 M men per year, which matches Finland's population. Because the inputs are rounded to 2 decimals, rate10 carries rounding error of about ±0.01.
- `count5_total`: number of cases over 2020–2024. `null` means the registry suppressed the count; it shows "-" for counts of 1–4, and the smallest count shown anywhere is 5. The rate is still published for those cells, so `rate5` has no gaps.
- `national[cancer][sex]`: `cases_per_year` = the 2020–2024 total ÷ 5, and `deaths_per_year` works the same way. The block also has crude and age-standardised rates (Finland 2014 and World 1966 standards). `stage_2020_2024` gives counts in the registry's three stage categories: **localized / non-localized / unknown**. `stage_share` is the share of all cases. `stage_share_of_known` leaves out unknown.
- `mortality_by_age`: age-specific mortality rates. This is extra data with the same structure as `incidence`.

## Headline numbers (cases per year, 2020–2024 mean)
Bowel C18–20: 1863 women and 2221 men. Breast: 5062 women and 29.8 men. Cervix: 200. Lung: 1214 women and 1780 men.
Deaths per year: bowel 648 women and 757 men; breast 903 women; cervix 51; lung 876 women and 1427 men.

## Gaps and caveats
- Stage is "unknown" for about 54% of bowel cases and about 54% of male lung cases in the registry stage table. The localized vs non-localized split covers only cases with known stage, so treat it with care. The registry offers no TNM stage.
- Male cervical cancer does not exist and is not in the file. Male breast rates are real but very small.
- These are crude age-specific rates for the period. They are not projections.
- I estimated no values. The only derived numbers are person-years (cases ÷ rate), the 10-year collapse, the C18–21 sum, the per-year means and the stage shares.
