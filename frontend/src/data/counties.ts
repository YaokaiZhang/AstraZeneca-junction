// 21 wellbeing services counties + City of Helsinki.
// REAL (see REAL below): population, age mix and the 2025 → 2035 ageing forecast (Statistics Finland 14wx),
// screening turnout 2024, risk factors 2024 and specialist waiting lists 2022–25 (THL Sotkanet).
// DEMO VALUES: cancer cases, deaths and stage per county are placeholders generated below until the
// Cancer Registry CSV pull is wired in (its statistics app is not scriptable from here).
import { mulberry32 } from '../lib/random'

export type CancerId = 'lung' | 'bowel' | 'pancreas' | 'liver'
export const CANCERS: { id: CancerId; label: string; ratePer100k: number; fatality: number; lateShare: number }[] = [
  { id: 'lung', label: 'Lung', ratePer100k: 50, fatality: 0.82, lateShare: 0.62 },
  { id: 'bowel', label: 'Bowel', ratePer100k: 64, fatality: 0.36, lateShare: 0.45 },
  { id: 'pancreas', label: 'Pancreas', ratePer100k: 26, fatality: 0.9, lateShare: 0.78 },
  { id: 'liver', label: 'Liver', ratePer100k: 11, fatality: 0.85, lateShare: 0.66 },
]

/** Cancers with a national screening programme that are not in CANCERS. Used by the detection radar (3.1). */
export type ScreenCancerId = 'breast' | 'cervical'
export type RadarCancerId = CancerId | ScreenCancerId
export const SCREEN_CANCERS: { id: ScreenCancerId; label: string; ratePer100k: number; fatality: number; lateShare: number }[] = [
  // rates per 100k of the whole population (women only get them): ~5 000 and ~180 cases a year in Finland
  { id: 'breast', label: 'Breast', ratePer100k: 90, fatality: 0.17, lateShare: 0.2 },
  { id: 'cervical', label: 'Cervical', ratePer100k: 3.3, fatality: 0.34, lateShare: 0.4 },
]

export interface CancerFigures {
  /** new cases per year, mean of last 5 years */
  cases: number
  /** deaths per year, mean of last 5 years */
  deaths: number
  /** share found at stage III–IV */
  lateShare: number
  /** cases expected from the county's age and risk-factor mix */
  expected: number
}

export interface County {
  id: string
  name: string
  /** tile-map position */
  col: number
  row: number
  population: number
  share50to74: number
  share75plus: number
  smoking: number
  alcohol: number
  obesity: number
  inactivity: number
  bowelTurnout: number
  breastTurnout: number
  cervicalTurnout: number
  /**
   * Patients who waited over 6 months for specialist care during the year, per 10 000 residents,
   * 2022–2025 (Sotkanet 3336). null where THL publishes no full series (HUS-area counties, Helsinki).
   */
  queueTrend: number[] | null
  /** people 75+ in 2035 ÷ people 75+ in 2025 (Statistics Finland projection 2024, table 14wx) */
  ageingIndex: number
  /** people under 75 in 2035 ÷ in 2025 (same table) */
  under75Index: number
  cancers: Record<CancerId, CancerFigures>
  /** breast + cervical, for the detection radar */
  screenCancers: Record<ScreenCancerId, CancerFigures>
}

const RAW: [string, string, number, number, number][] = [
  ['lappi', 'Lappi', 2, 0, 176_000],
  ['pohjois-pohjanmaa', 'Pohjois-Pohjanmaa', 1, 1, 416_000],
  ['kainuu', 'Kainuu', 2, 1, 70_000],
  ['pohjanmaa', 'Pohjanmaa', 0, 2, 176_000],
  ['keski-pohjanmaa', 'Keski-Pohjanmaa', 1, 2, 78_000],
  ['pohjois-savo', 'Pohjois-Savo', 2, 2, 248_000],
  ['pohjois-karjala', 'Pohjois-Karjala', 3, 2, 163_000],
  ['etela-pohjanmaa', 'Etelä-Pohjanmaa', 0, 3, 190_000],
  ['keski-suomi', 'Keski-Suomi', 1, 3, 275_000],
  ['etela-savo', 'Etelä-Savo', 2, 3, 130_000],
  ['satakunta', 'Satakunta', 0, 4, 214_000],
  ['pirkanmaa', 'Pirkanmaa', 1, 4, 535_000],
  ['paijat-hame', 'Päijät-Häme', 2, 4, 205_000],
  ['etela-karjala', 'Etelä-Karjala', 3, 4, 125_000],
  ['varsinais-suomi', 'Varsinais-Suomi', 0, 5, 490_000],
  ['kanta-hame', 'Kanta-Häme', 1, 5, 170_000],
  ['keski-uusimaa', 'Keski-Uusimaa', 2, 5, 202_000],
  ['kymenlaakso', 'Kymenlaakso', 3, 5, 160_000],
  ['lansi-uusimaa', 'Länsi-Uusimaa', 1, 6, 485_000],
  ['vantaa-kerava', 'Vantaa-Kerava', 2, 6, 285_000],
  ['ita-uusimaa', 'Itä-Uusimaa', 3, 6, 99_000],
  ['helsinki', 'Helsinki', 2, 7, 675_000],
]


type RealFields = Pick<County, 'population' | 'share50to74' | 'share75plus' | 'ageingIndex' | 'under75Index' | 'bowelTurnout' |
  'breastTurnout' | 'cervicalTurnout' | 'smoking' | 'alcohol' | 'obesity' | 'inactivity' | 'queueTrend'>

/**
 * Published figures per county, pulled from the open APIs on 14 Nov 2026.
 * - population, share50to74, share75plus: Statistics Finland projection 2024 (table 14wx), year 2025, summed over the county's municipalities
 * - ageingIndex / under75Index: same table, 2035 ÷ 2025
 * - bowel / breast / cervical turnout: THL Sotkanet 6103 / 3621 / 3620, 2024, % of invited who attended
 * - smoking 4404 (daily smokers %), alcohol 4411 (drinks too much, AUDIT-C %), obesity 4459 (BMI ≥ 30 %),
 *   inactivity 5527 (below activity recommendation %): THL Sotkanet, 2024, adults 20+
 * - queueTrend: THL Sotkanet 3336, 2022–2025
 */
export const REAL: Record<string, RealFields> = {
  'lappi': { population: 175645, share50to74: 0.335, share75plus: 0.132, ageingIndex: 1.270, under75Index: 0.943, bowelTurnout: 73.7, breastTurnout: 83.8, cervicalTurnout: 79.9, smoking: 11.4, alcohol: 33.6, obesity: 27.9, inactivity: 56.3, queueTrend: [7.2, 19.0, 12.8, 9.4] },
  'pohjois-pohjanmaa': { population: 421820, share50to74: 0.281, share75plus: 0.104, ageingIndex: 1.316, under75Index: 0.994, bowelTurnout: 75.6, breastTurnout: 85.6, cervicalTurnout: 73.6, smoking: 9.5, alcohol: 29.7, obesity: 25.8, inactivity: 56.5, queueTrend: [33.4, 74.2, 79.5, 89.5] },
  'kainuu': { population: 69197, share50to74: 0.357, share75plus: 0.150, ageingIndex: 1.211, under75Index: 0.880, bowelTurnout: 76.5, breastTurnout: 84.1, cervicalTurnout: 78.5, smoking: 8.9, alcohol: 29.2, obesity: 26.7, inactivity: 61.0, queueTrend: [34.8, 43.2, 49.9, 43.5] },
  'pohjanmaa': { population: 179396, share50to74: 0.282, share75plus: 0.126, ageingIndex: 1.152, under75Index: 1.006, bowelTurnout: 75.9, breastTurnout: 84.9, cervicalTurnout: 72.4, smoking: 7.7, alcohol: 20.5, obesity: 24.3, inactivity: 58.3, queueTrend: [14.6, 23.2, 14.7, 15.5] },
  'keski-pohjanmaa': { population: 67590, share50to74: 0.294, share75plus: 0.131, ageingIndex: 1.188, under75Index: 0.944, bowelTurnout: 73.3, breastTurnout: 85.4, cervicalTurnout: 69.2, smoking: 8.7, alcohol: 27.3, obesity: 24.7, inactivity: 62.0, queueTrend: [28.6, 40.6, 19.1, 17.8] },
  'pohjois-savo': { population: 248516, share50to74: 0.328, share75plus: 0.135, ageingIndex: 1.261, under75Index: 0.961, bowelTurnout: 75.4, breastTurnout: 85.1, cervicalTurnout: 70.0, smoking: 9.0, alcohol: 29.9, obesity: 27.7, inactivity: 58.2, queueTrend: [48.3, 75.3, 98.1, 69.5] },
  'pohjois-karjala': { population: 161591, share50to74: 0.334, share75plus: 0.142, ageingIndex: 1.259, under75Index: 0.924, bowelTurnout: 73.2, breastTurnout: 84.2, cervicalTurnout: 68.0, smoking: 10.0, alcohol: 29.5, obesity: 25.5, inactivity: 59.3, queueTrend: [43.2, 70.8, 68.1, 99.0] },
  'etela-pohjanmaa': { population: 189225, share50to74: 0.322, share75plus: 0.139, ageingIndex: 1.211, under75Index: 0.925, bowelTurnout: 74.6, breastTurnout: 85.0, cervicalTurnout: 82.3, smoking: 7.6, alcohol: 27.9, obesity: 30.1, inactivity: 62.7, queueTrend: [6.6, 10.8, 18.6, 15.6] },
  'keski-suomi': { population: 274002, share50to74: 0.301, share75plus: 0.127, ageingIndex: 1.224, under75Index: 0.971, bowelTurnout: 76.5, breastTurnout: 85.1, cervicalTurnout: 70.7, smoking: 7.6, alcohol: 27.8, obesity: 25.3, inactivity: 54.9, queueTrend: [43.3, 48.6, 71.7, 55.5] },
  'etela-savo': { population: 126414, share50to74: 0.372, share75plus: 0.173, ageingIndex: 1.190, under75Index: 0.875, bowelTurnout: 76.9, breastTurnout: 82.2, cervicalTurnout: 82.3, smoking: 7.2, alcohol: 29.7, obesity: 25.9, inactivity: 62.3, queueTrend: [3.3, 9.0, 10.5, 9.9] },
  'satakunta': { population: 209539, share50to74: 0.332, share75plus: 0.152, ageingIndex: 1.124, under75Index: 0.920, bowelTurnout: 72.6, breastTurnout: 84.9, cervicalTurnout: 71.3, smoking: 12.5, alcohol: 34.9, obesity: 29.5, inactivity: 63.3, queueTrend: [24.0, 36.4, 48.8, 36.6] },
  'pirkanmaa': { population: 549930, share50to74: 0.282, share75plus: 0.115, ageingIndex: 1.230, under75Index: 1.057, bowelTurnout: 74.3, breastTurnout: 83.5, cervicalTurnout: 71.5, smoking: 7.4, alcohol: 33.7, obesity: 23.0, inactivity: 62.4, queueTrend: [21.5, 21.0, 21.4, 7.7] },
  'paijat-hame': { population: 204183, share50to74: 0.336, share75plus: 0.149, ageingIndex: 1.182, under75Index: 0.951, bowelTurnout: 75.2, breastTurnout: 81.8, cervicalTurnout: 68.9, smoking: 9.9, alcohol: 33.3, obesity: 25.8, inactivity: 59.3, queueTrend: [27.0, 46.3, 53.1, 27.7] },
  'etela-karjala': { population: 124343, share50to74: 0.342, share75plus: 0.151, ageingIndex: 1.169, under75Index: 0.923, bowelTurnout: 74.0, breastTurnout: 83.2, cervicalTurnout: 75.8, smoking: 10.1, alcohol: 34.2, obesity: 20.7, inactivity: 58.4, queueTrend: [0.4, 2.9, 9.3, 14.1] },
  'varsinais-suomi': { population: 497911, share50to74: 0.299, share75plus: 0.126, ageingIndex: 1.214, under75Index: 1.032, bowelTurnout: 73.5, breastTurnout: 82.7, cervicalTurnout: 77.6, smoking: 10.2, alcohol: 31.3, obesity: 27.2, inactivity: 60.5, queueTrend: [19.8, 47.1, 67.4, 50.0] },
  'kanta-hame': { population: 169035, share50to74: 0.338, share75plus: 0.141, ageingIndex: 1.232, under75Index: 0.951, bowelTurnout: 74.3, breastTurnout: 83.4, cervicalTurnout: 70.4, smoking: 10.2, alcohol: 28.6, obesity: 28.4, inactivity: 58.2, queueTrend: [28.1, 54.0, 69.5, 44.5] },
  'keski-uusimaa': { population: 209367, share50to74: 0.310, share75plus: 0.101, ageingIndex: 1.385, under75Index: 1.049, bowelTurnout: 74.0, breastTurnout: 80.5, cervicalTurnout: 75.9, smoking: 9.3, alcohol: 29.2, obesity: 28.1, inactivity: 55.9, queueTrend: null },
  'kymenlaakso': { population: 155615, share50to74: 0.357, share75plus: 0.159, ageingIndex: 1.142, under75Index: 0.875, bowelTurnout: 70.0, breastTurnout: 82.0, cervicalTurnout: 76.5, smoking: 12.0, alcohol: 34.9, obesity: 27.8, inactivity: 60.0, queueTrend: [5.7, 6.4, 28.2, 7.9] },
  'lansi-uusimaa': { population: 510586, share50to74: 0.276, share75plus: 0.093, ageingIndex: 1.281, under75Index: 1.100, bowelTurnout: 71.5, breastTurnout: 76.1, cervicalTurnout: 73.6, smoking: 8.0, alcohol: 24.4, obesity: 20.9, inactivity: 57.8, queueTrend: null },
  'vantaa-kerava': { population: 296810, share50to74: 0.256, share75plus: 0.080, ageingIndex: 1.262, under75Index: 1.125, bowelTurnout: 71.3, breastTurnout: 76.7, cervicalTurnout: 70.7, smoking: 12.5, alcohol: 29.2, obesity: 23.2, inactivity: 57.7, queueTrend: null },
  'ita-uusimaa': { population: 100067, share50to74: 0.334, share75plus: 0.120, ageingIndex: 1.271, under75Index: 1.018, bowelTurnout: 72.0, breastTurnout: 79.8, cervicalTurnout: 75.7, smoking: 10.7, alcohol: 27.9, obesity: 25.9, inactivity: 60.5, queueTrend: null },
  'helsinki': { population: 697135, share50to74: 0.251, share75plus: 0.088, ageingIndex: 1.210, under75Index: 1.109, bowelTurnout: 69.6, breastTurnout: 74.3, cervicalTurnout: 71.4, smoking: 6.8, alcohol: 29.2, obesity: 17.3, inactivity: 52.9, queueTrend: null },
}

/** Whole-country values for the same indicators (Sotkanet "Koko maa", 2024; queue 2022–25). */
export const FINLAND = {
  bowelTurnout: 73.5, breastTurnout: 81.6, cervicalTurnout: 73.4,
  smoking: 9.1, alcohol: 29.9, obesity: 24.5, inactivity: 58.4,
  queueTrend: [26.5, 39.8, 45.4, 36.0],
  /** Statistics Finland projection 2024, year 2025 */
  population: 5_637_917,
}

// rural/east-north counties older and smoke more in this placeholder model
const RURAL = new Set(['lappi', 'kainuu', 'pohjois-karjala', 'etela-savo', 'kymenlaakso', 'satakunta', 'etela-karjala', 'pohjois-savo'])

function build(): County[] {
  return RAW.map(([id, name, col, row, population], i) => {
    const r = mulberry32(1000 + i * 97)
    const rural = RURAL.has(id)
    const share75plus = +(rural ? 0.13 + r() * 0.04 : 0.08 + r() * 0.04).toFixed(3)
    const share50to74 = +(rural ? 0.36 + r() * 0.04 : 0.3 + r() * 0.05).toFixed(3)
    const smoking = +(rural ? 11 + r() * 5 : 7 + r() * 4).toFixed(1)
    const alcohol = +(10 + r() * 6).toFixed(1)
    const obesity = +(rural ? 25 + r() * 6 : 19 + r() * 5).toFixed(1)
    const inactivity = +(14 + r() * 8).toFixed(1)
    const bowelTurnout = +(rural ? 62 + r() * 10 : 58 + r() * 14).toFixed(1)
    const breastTurnout = +(78 + r() * 12).toFixed(1)
    const cervicalTurnout = +(62 + r() * 14).toFixed(1)
    const base = 8 + r() * 10
    const slope = (r() - 0.35) * 3
    const queueTrend = [0, 1, 2, 3].map((q) => +(base + slope * q + r()).toFixed(1))
    const ageingIndex = +(1.25 + r() * 0.3 + (rural ? 0.05 : 0.1)).toFixed(2)

    const cancers = {} as Record<CancerId, CancerFigures>
    for (const c of CANCERS) {
      const ageFactor = (share75plus / 0.11) * 0.6 + (share50to74 / 0.33) * 0.4
      const riskFactor =
        c.id === 'lung' ? smoking / 10 : c.id === 'liver' ? alcohol / 13 : c.id === 'pancreas' ? (smoking / 10) * 0.4 + 0.6 : obesity / 22
      const expected = (population / 100_000) * c.ratePer100k * ageFactor * (0.5 + 0.5 * riskFactor)
      const cases = Math.max(1, Math.round(expected * (0.85 + r() * 0.3)))
      const lateShare = Math.min(0.92, +(c.lateShare + (rural ? 0.04 : -0.02) + (r() - 0.5) * 0.12).toFixed(2))
      const deaths = Math.round(cases * Math.min(0.98, c.fatality + (lateShare - c.lateShare) * 0.6 + (r() - 0.5) * 0.08))
      cancers[c.id] = { cases, deaths, lateShare, expected: Math.round(expected) }
    }
    // placeholders above keep the random sequence (and so the demo cancer figures) stable; real values replace them
    void [population, share50to74, share75plus, smoking, alcohol, obesity, inactivity, bowelTurnout, breastTurnout, cervicalTurnout, queueTrend, ageingIndex]
    return { id, name, col, row, ...REAL[id], cancers, screenCancers: {} as Record<ScreenCancerId, CancerFigures> }
  })
}

/**
 * Breast + cervical figures. Separate generator (own seed) so the four original cancers keep their values.
 * Late stage leans on screening turnout: counties where fewer women take part find more cancers late.
 */
function addScreenCancers(list: County[]) {
  const mean = (f: (c: County) => number) => list.reduce((s, c) => s + f(c), 0) / list.length
  const avg = { breast: mean((c) => c.breastTurnout), cervical: mean((c) => c.cervicalTurnout) }
  list.forEach((c, i) => {
    const r = mulberry32(7000 + i * 53)
    const rural = RURAL.has(c.id)
    for (const k of SCREEN_CANCERS) {
      const turnout = k.id === 'breast' ? c.breastTurnout : c.cervicalTurnout
      const ageFactor = k.id === 'breast' ? c.share50to74 / 0.33 : (0.47 - c.share75plus * 0.8) / 0.38
      const riskFactor = k.id === 'breast' ? (c.alcohol / 30) * 0.5 + (c.obesity / 25) * 0.5 : (c.smoking / 9) * 0.5 + 0.5
      const expected = (c.population / 100_000) * k.ratePer100k * ageFactor * (0.6 + 0.4 * riskFactor)
      const cases = Math.max(1, Math.round(expected * (0.88 + r() * 0.24)))
      const lateShare = Math.min(0.9, Math.max(0.05,
        +(k.lateShare + (avg[k.id] - turnout) * 0.006 + (rural ? 0.02 : -0.01) + (r() - 0.5) * 0.06).toFixed(2)))
      const deaths = Math.round(cases * Math.min(0.95, k.fatality + (lateShare - k.lateShare) * 0.7 + (r() - 0.5) * 0.05))
      c.screenCancers[k.id] = { cases, deaths, lateShare, expected: Math.round(expected) }
    }
  })
  return list
}

export const COUNTIES: County[] = addScreenCancers(build())
export const countyById = (id: string) => COUNTIES.find((c) => c.id === id)
