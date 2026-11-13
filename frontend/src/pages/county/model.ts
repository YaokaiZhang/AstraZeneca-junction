// County-page calculations. Pure functions over COUNTIES so every tab and the brief agree.
import { CANCERS, COUNTIES, type CancerId, type County } from '../../data/counties'

export type Metric = 'ratio' | 'late' | 'fatality'
export const METRICS: { id: Metric; label: string; short: string }[] = [
  { id: 'ratio', label: 'Observed ÷ expected', short: 'O/E' },
  { id: 'late', label: 'Late stage (III–IV)', short: 'Late' },
  { id: 'fatality', label: 'Deaths ÷ cases', short: 'D/C' },
]

/** Rare cancers are pooled over five years to make the counts usable. */
export const POOL_YEARS: Record<CancerId, number> = { lung: 1, bowel: 1, pancreas: 5, liver: 5 }
export const periodLabel = (c: CancerId) => (POOL_YEARS[c] > 1 ? '2020–24 pooled' : 'yearly')

export const cancerLabel = (c: CancerId) => CANCERS.find((x) => x.id === c)!.label

export const fmt = (n: number, d = 0) => n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d })
export const pct = (x: number, d = 0) => `${fmt(x * 100, d)}%`
export const eur = (n: number) =>
  n >= 1e6 ? `€${fmt(n / 1e6, 2)}M` : n >= 1e4 ? `€${fmt(n / 1e3, 0)}k` : `€${fmt(n)}`

export const ABBR: Record<string, string> = {
  lappi: 'LAP', 'pohjois-pohjanmaa': 'PPO', kainuu: 'KAI', pohjanmaa: 'POH', 'keski-pohjanmaa': 'KPO',
  'pohjois-savo': 'PSA', 'pohjois-karjala': 'PKA', 'etela-pohjanmaa': 'EPO', 'keski-suomi': 'KSU',
  'etela-savo': 'ESA', satakunta: 'SAT', pirkanmaa: 'PIR', 'paijat-hame': 'PHÄ', 'etela-karjala': 'EKA',
  'varsinais-suomi': 'VSU', 'kanta-hame': 'KHÄ', 'keski-uusimaa': 'KUU', kymenlaakso: 'KYM',
  'lansi-uusimaa': 'LUU', 'vantaa-kerava': 'VAN', 'ita-uusimaa': 'IUU', helsinki: 'HKI',
}

// ---------- uncertainty ----------
const Z = 1.96
/** Byar's approximation to the exact Poisson 95% interval for a count O. */
export function poissonCI(o: number): [number, number] {
  const lo = o <= 0 ? 0 : o * Math.pow(1 - 1 / (9 * o) - Z / (3 * Math.sqrt(o)), 3)
  const o1 = o + 1
  const hi = o1 * Math.pow(1 - 1 / (9 * o1) + Z / (3 * Math.sqrt(o1)), 3)
  return [lo, hi]
}
/** Wilson score interval for a proportion. */
export function wilson(p: number, n: number): [number, number] {
  const d = 1 + (Z * Z) / n
  const c = (p + (Z * Z) / (2 * n)) / d
  const h = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / d
  return [Math.max(0, c - h), Math.min(1, c + h)]
}

export interface MetricValue { v: number; lo: number; hi: number; n: number; wide: boolean }
export const WIDE = 0.5 // relative interval width above which a county is de-emphasised

export function metricValue(c: County, cancer: CancerId, m: Metric): MetricValue {
  const f = c.cancers[cancer]
  const y = POOL_YEARS[cancer]
  const n = f.cases * y
  let v: number, lo: number, hi: number
  if (m === 'ratio') {
    const e = f.expected * y
    const [a, b] = poissonCI(n)
    v = n / e; lo = a / e; hi = b / e
  } else if (m === 'late') {
    v = f.lateShare
    ;[lo, hi] = wilson(v, n)
  } else {
    const d = f.deaths * y
    const [a, b] = poissonCI(d)
    v = d / n; lo = a / n; hi = b / n
  }
  return { v, lo, hi, n, wide: (hi - lo) / v > WIDE }
}

export function formatMetric(m: Metric, v: number) {
  return m === 'late' ? pct(v) : fmt(v, 2)
}

export function national(cancer: CancerId, m: Metric): number {
  let a = 0, b = 0
  for (const c of COUNTIES) {
    const f = c.cancers[cancer]
    if (m === 'ratio') { a += f.cases; b += f.expected }
    else if (m === 'late') { a += f.lateShare * f.cases; b += f.cases }
    else { a += f.deaths; b += f.cases }
  }
  return a / b
}

// ---------- colour scale: paper → mustard → terra ----------
const STOPS: [number, number, number][] = [[244, 241, 234], [255, 194, 51], [198, 93, 59]]
export function scaleColor(t: number) {
  const x = Math.max(0, Math.min(1, t)) * 2
  const i = Math.min(1, Math.floor(x))
  const k = x - i
  const [a, b] = [STOPS[i], STOPS[i + 1]]
  const ch = (j: number) => Math.round(a[j] + (b[j] - a[j]) * k)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}
export const SCALE_CSS = 'linear-gradient(90deg, #F4F1EA, #FFC233, #C65D3B)'

// ---------- national averages for rules ----------
const popW = (f: (c: County) => number) =>
  COUNTIES.reduce((s, c) => s + f(c) * c.population, 0) / COUNTIES.reduce((s, c) => s + c.population, 0)
export const NAT = {
  smoking: popW((c) => c.smoking),
  bowelTurnout: popW((c) => c.bowelTurnout),
  breastTurnout: popW((c) => c.breastTurnout),
  cervicalTurnout: popW((c) => c.cervicalTurnout),
}

// ---------- 3.3 lung screening capacity ----------
export interface CapacityInputs { eligibleFrac: number; uptake: number; intervalYears: 1 | 2; followUp: number; unitCost: number }
export const CAPACITY_DEFAULT: CapacityInputs = { eligibleFrac: 0.6, uptake: 0.5, intervalYears: 1, followUp: 0.15, unitCost: 150 }
export function capacity(c: County, p: CapacityInputs) {
  const pop5074 = c.population * c.share50to74
  const smokers = pop5074 * (c.smoking / 100)
  const eligible = smokers * p.eligibleFrac
  const screened = eligible * p.uptake
  const routine = screened / p.intervalYears
  const followUps = screened * p.followUp
  const ct = routine + followUps
  return { pop5074, smokers, eligible, screened, routine, followUps, ct, perDay: ct / 230, cost: ct * p.unitCost }
}

// ---------- 3.4 overload projection ----------
export const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i)
/** Relative incidence in people 75+ vs everyone younger (all four cancers, rough). */
const RR75 = 4
export type ProjCancer = CancerId | 'all'
export function baseCases(c: County, cancer: ProjCancer) {
  return cancer === 'all' ? CANCERS.reduce((s, k) => s + c.cancers[k.id].cases, 0) : c.cancers[cancer].cases
}
export function projection(c: County, cancer: ProjCancer): number[] {
  const base = baseCases(c, cancer)
  const f75 = (c.share75plus * RR75) / (c.share75plus * RR75 + (1 - c.share75plus))
  return YEARS.map((y) => {
    const t = (y - 2025) / 10
    return base * (f75 * Math.pow(c.ageingIndex, t) + (1 - f75) * (1 + 0.02 * t))
  })
}
export function overloadYear(series: number[], headroom: number): number | null {
  const i = series.findIndex((v) => v > series[0] * (1 + headroom))
  return i < 0 ? null : YEARS[i]
}
export const queueSlope = (c: County) => (c.queueTrend[3] - c.queueTrend[0]) / 3
export const queueRising = (c: County) => queueSlope(c) > 0.4

// ---------- data contributed by patients (3.5) ----------
export function baseRecords(c: County) {
  // simulated opt-in records so far: ~2.6 per 10 000 residents, deterministic
  return Math.round((c.population / 10_000) * 2.6 + (c.name.length % 7) * 3)
}
