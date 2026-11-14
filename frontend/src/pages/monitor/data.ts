// Bowel cancer screening, 2024 round. Finnish Cancer Registry annual statistics, published 20 May 2026.
// https://stats.cancerregistry.fi/joukkistilastot/suolisto.html
// The CSVs are kept verbatim so they can be checked against the source line by line.
// median_months_positive_to_colonoscopy_approx was read by eye from a chart (± 0.1 month).
import DEMOGRAPHICS_CSV from '../../data/county_demographics_2025.csv?raw'
import ROUNDS_CSV from '../../data/bowel_screening_2022_2023.csv?raw'

const BY_COUNTY = `county,invited,participated,participation_pct,test_positive,positive_pct,colonoscopy_done,colonoscopy_of_positives_pct,no_colonoscopy_n,surgery_or_neoadjuvant,cancers_found,advanced_precursors,median_months_positive_to_colonoscopy_approx
Etelä-Karjala,11131,8241,74.0,375,4.6,284,75.7,91,20,14,114,1.7
Etelä-Pohjanmaa,15941,11899,74.6,588,4.9,481,81.8,107,18,19,171,1.5
Etelä-Savo,13122,10093,76.9,441,4.4,339,76.9,102,14,17,98,1.0
Helsinki,42015,29226,69.6,1284,4.4,870,67.8,414,46,38,408,3.4
Itä-Uusimaa,7884,5679,72.0,261,4.6,171,65.5,90,10,11,52,2.7
Kainuu,7009,5362,76.5,280,5.2,182,65.0,98,8,2,58,2.7
Kanta-Häme,14399,10705,74.3,544,5.1,406,74.6,138,29,11,151,1.8
Keski-Pohjanmaa,4928,3612,73.3,168,4.7,125,74.4,43,9,8,61,1.6
Keski-Suomi,21191,16219,76.5,669,4.1,506,75.6,163,43,29,151,1.7
Keski-Uusimaa,15179,11236,74.0,567,5.0,398,70.2,169,13,12,98,0.8
Kymenlaakso,14431,10098,70.0,496,4.9,308,62.1,188,19,16,112,1.9
Lappi,16183,11925,73.7,571,4.8,415,72.7,156,15,10,133,2.4
Länsi-Uusimaa,32139,22976,71.5,946,4.1,705,74.5,241,49,34,294,2.8
Pirkanmaa,37764,28058,74.3,1236,4.4,868,70.2,369,44,31,303,1.9
Pohjanmaa,12299,9334,75.9,418,4.5,308,73.7,110,11,9,147,2.5
Pohjois-Karjala,14800,10833,73.2,425,3.9,338,79.5,87,14,10,87,1.7
Pohjois-Pohjanmaa,29646,22423,75.6,953,4.3,701,73.6,252,43,26,218,1.8
Pohjois-Savo,21844,16465,75.4,739,4.5,513,69.4,226,16,19,183,3.7
Päijät-Häme,17272,12996,75.2,565,4.3,402,71.2,163,22,14,215,3.7
Satakunta,18076,13115,72.6,693,5.3,499,72.0,194,19,14,105,1.8
Vantaa ja Kerava,17443,12433,71.3,604,4.9,441,73.0,163,22,19,217,3.6
Varsinais-Suomi,36669,26943,73.5,1260,4.7,984,78.1,276,64,50,448,1.0
Finland,421365,309871,73.5,14083,4.5,10244,72.7,3840,548,413,3824,1.9`

const BY_GROUP = `dimension,group,invited,participated,participation_pct,test_positive,positive_pct,colonoscopy_done,colonoscopy_of_positives_pct
sex,Men,205202,141922,69.2,8074,5.7,5832,72.2
sex,Women,216163,167949,77.7,6009,3.6,4412,73.4
age,60,72846,49916,68.5,2190,4.4,1754,80.1
age,62,72120,50538,70.1,2028,4.0,1478,72.9
age,64,70582,51480,72.9,2161,4.2,1542,71.4
age,66,66974,50556,75.5,2395,4.7,1725,72.0
age,68,70306,54216,77.1,2539,4.7,1820,71.7
age,70,68537,53165,77.6,2770,5.2,1925,69.5
mother_tongue,Finnish/Swedish/Sami,401645,299347,74.5,13588,4.5,9903,72.9
mother_tongue,Other or missing,19720,10524,53.4,495,4.7,341,68.9
education,Basic or unknown,68571,42155,61.5,2460,5.8,1653,67.2
education,Upper secondary,191571,139923,73.0,6911,4.9,5034,72.8
education,Higher,161223,127793,79.3,4712,3.7,3557,75.5
birth_region,Africa,1453,588,40.5,22,3.7,15,68.2
birth_region,Americas,837,464,55.4,16,3.4,12,75.0
birth_region,Asia,3889,2156,55.4,106,4.9,76,71.7
birth_region,Other Europe,14654,8301,56.6,384,4.6,261,68.0
birth_region,Finland,400375,298265,74.5,13554,4.5,9879,72.9
previous_round_men,Negative,116319,105559,90.7,,,,
previous_round_men,Did not take part,43362,7583,17.5,,,,
previous_round_men,First invitation,37392,23185,62.0,,,,
previous_round_women,Negative,140507,129971,92.5,,,,
previous_round_women,Did not take part,32404,6169,19.0,,,,
previous_round_women,First invitation,37631,27837,74.0,,,,`

const parse = (csv: string) => {
  const [head, ...rows] = csv.trim().split('\n')
  const keys = head.split(',')
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], v])) as Record<string, string>)
}
const num = (v: string | undefined) => (v === undefined || v === '' ? NaN : +v)

export interface ScreeningRow {
  /** id in counties.ts ('finland' for the national row) */
  id: string
  name: string
  invited: number
  participated: number
  participationPct: number
  testPositive: number
  positivePct: number
  colonoscopyDone: number
  colonoscopyOfPositivesPct: number
  noColonoscopy: number
  surgery: number
  cancers: number
  precursors: number
  medianMonths: number
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ ja /g, '-').replace(/\s+/g, '-')

const rows: ScreeningRow[] = parse(BY_COUNTY).map((r) => ({
  id: slug(r.county),
  name: r.county,
  invited: num(r.invited),
  participated: num(r.participated),
  participationPct: num(r.participation_pct),
  testPositive: num(r.test_positive),
  positivePct: num(r.positive_pct),
  colonoscopyDone: num(r.colonoscopy_done),
  colonoscopyOfPositivesPct: num(r.colonoscopy_of_positives_pct),
  noColonoscopy: num(r.no_colonoscopy_n),
  surgery: num(r.surgery_or_neoadjuvant),
  cancers: num(r.cancers_found),
  precursors: num(r.advanced_precursors),
  medianMonths: num(r.median_months_positive_to_colonoscopy_approx),
}))

export const SCREENING: ScreeningRow[] = rows.filter((r) => r.id !== 'finland')
export const SCREENING_FI: ScreeningRow = rows.find((r) => r.id === 'finland')!
export const screeningById = (id: string) => SCREENING.find((r) => r.id === id)

export interface GroupRow {
  dimension: string
  group: string
  invited: number
  participated: number
  participationPct: number
  colonoscopyOfPositivesPct: number
}
export const GROUPS: GroupRow[] = parse(BY_GROUP).map((r) => ({
  dimension: r.dimension,
  group: r.group,
  invited: num(r.invited),
  participated: num(r.participated),
  participationPct: num(r.participation_pct),
  colonoscopyOfPositivesPct: num(r.colonoscopy_of_positives_pct),
}))

/** People who tested positive in the 2022 round, skipped colonoscopy and were later diagnosed with bowel cancer. */
export const MISSED_CANCERS_2022 = 87

// ----- county population mix, 2025 (Statistics Finland PxWeb vaerak/11rz and vkour/12bq, municipalities rolled up to counties) -----

export interface Demographics {
  id: string
  name: string
  /** residents aged 56–74, the screening target group from 2031 */
  pop5674: number
  /** % of residents aged 56–74 whose mother tongue is not Finnish, Swedish or Sami */
  foreignLangPct: number
  basicEduPct: number
  upperSecPct: number
  higherEduPct: number
  /** kit return expected from the language mix alone, at national 2024 group rates */
  expectedByLanguage: number
  /** kit return expected from the education mix alone, at national 2024 group rates */
  expectedByEducation: number
  actual2024: number
}

const demoRows: Demographics[] = parse(DEMOGRAPHICS_CSV).map((r) => ({
  id: slug(r.county),
  name: r.county,
  pop5674: num(r.pop_56_74),
  foreignLangPct: num(r.foreign_lang_pct_56_74),
  basicEduPct: num(r.basic_edu_pct_60_74),
  upperSecPct: num(r.upper_sec_pct),
  higherEduPct: num(r.higher_edu_pct),
  expectedByLanguage: num(r.expected_part_by_language),
  expectedByEducation: num(r.expected_part_by_education),
  actual2024: num(r.actual_part_2024),
}))
export const DEMOGRAPHICS: Demographics[] = demoRows.filter((d) => d.id !== 'finland')
export const DEMOGRAPHICS_FI: Demographics = demoRows.find((d) => d.id === 'finland')!
export const demographicsById = (id: string) => (id === 'finland' ? DEMOGRAPHICS_FI : DEMOGRAPHICS.find((d) => d.id === id))

// ----- earlier rounds, 2022 and 2023 (Cancer Registry) -----

export interface RoundRow {
  year: number
  id: string
  name: string
  invited: number
  participationPct: number
  testPositive: number
  colonoscopyDone: number
  colonoscopyOfPositivesPct: number
  noColonoscopy: number
}

export const ROUNDS: RoundRow[] = parse(ROUNDS_CSV).map((r) => ({
  year: num(r.year),
  id: slug(r.county),
  name: r.county,
  invited: num(r.invited),
  participationPct: num(r.participation_pct),
  testPositive: num(r.test_positive),
  colonoscopyDone: num(r.colonoscopy_done),
  colonoscopyOfPositivesPct: num(r.colonoscopy_of_positives_pct),
  noColonoscopy: num(r.no_colonoscopy_n),
}))

export interface YearPoint { year: number; participationPct: number; colonoscopyOfPositivesPct: number; noColonoscopy: number }

/** 2022, 2023 and 2024 for one county (or 'finland'). */
export function trend(id: string): YearPoint[] {
  const now = id === 'finland' ? SCREENING_FI : screeningById(id)
  const past = ROUNDS.filter((x) => x.id === id).sort((a, b) => a.year - b.year)
  return [
    ...past.map(({ year, participationPct, colonoscopyOfPositivesPct, noColonoscopy }) => ({ year, participationPct, colonoscopyOfPositivesPct, noColonoscopy })),
    ...(now ? [{ year: 2024, participationPct: now.participationPct, colonoscopyOfPositivesPct: now.colonoscopyOfPositivesPct, noColonoscopy: now.noColonoscopy }] : []),
  ]
}

/** Place of a county among all counties in one year, 1 = highest value. */
export function rankIn(year: number, id: string, key: 'participationPct' | 'colonoscopyOfPositivesPct') {
  const all = year === 2024 ? SCREENING : ROUNDS.filter((x) => x.year === year && x.id !== 'finland')
  const sorted = [...all].sort((a, b) => b[key] - a[key])
  return { rank: sorted.findIndex((x) => x.id === id) + 1, of: sorted.length }
}
