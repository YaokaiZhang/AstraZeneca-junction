// County-page calculations. Pure functions over COUNTIES so every tab and the brief agree.
import type { Programme } from './towns'
import { CANCERS, COUNTIES, SCREEN_CANCERS, type CancerFigures, type CancerId, type County, type RadarCancerId } from '../../data/counties'

export type Metric = 'ratio' | 'late' | 'fatality'

/** Rare cancers are pooled over five years to make the counts usable. */
export const POOL_YEARS: Record<RadarCancerId, number> = { lung: 1, bowel: 1, breast: 1, cervical: 5, pancreas: 5, liver: 5 }
export const periodLabel = (c: RadarCancerId) => (POOL_YEARS[c] > 1 ? '2020–24 pooled' : 'yearly')

/** Cancer picker order on the radar: the three screening programmes sit next to lung. */
export const RADAR_CANCERS: { id: RadarCancerId; label: string }[] = (['lung', 'bowel', 'breast', 'cervical', 'pancreas', 'liver'] as const)
  .map((id) => ({ id, label: [...CANCERS, ...SCREEN_CANCERS].find((x) => x.id === id)!.label }))
export const cancerLabel = (c: RadarCancerId) => RADAR_CANCERS.find((x) => x.id === c)!.label
export const isCoreCancer = (c: RadarCancerId): c is CancerId => CANCERS.some((x) => x.id === c)
export const figures = (c: County, k: RadarCancerId): CancerFigures =>
  isCoreCancer(k) ? c.cancers[k] : c.screenCancers[k]

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

export function metricValue(c: County, cancer: RadarCancerId, m: Metric): MetricValue {
  const f = figures(c, cancer)
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


export function national(cancer: RadarCancerId, m: Metric): number {
  let a = 0, b = 0
  for (const c of COUNTIES) {
    const f = figures(c, cancer)
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

// ---------- 3.3 overload projection ----------
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

// ---------- data contributed by patients (3.4) ----------
export function baseRecords(c: County) {
  // simulated opt-in records so far: ~2.6 per 10 000 residents, deterministic
  return Math.round((c.population / 10_000) * 2.6 + (c.name.length % 7) * 3)
}

// ---------- 3.1 detection radar: follow people along four steps ----------
export type StepId = 'risk' | 'screen' | 'late' | 'survival'
export const STEPS: { id: StepId; n: number; label: string; short: string; stamp: string; worse: string }[] = [
  { id: 'risk', n: 1, label: 'At risk', short: 'Risk', stamp: 'Many at risk', worse: 'more high-risk people' },
  { id: 'screen', n: 2, label: 'Screened', short: 'Screen', stamp: 'Low turnout', worse: 'fewer take part' },
  { id: 'late', n: 3, label: 'Found late', short: 'Late', stamp: 'Found late', worse: 'more found at stage III–IV' },
  { id: 'survival', n: 4, label: 'Survival', short: 'Survival', stamp: 'Few survive', worse: 'more deaths per new case' },
]
export const stepInfo = (s: StepId) => STEPS.find((x) => x.id === s)!

/** Which national screening programme covers a cancer, if any. */
export const PROGRAMME_OF: Partial<Record<RadarCancerId, Programme>> = { bowel: 'bowel', breast: 'breast', cervical: 'cervical' }
export const turnoutOf = (c: County, p: Programme) =>
  p === 'bowel' ? c.bowelTurnout : p === 'breast' ? c.breastTurnout : c.cervicalTurnout
/** Real 2024 municipal turnout ranges (THL Sotkanet 6103, 3621, 3620), 292 towns. */
export const REAL_RANGE: Record<Programme, [number, number]> = { bowel: [59.5, 82.4], breast: [68.1, 92.5], cervical: [45.7, 92.3] }

/**
 * Who counts as high risk, per cancer: an age band (share of residents), a sex share and a risk-factor
 * prevalence (% of that band). All placeholder recipes; the badge shows the formula.
 */
export const RISK: Record<RadarCancerId, { ages: string; who: string; band: (c: County) => number; sex: number; prev: (c: County) => number; factor: string }> = {
  lung: { ages: '50–74', who: 'people 50–74', band: (c) => c.share50to74, sex: 1, prev: (c) => c.smoking * 1.5, factor: 'smoking now or quit < 15 yrs (smoking % × 1.5)' },
  bowel: { ages: '56–74', who: 'people 56–74', band: (c) => c.share50to74 * 0.75, sex: 1, prev: (c) => (c.obesity + c.inactivity) / 2, factor: 'obesity or inactivity (mean of the two %)' },
  breast: { ages: '50–69', who: 'women 50–69', band: (c) => c.share50to74 * 0.8, sex: 0.5, prev: (c) => (c.obesity + c.alcohol) / 2, factor: 'obesity or heavy drinking (mean of the two %)' },
  cervical: { ages: '30–65', who: 'women 30–65', band: (c) => 0.47 - c.share75plus * 0.8, sex: 0.5, prev: (c) => c.smoking * 1.2, factor: 'smoking (× 1.2); HPV status is not published' },
  pancreas: { ages: '50+', who: 'people 50+', band: (c) => c.share50to74 + c.share75plus, sex: 1, prev: (c) => (c.smoking + c.obesity) / 2, factor: 'smoking or obesity (mean of the two %)' },
  liver: { ages: '50+', who: 'people 50+', band: (c) => c.share50to74 + c.share75plus, sex: 1, prev: (c) => c.alcohol, factor: 'heavy drinking (alcohol %)' },
}

export interface StepValue {
  id: StepId
  /** risk: prevalence 0–1 · screen: turnout 0–1 · late: share 0–1 · survival: deaths ÷ cases */
  v: number | null
  nat: number | null
  /** standardised badness vs other counties (positive = worse than average) */
  z: number | null
  /** people lost compared with the Finnish rate, per year (or per screening round) */
  excess: number | null
  wide: boolean
}
export interface RadarRow {
  c: County
  /** residents in the age band (and sex) the cancer concerns */
  bandPop: number
  highRisk: number
  programme: Programme | null
  steps: Record<StepId, StepValue>
  weakest: StepId
  weakZ: number
}

const cache = new Map<RadarCancerId, RadarRow[]>()

export function radar(k: RadarCancerId): RadarRow[] {
  const hit = cache.get(k)
  if (hit) return hit
  const R = RISK[k]
  const prog = PROGRAMME_OF[k] ?? null
  const base = COUNTIES.map((c) => {
    const f = figures(c, k)
    const bandPop = c.population * R.band(c) * R.sex
    const prev = R.prev(c) / 100
    return {
      c, f, bandPop, prev,
      turnout: prog ? turnoutOf(c, prog) / 100 : null,
      late: metricValue(c, k, 'late'),
      dc: metricValue(c, k, 'fatality'),
    }
  })
  const sumBand = base.reduce((s, b) => s + b.bandPop, 0)
  const nat = {
    risk: base.reduce((s, b) => s + b.prev * b.bandPop, 0) / sumBand,
    screen: prog ? base.reduce((s, b) => s + b.turnout! * b.bandPop, 0) / sumBand : null,
    late: national(k, 'late'),
    survival: national(k, 'fatality'),
  }
  // direction: +1 means a higher value is worse
  const zs = (vals: number[], dir: 1 | -1) => {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1
    return vals.map((v) => (dir * (v - m)) / sd)
  }
  const zRisk = zs(base.map((b) => b.prev), 1)
  const zScreen = prog ? zs(base.map((b) => b.turnout!), -1) : null
  const zLate = zs(base.map((b) => b.late.v), 1)
  const zDc = zs(base.map((b) => b.dc.v), 1)

  const rows = base.map((b, i): RadarRow => {
    const steps: Record<StepId, StepValue> = {
      risk: { id: 'risk', v: b.prev, nat: nat.risk, z: zRisk[i], excess: b.bandPop * (b.prev - nat.risk), wide: false },
      screen: prog
        ? { id: 'screen', v: b.turnout, nat: nat.screen, z: zScreen![i], excess: b.bandPop * (nat.screen! - b.turnout!), wide: false }
        : { id: 'screen', v: null, nat: null, z: null, excess: null, wide: false },
      // fade noisy small counts: they still show, but a wide interval halves their pull on "weakest"
      late: { id: 'late', v: b.late.v, nat: nat.late, z: zLate[i] * (b.late.wide ? 0.5 : 1), excess: b.f.cases * (b.late.v - nat.late), wide: b.late.wide },
      survival: { id: 'survival', v: b.dc.v, nat: nat.survival, z: zDc[i] * (b.dc.wide ? 0.5 : 1), excess: b.f.cases * (b.dc.v - nat.survival), wide: b.dc.wide },
    }
    let weakest: StepId = 'risk', weakZ = -Infinity
    for (const s of STEPS) {
      const z = steps[s.id].z
      if (z != null && z > weakZ) { weakZ = z; weakest = s.id }
    }
    return { c: b.c, bandPop: b.bandPop, highRisk: b.bandPop * b.prev, programme: prog, steps, weakest, weakZ }
  })
  cache.set(k, rows)
  return rows
}
export const radarFor = (c: County, k: RadarCancerId) => radar(k).find((r) => r.c.id === c.id)!

/** Value as shown on screen for each step. */
export function formatStep(s: StepId, v: number | null) {
  if (v == null) return '—'
  return s === 'survival' ? fmt(v, 2) : pct(v, s === 'screen' ? 1 : 0)
}
/** "+1 240 vs FI" style text for the people lost at a step. */
export function excessText(s: StepId, x: number | null) {
  if (x == null) return ''
  const n = Math.round(Math.abs(x))
  if (n === 0) return 'same as FI rate'
  const unit = s === 'risk' ? 'high-risk' : s === 'screen' ? 'missed' : s === 'late' ? 'late / yr' : 'deaths / yr'
  return `${x > 0 ? '+' : '−'}${fmt(n)} ${unit} vs FI rate`
}

/** Plain-language one-liner for a county's weakest step (used by the brief). */
export function weakestSentence(r: RadarRow, k: RadarCancerId) {
  const s = r.steps[r.weakest]
  const lbl = cancerLabel(k)
  if (r.weakest === 'risk') return `${lbl}: ${pct(s.v!)} of ${RISK[k].who} at high risk vs FI ${pct(s.nat!)}`
  if (r.weakest === 'screen') return `${lbl} screening turnout ${pct(s.v!, 1)} vs FI ${pct(s.nat!, 1)}`
  if (r.weakest === 'late') return `${lbl} found late: ${pct(s.v!)} at stage III–IV vs FI ${pct(s.nat!)}`
  return `${lbl}: ${fmt(s.v!, 2)} deaths per new case vs FI ${fmt(s.nat!, 2)}`
}
