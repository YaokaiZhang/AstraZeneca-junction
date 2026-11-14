// 21 wellbeing services counties + City of Helsinki.
// REAL (see REAL below): population, age mix and the 2025 → 2035 ageing forecast (Statistics Finland 14wx),
// screening turnout 2024, risk factors 2024 and specialist waiting lists 2022–25 (THL Sotkanet).
// Cancer cases, deaths and stage per county: Finnish Cancer Registry, with expected cases from national age × sex
// rates (registry.generated.ts, built by scripts/build_cancer_data.py).
import { REGISTRY, REGISTRY_FI } from './registry.generated'

export type CancerId = 'lung' | 'bowel' | 'pancreas' | 'liver'
/** Cancers with a national screening programme that are not in CANCERS. Used by the detection radar (3.1). */
export type ScreenCancerId = 'breast' | 'cervical'
export type RadarCancerId = CancerId | ScreenCancerId

/** One row of registry.generated.ts. */
export interface RegistryFigures {
  cases: number
  deaths: number
  lateShare: number
  stageKnown: number
  unknownStage: number
  expected: number
  exp75: number
  stageHidden?: boolean
  deathsFromRate?: boolean
}
/** Whole-country figures, Finnish Cancer Registry. */
export interface RegistryNational { ratePer100k: number; fatality: number; lateShare: number; unknownStage: number; cases: number }

interface CancerMeta { label: string; ratePer100k: number; fatality: number; lateShare: number; unknownStage: number }
const meta = <K extends RadarCancerId>(id: K, label: string) => ({ id, label, ...REGISTRY_FI[id] } as CancerMeta & { id: K })
/** Whole-country values: cases per 100 000 of everyone, deaths ÷ cases, spread share of known stage. */
export const CANCERS = [meta('lung', 'Lung'), meta('bowel', 'Bowel'), meta('pancreas', 'Pancreas'), meta('liver', 'Liver')]
/** Breast and cervix: women only in the Registry's figures; ratePer100k is still per 100 000 of everyone. */
export const SCREEN_CANCERS = [meta('breast', 'Breast'), meta('cervical', 'Cervical')]

/**
 * Finnish Cancer Registry statistics app (tilastot.syoparekisteri.fi), retrieved 14 Nov 2026.
 * Lung C33–34, bowel C18–20, pancreas C25, liver C22, breast C50 and cervix C53 (women).
 */
export interface CancerFigures {
  /** new cases per year, mean 2020–2024 */
  cases: number
  /** cancer deaths per year, mean 2020–2024, by residence at death */
  deaths: number
  /**
   * Share that had spread beyond the organ at diagnosis ("non-localized"), of cases with known stage.
   * Preliminary 2021–2025 statistics, the only stage table by county. Not TNM III–IV.
   */
  lateShare: number
  /** cases with known stage over 2021–2025 (5-year total): the base of the lateShare interval */
  stageKnown: number
  /** share of cases with unknown stage. High where clinical notifications are missing. */
  unknownStage: number
  /** a stage count of 1–4 was hidden by the Registry and taken as 2.5 */
  stageHidden?: boolean
  /** cases expected at national age × sex rates (indirect standardisation, 2023 population) */
  expected: number
  /** share of the expected cases in people 75+ */
  exp75: number
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

/** id, name, tile-map column and row */
const RAW: [string, string, number, number][] = [
  ['lappi', 'Lappi', 2, 0],
  ['pohjois-pohjanmaa', 'Pohjois-Pohjanmaa', 1, 1],
  ['kainuu', 'Kainuu', 2, 1],
  ['pohjanmaa', 'Pohjanmaa', 0, 2],
  ['keski-pohjanmaa', 'Keski-Pohjanmaa', 1, 2],
  ['pohjois-savo', 'Pohjois-Savo', 2, 2],
  ['pohjois-karjala', 'Pohjois-Karjala', 3, 2],
  ['etela-pohjanmaa', 'Etelä-Pohjanmaa', 0, 3],
  ['keski-suomi', 'Keski-Suomi', 1, 3],
  ['etela-savo', 'Etelä-Savo', 2, 3],
  ['satakunta', 'Satakunta', 0, 4],
  ['pirkanmaa', 'Pirkanmaa', 1, 4],
  ['paijat-hame', 'Päijät-Häme', 2, 4],
  ['etela-karjala', 'Etelä-Karjala', 3, 4],
  ['varsinais-suomi', 'Varsinais-Suomi', 0, 5],
  ['kanta-hame', 'Kanta-Häme', 1, 5],
  ['keski-uusimaa', 'Keski-Uusimaa', 2, 5],
  ['kymenlaakso', 'Kymenlaakso', 3, 5],
  ['lansi-uusimaa', 'Länsi-Uusimaa', 1, 6],
  ['vantaa-kerava', 'Vantaa-Kerava', 2, 6],
  ['ita-uusimaa', 'Itä-Uusimaa', 3, 6],
  ['helsinki', 'Helsinki', 2, 7],
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

function build(): County[] {
  return RAW.map(([id, name, col, row]) => {
    const pick = <K extends RadarCancerId>(ks: readonly K[]) =>
      Object.fromEntries(ks.map((k) => [k, REGISTRY[id][k]])) as Record<K, CancerFigures>
    return {
      id, name, col, row, ...REAL[id],
      cancers: pick(['lung', 'bowel', 'pancreas', 'liver'] as const),
      screenCancers: pick(['breast', 'cervical'] as const),
    }
  })
}

export const COUNTIES: County[] = build()
export const countyById = (id: string) => COUNTIES.find((c) => c.id === id)
