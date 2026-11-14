// Breast cancer (mammography) screening, 2024 round, by wellbeing services county (hyvinvointialue).
// Source: Finnish Cancer Registry, "Rintasyövän seulontaohjelma: vuositilastot", published 2 July 2026.
//   https://stats.cancerregistry.fi/joukkistilastot/rinta.html  (English: .../breast.html)
// Retrieved 14 Nov 2026. Åland is excluded from the source's 2024 statistics.
// Columns invited … no_histology_pct come from the tables "Hyvinvointialueet > Seulontaketju 2024" and
// "Hyvinvointialueet > Seulontatulokset 2024"; they are copied verbatim except that decimal commas became
// points and "Helsingin kaupunki" / "Yhteensä" became "Helsinki" / "Finland" (the names used in data.ts).
// Each county column sums exactly to the Finland row.
// - recalled = "Kutsu varmistustutkimuksiin" (invited to diagnostic examinations), % of attendees.
// - referred = "Lähete erikoissairaanhoitoon" (referred to specialised care); the source labels its % as
//   "of examined", but it equals referred / recalled.
// - benign / malignant / other_cancer / no_histology are % of referred. malignant = screen-detected
//   invasive breast cancer or carcinoma in situ, from screening-registry data only (no Cancer Registry
//   linkage). no_histology ("Ei tietoa") = referred with no histology reported by spring 2026, i.e. an
//   indicator of follow-up data completeness (high in Satakunta 26.5 %, Varsinais-Suomi 8.4 %).
// - median_months_recall_to_exam_approx, p10/p90: median and 10th–90th percentile delay (months) from
//   positive screen to diagnostic examinations. Published only as a chart (PNG, "Viipeet
//   varmistutkimuksiin pääsyssä"); read from pixel positions (± ~0.01 month). The Finland row has only
//   the national median (dashed line); its p10/p90 are not shown, so they are empty.
// Not published by county: interval cancers / detection mode (national only), age split, cancer stage.

export const BREAST_YEAR = 2024
/** Women aged 50–69 (even birth-year cohorts 50, 52 … 68 invited in 2024); interval 2 years. */
export const BREAST_AGES = '50–69'
export const BREAST_SOURCE_URL = 'https://stats.cancerregistry.fi/joukkistilastot/rinta.html'
export const BREAST_PUBLISHED = '2026-07-02'
export const BREAST_RETRIEVED = '2026-11-14'

const BY_COUNTY = `county,invited,attended,attended_pct,recalled,recalled_pct,referred,referred_of_recalled_pct,benign,benign_pct,malignant,malignant_pct,other_cancer,other_cancer_pct,no_histology,no_histology_pct,median_months_recall_to_exam_approx,p10_months_approx,p90_months_approx
Etelä-Karjala,8466,7047,83.2,168,2.4,60,35.7,8,13.3,49,81.7,0,0.0,3,5.0,0.20,0.10,0.47
Etelä-Pohjanmaa,11844,10069,85.0,217,2.2,60,27.6,6,10.0,52,86.7,1,1.7,1,1.7,0.27,0.17,0.43
Etelä-Savo,9422,7741,82.2,217,2.8,78,35.9,21,26.9,55,70.5,0,0.0,2,2.6,0.70,0.40,1.26
Helsinki,38630,28686,74.3,1001,3.5,243,24.3,34,14.0,205,84.4,2,0.8,2,0.8,1.20,0.54,1.87
Itä-Uusimaa,6948,5546,79.8,158,2.8,34,21.5,7,20.6,25,73.5,1,2.9,1,2.9,0.50,0.20,0.87
Kainuu,4798,4033,84.1,134,3.3,28,20.9,8,28.6,17,60.7,0,0.0,3,10.7,0.23,0.13,0.47
Kanta-Häme,11355,9467,83.4,326,3.4,77,23.6,8,10.4,65,84.4,0,0.0,4,5.2,0.47,0.17,0.99
Keski-Pohjanmaa,3898,3329,85.4,117,3.5,39,33.3,8,20.5,27,69.2,0,0.0,4,10.3,0.47,0.23,0.77
Keski-Suomi,16537,14073,85.1,245,1.7,109,44.5,13,11.9,89,81.7,0,0.0,7,6.4,0.40,0.23,0.70
Keski-Uusimaa,13592,10944,80.5,594,5.4,88,14.8,14,15.9,68,77.3,1,1.1,5,5.7,0.63,0.37,1.13
Kymenlaakso,11143,9142,82.0,268,2.9,77,28.7,15,19.5,60,77.9,0,0.0,2,2.6,0.37,0.20,0.70
Lappi,11548,9678,83.8,254,2.6,78,30.7,32,41.0,42,53.8,0,0.0,4,5.1,0.60,0.27,0.93
Länsi-Uusimaa,30039,22860,76.1,700,3.1,176,25.1,32,18.2,132,75.0,1,0.6,11,6.2,0.73,0.40,1.37
Pirkanmaa,31677,26449,83.5,646,2.4,263,40.7,35,13.3,226,85.9,1,0.4,1,0.4,0.67,0.23,1.03
Pohjanmaa,9991,8487,84.9,194,2.3,76,39.2,15,19.7,61,80.3,0,0.0,0,0.0,0.23,0.13,0.43
Pohjois-Karjala,10619,8940,84.2,354,4.0,68,19.2,7,10.3,60,88.2,0,0.0,1,1.5,0.42,0.13,0.90
Pohjois-Pohjanmaa,23560,20168,85.6,470,2.3,183,38.9,41,22.4,140,76.5,0,0.0,2,1.1,0.83,0.20,1.67
Pohjois-Savo,16191,13785,85.1,480,3.5,135,28.1,29,21.5,103,76.3,2,1.5,1,0.7,0.53,0.20,1.10
Päijät-Häme,13832,11313,81.8,121,1.1,61,50.4,0,0.0,58,95.1,3,4.9,0,0.0,0.20,0.07,0.45
Satakunta,14090,11958,84.9,395,3.3,170,43.0,19,11.2,105,61.8,1,0.6,45,26.5,0.57,0.27,1.00
Vantaa ja Kerava,16057,12323,76.7,369,3.0,93,25.2,10,10.8,81,87.1,1,1.1,1,1.1,0.30,0.10,0.67
Varsinais-Suomi,30614,25331,82.7,848,3.3,262,30.9,55,21.0,184,70.2,1,0.4,22,8.4,0.53,0.23,1.33
Finland,344851,281369,81.6,8276,2.9,2458,29.7,417,17.0,1904,77.5,15,0.6,122,5.0,0.57,,`

const parse = (csv: string) => {
  const [head, ...rows] = csv.trim().split('\n')
  const keys = head.split(',')
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], v])) as Record<string, string>)
}
const num = (v: string | undefined): number | null => (v === undefined || v === '' ? null : +v)
const req = (v: string | undefined): number => {
  const n = num(v)
  if (n === null) throw new Error('breastData: missing required value')
  return n
}

export interface BreastRow {
  /** id in counties.ts ('finland' for the national row) */
  id: string
  name: string
  invited: number
  attended: number
  attendedPct: number
  /** invited to diagnostic examinations (recall) */
  recalled: number
  /** % of attendees */
  recalledPct: number
  /** referred to specialised healthcare */
  referred: number
  /** % of recalled */
  referredOfRecalledPct: number
  benign: number
  benignPct: number
  /** screen-detected breast cancers (invasive + in situ), screening-registry data */
  cancers: number
  cancersPct: number
  otherCancer: number
  otherCancerPct: number
  /** referred with no histology information (follow-up data gap) */
  noHistology: number
  noHistologyPct: number
  /** median months from positive screen to diagnostic examination, read from chart */
  medianMonthsToExam: number | null
  p10MonthsToExam: number | null
  p90MonthsToExam: number | null
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ ja /g, '-').replace(/\s+/g, '-')

const rows: BreastRow[] = parse(BY_COUNTY).map((r) => ({
  id: slug(r.county),
  name: r.county,
  invited: req(r.invited),
  attended: req(r.attended),
  attendedPct: req(r.attended_pct),
  recalled: req(r.recalled),
  recalledPct: req(r.recalled_pct),
  referred: req(r.referred),
  referredOfRecalledPct: req(r.referred_of_recalled_pct),
  benign: req(r.benign),
  benignPct: req(r.benign_pct),
  cancers: req(r.malignant),
  cancersPct: req(r.malignant_pct),
  otherCancer: req(r.other_cancer),
  otherCancerPct: req(r.other_cancer_pct),
  noHistology: req(r.no_histology),
  noHistologyPct: req(r.no_histology_pct),
  medianMonthsToExam: num(r.median_months_recall_to_exam_approx),
  p10MonthsToExam: num(r.p10_months_approx),
  p90MonthsToExam: num(r.p90_months_approx),
}))

export const BREAST: BreastRow[] = rows.filter((r) => r.id !== 'finland')
export const BREAST_FI: BreastRow = rows.find((r) => r.id === 'finland')!
export const breastById = (id: string) => BREAST.find((r) => r.id === id)

export interface BreastEvidence {
  id: string
  /** plain-English action */
  action: string
  /** plain-words effect */
  effect: string
  /** relative effect (RR or OR vs control), if reported */
  relative: number | null
  relativeKind: 'RR' | 'OR' | null
  /** absolute effect in percentage points, if reported */
  absolutePp: number | null
  citation: string
  url: string
}

// Each entry checked against its PubMed abstract (14 Nov 2026). Numbers are breast-screening specific.
export const BREAST_EVIDENCE: BreastEvidence[] = [
  {
    id: 'reminder-letter',
    action: 'Send a reminder letter to women who have not attended',
    effect: 'About 37 % more women attend than with the invitation alone (RR 1.37, 95% CI 1.25–1.51).',
    relative: 1.37,
    relativeKind: 'RR',
    absolutePp: null,
    citation:
      'Camilloni L, et al. Methods to increase participation in organised screening programs: a systematic review. BMC Public Health 2013;13:464. PMID 23663511',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23663511/',
  },
  {
    id: 'fixed-appointment',
    action: 'Give a pre-booked date and time in the invitation instead of asking women to book',
    effect: 'About 26 % more women attend than with an open invitation (RR 1.26, 95% CI 1.02–1.55).',
    relative: 1.26,
    relativeKind: 'RR',
    absolutePp: null,
    citation:
      'Camilloni L, et al. Methods to increase participation in organised screening programs: a systematic review. BMC Public Health 2013;13:464. PMID 23663511',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23663511/',
  },
  {
    id: 'gp-signature',
    action: "Have the woman's own GP sign the invitation letter",
    effect: 'About 13 % more women attend (RR 1.13, 95% CI 1.11–1.16).',
    relative: 1.13,
    relativeKind: 'RR',
    absolutePp: null,
    citation:
      'Camilloni L, et al. Methods to increase participation in organised screening programs: a systematic review. BMC Public Health 2013;13:464. PMID 23663511',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23663511/',
  },
  {
    id: 'phone-call',
    action: 'Phone women who are invited (alone or after the letter)',
    effect:
      'Phone call roughly doubles the odds of attending vs no active invitation (OR 1.94, 95% CI 1.70–2.23); letter plus phone call OR 2.53 (2.02–3.18).',
    relative: 1.94,
    relativeKind: 'OR',
    absolutePp: null,
    citation:
      'Bonfill X, Marzo M, Pladevall M, Martí J, Emparanza JI. Strategies for increasing women participation in community breast cancer screening. Cochrane Database Syst Rev 2001;(1):CD002943. PMID 11279781',
    url: 'https://doi.org/10.1002/14651858.CD002943',
  },
  {
    id: 'sms-reminder',
    action: 'Text-message reminder 48 h before the appointment',
    effect:
      'Attendance rose from 59.1 % to 64.4 % (+5.3 points, OR 1.26, 95% CI 1.05–1.48) in an RCT of 2,240 first-time invitees in London.',
    relative: 1.26,
    relativeKind: 'OR',
    absolutePp: 5.3,
    citation:
      'Kerrison RS, Shukla H, Cunningham D, Oyebode O, Friedman E. Text-message reminders increase uptake of routine breast screening appointments: a randomised controlled trial in a hard-to-reach population. Br J Cancer 2015;112(6):1005-10. PMID 25668008',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25668008/',
  },
]
