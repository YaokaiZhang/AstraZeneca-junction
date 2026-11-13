// 21 wellbeing services counties + City of Helsinki.
// DEMO VALUES: populations are rounded real figures; every other number is a plausible placeholder
// generated below until the Cancer Registry CSV and Sotkanet API pulls are wired in.
import { mulberry32 } from '../lib/random'

export type CancerId = 'lung' | 'bowel' | 'pancreas' | 'liver'
export const CANCERS: { id: CancerId; label: string; ratePer100k: number; fatality: number; lateShare: number }[] = [
  { id: 'lung', label: 'Lung', ratePer100k: 50, fatality: 0.82, lateShare: 0.62 },
  { id: 'bowel', label: 'Bowel', ratePer100k: 64, fatality: 0.36, lateShare: 0.45 },
  { id: 'pancreas', label: 'Pancreas', ratePer100k: 26, fatality: 0.9, lateShare: 0.78 },
  { id: 'liver', label: 'Liver', ratePer100k: 11, fatality: 0.85, lateShare: 0.66 },
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
  /** people waiting > 90 days for specialist care, per 10 000 residents, last 4 quarters */
  queueTrend: number[]
  /** yearly forecast multiplier of over-75 population, 2025 → 2035 */
  ageingIndex: number
  cancers: Record<CancerId, CancerFigures>
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
    return { id, name, col, row, population, share50to74, share75plus, smoking, alcohol, obesity, inactivity,
      bowelTurnout, breastTurnout, cervicalTurnout, queueTrend, ageingIndex, cancers }
  })
}

export const COUNTIES: County[] = build()
export const countyById = (id: string) => COUNTIES.find((c) => c.id === id)
