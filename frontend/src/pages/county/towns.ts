// Towns (municipalities, or districts for single-city counties) for "Who misses screening" (3.2).
// DEMO VALUES: names are real, populations are rounded; income, age, language mix and turnout are
// generated deterministically until the Statistics Finland + Sotkanet municipality pulls are wired in.
import { COUNTIES } from '../../data/counties'
import { mulberry32 } from '../../lib/random'

export type Programme = 'bowel' | 'breast' | 'cervical'
export const PROGRAMMES: { id: Programme; label: string; ages: string; indicator: string }[] = [
  { id: 'bowel', label: 'Bowel', ages: '56–74', indicator: '6103' },
  { id: 'breast', label: 'Breast', ages: '50–69', indicator: '3620' },
  { id: 'cervical', label: 'Cervical', ages: '30–65', indicator: '3621' },
]

export interface Town {
  id: string
  name: string
  county: string
  population: number
  /** median household disposable income, k€ */
  income: number
  /** share aged 65+, % */
  share65: number
  /** foreign-language speakers, % */
  foreign: number
  /** Swedish speakers, % */
  swedish: number
  turnout: Record<Programme, number>
}

// [name, county id, population, swedish-speaking % (approx, real-ish)]
const RAW: [string, string, number, number][] = [
  ['Rovaniemi', 'lappi', 65_000, 0.3], ['Kemi', 'lappi', 20_000, 0.2], ['Tornio', 'lappi', 21_500, 0.4], ['Sodankylä', 'lappi', 8_000, 0.1], ['Inari', 'lappi', 7_000, 0.2], ['Kemijärvi', 'lappi', 7_000, 0.1],
  ['Oulu', 'pohjois-pohjanmaa', 214_000, 0.2], ['Raahe', 'pohjois-pohjanmaa', 24_000, 0.1], ['Kuusamo', 'pohjois-pohjanmaa', 15_000, 0.1], ['Ylivieska', 'pohjois-pohjanmaa', 15_000, 0.1], ['Kempele', 'pohjois-pohjanmaa', 19_500, 0.1], ['Nivala', 'pohjois-pohjanmaa', 10_500, 0.1],
  ['Kajaani', 'kainuu', 36_000, 0.1], ['Sotkamo', 'kainuu', 10_000, 0.1], ['Kuhmo', 'kainuu', 8_000, 0.1], ['Suomussalmi', 'kainuu', 7_500, 0.1],
  ['Vaasa', 'pohjanmaa', 68_000, 22], ['Pietarsaari', 'pohjanmaa', 19_000, 55], ['Mustasaari', 'pohjanmaa', 19_500, 67], ['Närpiö', 'pohjanmaa', 9_500, 78], ['Kristiinankaupunki', 'pohjanmaa', 6_500, 54], ['Uusikaarlepyy', 'pohjanmaa', 7_500, 72],
  ['Kokkola', 'keski-pohjanmaa', 48_000, 12], ['Kannus', 'keski-pohjanmaa', 5_500, 0.2], ['Kaustinen', 'keski-pohjanmaa', 4_200, 0.2], ['Toholampi', 'keski-pohjanmaa', 3_000, 0.1],
  ['Kuopio', 'pohjois-savo', 125_000, 0.2], ['Iisalmi', 'pohjois-savo', 21_000, 0.1], ['Varkaus', 'pohjois-savo', 20_000, 0.1], ['Siilinjärvi', 'pohjois-savo', 21_500, 0.1], ['Suonenjoki', 'pohjois-savo', 7_000, 0.1],
  ['Joensuu', 'pohjois-karjala', 78_000, 0.2], ['Lieksa', 'pohjois-karjala', 10_500, 0.1], ['Kitee', 'pohjois-karjala', 10_000, 0.1], ['Nurmes', 'pohjois-karjala', 7_500, 0.1], ['Kontiolahti', 'pohjois-karjala', 15_000, 0.1],
  ['Seinäjoki', 'etela-pohjanmaa', 65_000, 0.2], ['Lapua', 'etela-pohjanmaa', 14_000, 0.1], ['Kauhava', 'etela-pohjanmaa', 15_500, 0.1], ['Kurikka', 'etela-pohjanmaa', 20_000, 0.1], ['Alavus', 'etela-pohjanmaa', 11_000, 0.1],
  ['Jyväskylä', 'keski-suomi', 148_000, 0.2], ['Jämsä', 'keski-suomi', 19_500, 0.1], ['Äänekoski', 'keski-suomi', 18_500, 0.1], ['Laukaa', 'keski-suomi', 19_000, 0.1], ['Keuruu', 'keski-suomi', 9_500, 0.1],
  ['Mikkeli', 'etela-savo', 52_000, 0.2], ['Savonlinna', 'etela-savo', 31_500, 0.2], ['Pieksämäki', 'etela-savo', 17_000, 0.1], ['Juva', 'etela-savo', 6_000, 0.1],
  ['Pori', 'satakunta', 83_500, 0.3], ['Rauma', 'satakunta', 38_500, 0.3], ['Ulvila', 'satakunta', 13_000, 0.2], ['Kankaanpää', 'satakunta', 11_000, 0.1], ['Huittinen', 'satakunta', 10_000, 0.1],
  ['Tampere', 'pirkanmaa', 250_000, 0.4], ['Nokia', 'pirkanmaa', 35_000, 0.2], ['Ylöjärvi', 'pirkanmaa', 33_500, 0.2], ['Kangasala', 'pirkanmaa', 33_000, 0.2], ['Valkeakoski', 'pirkanmaa', 20_500, 0.2], ['Lempäälä', 'pirkanmaa', 24_500, 0.2],
  ['Lahti', 'paijat-hame', 121_000, 0.3], ['Hollola', 'paijat-hame', 23_000, 0.2], ['Heinola', 'paijat-hame', 18_500, 0.2], ['Orimattila', 'paijat-hame', 16_000, 0.3],
  ['Lappeenranta', 'etela-karjala', 73_000, 0.3], ['Imatra', 'etela-karjala', 25_500, 0.2], ['Ruokolahti', 'etela-karjala', 5_000, 0.1], ['Lemi', 'etela-karjala', 3_000, 0.1],
  ['Turku', 'varsinais-suomi', 201_000, 5], ['Salo', 'varsinais-suomi', 51_000, 0.8], ['Kaarina', 'varsinais-suomi', 36_000, 4], ['Raisio', 'varsinais-suomi', 24_500, 1.5], ['Uusikaupunki', 'varsinais-suomi', 15_000, 0.6], ['Parainen', 'varsinais-suomi', 15_000, 53],
  ['Hämeenlinna', 'kanta-hame', 68_000, 0.4], ['Riihimäki', 'kanta-hame', 29_000, 0.3], ['Forssa', 'kanta-hame', 16_500, 0.2], ['Janakkala', 'kanta-hame', 16_500, 0.3],
  ['Hyvinkää', 'keski-uusimaa', 47_000, 0.8], ['Järvenpää', 'keski-uusimaa', 45_000, 0.9], ['Tuusula', 'keski-uusimaa', 39_500, 1.2], ['Nurmijärvi', 'keski-uusimaa', 44_000, 1], ['Mäntsälä', 'keski-uusimaa', 21_000, 0.6],
  ['Kotka', 'kymenlaakso', 51_000, 1.6], ['Kouvola', 'kymenlaakso', 79_500, 0.3], ['Hamina', 'kymenlaakso', 19_500, 0.8], ['Pyhtää', 'kymenlaakso', 5_200, 7],
  ['Espoo', 'lansi-uusimaa', 310_000, 6.5], ['Lohja', 'lansi-uusimaa', 46_000, 3], ['Kirkkonummi', 'lansi-uusimaa', 41_000, 16], ['Raasepori', 'lansi-uusimaa', 27_500, 64], ['Vihti', 'lansi-uusimaa', 29_000, 1.5],
  ['Tikkurila', 'vantaa-kerava', 75_000, 2], ['Myyrmäki', 'vantaa-kerava', 80_000, 2.5], ['Koivukylä', 'vantaa-kerava', 90_000, 2], ['Kerava', 'vantaa-kerava', 37_500, 1.5],
  ['Porvoo', 'ita-uusimaa', 51_000, 29], ['Loviisa', 'ita-uusimaa', 14_500, 39], ['Sipoo', 'ita-uusimaa', 23_000, 33], ['Pornainen', 'ita-uusimaa', 5_000, 3],
  ['Eteläinen', 'helsinki', 120_000, 9], ['Keskinen', 'helsinki', 95_000, 5], ['Läntinen', 'helsinki', 115_000, 6], ['Koillinen', 'helsinki', 95_000, 3.5], ['Itäinen', 'helsinki', 105_000, 3], ['Kaakkoinen', 'helsinki', 40_000, 6],
]

// districts known for a high foreign-language share in this demo
const DIVERSE = new Set(['Itäinen', 'Koivukylä', 'Myyrmäki', 'Koillinen', 'Espoo', 'Tikkurila', 'Turku', 'Keskinen', 'Vaasa'])

const BASE: Record<Programme, number> = { bowel: 64, breast: 82, cervical: 68 }

function build(): Town[] {
  return RAW.map(([name, county, population, swedish], i) => {
    const r = mulberry32(5000 + i * 131)
    const c = COUNTIES.find((x) => x.id === county)!
    const urban = population > 60_000
    const income = +(urban ? 30 + r() * 10 : 25 + r() * 8).toFixed(1)
    const share65 = +(c.share75plus * 100 * 1.9 + (urban ? -4 : 3) + (r() - 0.5) * 6).toFixed(1)
    const foreign = +(DIVERSE.has(name) ? 14 + r() * 14 : urban ? 4 + r() * 6 : 1 + r() * 3.5).toFixed(1)
    const turnout = {} as Record<Programme, number>
    for (const p of PROGRAMMES) {
      const countyEff = ((p.id === 'bowel' ? c.bowelTurnout : p.id === 'breast' ? c.breastTurnout : c.cervicalTurnout) - BASE[p.id] - 3) * 0.35
      const noise = (r() + r() + r() - 1.5) * 4
      // a few planted surprises so the outliers have a story
      const surprise = (i * 7 + p.id.length) % 23 === 0 ? -9 : (i * 5 + p.id.length) % 29 === 0 ? 8 : 0
      const v = BASE[p.id] + 0.55 * (income - 30) + 0.12 * (share65 - 24) - 0.62 * foreign + 0.05 * swedish + countyEff + noise + surprise
      turnout[p.id] = +Math.max(25, Math.min(95, v)).toFixed(1)
    }
    return { id: `t${i}`, name, county, population, income, share65, foreign, swedish, turnout }
  })
}

export const TOWNS: Town[] = build()

// ---------- linear model: turnout ~ income + share65 + foreign + swedish ----------
export const FEATURES = [
  { key: 'income', label: 'income k€' },
  { key: 'share65', label: '65+ %' },
  { key: 'foreign', label: 'foreign-lang %' },
  { key: 'swedish', label: 'Swedish %' },
] as const

function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

export interface Fit {
  coef: number[] // intercept, then FEATURES order
  r2: number
  sd: number
  predicted: Map<string, number>
  formula: string
}

export function fitModel(p: Programme): Fit {
  const X = TOWNS.map((t) => [1, ...FEATURES.map((f) => t[f.key])])
  const y = TOWNS.map((t) => t.turnout[p])
  const k = X[0].length
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0)))
  const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, row, r) => s + row[i] * y[r], 0))
  const coef = solve(XtX, Xty)
  const pred = X.map((row) => row.reduce((s, x, i) => s + x * coef[i], 0))
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  const ssr = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0)
  const sst = y.reduce((s, v) => s + (v - mean) ** 2, 0)
  const sd = Math.sqrt(ssr / (y.length - k))
  const terms = FEATURES.map((f, i) => `${coef[i + 1] >= 0 ? '+' : '−'} ${Math.abs(coef[i + 1]).toFixed(2)}×${f.label}`)
  return {
    coef,
    r2: 1 - ssr / sst,
    sd,
    predicted: new Map(TOWNS.map((t, i) => [t.id, pred[i]])),
    formula: `turnout = ${coef[0].toFixed(1)} ${terms.join(' ')}`,
  }
}

export type Verdict = 'help' | 'copy' | 'ok'
export const verdict = (actual: number, predicted: number, sd: number): Verdict =>
  actual - predicted < -1.5 * sd ? 'help' : actual - predicted > 1.5 * sd ? 'copy' : 'ok'
