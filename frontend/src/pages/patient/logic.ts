// Pure logic for the patient page: keyword symptom extraction (fi/sv/en),
// date parsing, smoking parsing, the two-week flag rule, PLCOm2012, the bowel/breast/cervical
// Estimate and the "next step" each person sees (never a score).
import { DAY, daysBetween, today } from '../../data/pathway'
import type { CheckInputs, DiaryEntry, Estimates, RiskInputs, State } from '../../lib/store'

export const SYMPTOM_KEYS = ['cough', 'weight-loss', 'blood-cough', 'blood-stool', 'blood', 'breathless', 'chest-pain', 'fatigue', 'bowel-change', 'jaundice', 'abdominal-pain', 'hoarse', 'smoking'] as const

const RX: [string, RegExp][] = [
  ['cough', /cough|yski|yskä|hosta|hostar|hostat/i],
  ['breathless', /breath|hengäst|hengenahd|hengitys|andfådd|andnöd|andas tungt/i],
  ['chest-pain', /chest|rintakip|kipua? rinnassa|rinnassa kipu|bröstsmärt|ont i bröstet/i],
  ['fatigue', /tired|fatigue|exhaust|no energy|väsy|uupu|voimaton|trött|utmatt|orkeslös/i],
  ['bowel-change', /bowel|diarrh|constipat|loose stool|ripul|ummet|suolen toimin|vatsan toimin|förstopp|diarré|avföringsvan/i],
  ['jaundice', /jaundic|yellow|keltai|gulsot|gul hy|gula ögon/i],
  ['abdominal-pain', /stomach|abdom|belly|tummy|vatsakip|mahakip|vatsaan sattuu|kipua vatsassa|ont i magen|magont|buksmärt|magsmärt/i],
  ['hoarse', /hoarse|käheä|käheys|heshet|\bhes\b/i],
  ['weight-loss', /(lost|lose|losing|dropped|down)\b[^.]{0,20}\b(weight|kg|kilo|pound)|weight ?loss|laihtu|laihdu|laihtun|paino[^.]{0,15}(laski|putos|vähen|pudon)|kiloa? pois|menettänyt[^.]{0,10}kilo|gått ner|tappat[^.]{0,10}(vikt|kilo)|viktnedgång|minskat i vikt/i],
  ['smoking', /smok|cigar|tobacco|\bpacks?\b|tupak|polta|poltin|poltan|savuk|aski|röker|rökt|rökare|röka|cigarett/i],
]
const BLOOD = /blood|bleed|veri|verta|veris|blod/i
const STOOL = /stool|poo|faec|fec|toilet|bottom|uloste|kakka|vessa|peräsuoli|avföring|bajs|toalett/i
const NEG = /(?:\bno|\bnot|\bnever|\bwithout|\bei|\beikä|\bingen|\binte|\butan)\s+(?:\S+\s+)?$/i

function hit(text: string, rx: RegExp) {
  const m = rx.exec(text)
  if (!m) return false
  return !NEG.test(text.slice(Math.max(0, m.index - 24), m.index))
}

/** Normalised symptom tags in a free-text message. */
export function extractTags(text: string): string[] {
  const tags = new Set<string>()
  for (const [k, rx] of RX) if (hit(text, rx)) tags.add(k)
  if (hit(text, BLOOD)) {
    if (STOOL.test(text)) tags.add('blood-stool')
    else if (tags.has('cough') || /cough(ing)? up|ysk|host/i.test(text)) tags.add('blood-cough')
    else tags.add('blood')
  }
  // "blood in stool" should not also count as a bowel change by itself
  return [...tags]
}

export const parseKg = (text: string) => {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/i.exec(text) ?? /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(text)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}

// ---------- dates ----------
const EN = ['jan(?:uary)?', 'feb(?:ruary)?', 'mar(?:ch)?', 'apr(?:il)?', 'may', 'june?', 'july?', 'aug(?:ust)?', 'sep(?:t(?:ember)?)?', 'oct(?:ober)?', 'nov(?:ember)?', 'dec(?:ember)?']
const FI = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu']
const SV = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const MONTH_ALT = EN.map((_, i) => `(?:${SV[i]}|${EN[i]}(?![a-zåäö])|${FI[i]}kuu\\S*)`)

const NUMW: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, few: 3, couple: 2,
  yksi: 1, yhden: 1, yhtä: 1, kaksi: 2, kahden: 2, kolme: 3, kolmen: 3, neljä: 4, viisi: 5, kuusi: 6, pari: 2, muutama: 3, muutaman: 3,
  en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, några: 3, par: 2,
}
const UNITS: [RegExp, number][] = [
  [/^(?:days?|päivä\S*|pv|dag(?:ar)?)$/i, 1],
  [/^(?:weeks?|wks?|viikko\S*|vko|veck\S*)$/i, 7],
  [/^(?:months?|kuukau\S*|kk|månad\S*|mån)$/i, 30],
  [/^(?:years?|vuo\S*|år)$/i, 365],
]

const iso = (d: Date) => d.toISOString().slice(0, 10)
const minusDays = (now: string, n: number) => iso(new Date(new Date(now + 'T12:00:00').getTime() - n * DAY))

/** Pull a YYYY-MM-DD out of free text ("since 2 October", "3 weeks", "eilen", "2.10."). */
export function parseWhen(text: string, now: string = today(), allowYears = true): string | null {
  // drop smoking frequencies ("a pack a day", "20 per day") so they don't read as "1 day ago"
  const s = text.toLowerCase().replace(/(?:\ba|per|om)\s+(?:day|dag)(?!\s*(?:ago|sedan))|päivässä/g, ' ')
  let m: RegExpExecArray | null
  if ((m = /(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[0]
  const year = +now.slice(0, 4)
  const mk = (d: number, mo: number, y?: number) => {
    if (d < 1 || d > 31 || mo < 0 || mo > 11) return null
    let yy = y ?? year
    if (yy < 100) yy += 2000
    let out = iso(new Date(Date.UTC(yy, mo, d, 12)))
    if (!y && out > now) out = iso(new Date(Date.UTC(yy - 1, mo, d, 12)))
    return out
  }
  if ((m = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?![\d,]|\s*(?:kg|kilo|aski|pack|paket))/.exec(s))) { const r = mk(+m[1], +m[2] - 1, m[3] ? +m[3] : undefined); if (r) return r }
  for (let i = 0; i < 12; i++) {
    const alt = MONTH_ALT[i]
    if ((m = new RegExp(`(\\d{1,2})\\.?\\s*(?:of\\s+)?${alt}`, 'i').exec(s))) return mk(+m[1], i)
    if ((m = new RegExp(`(?:^|\\s)${alt}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').exec(s))) return mk(+m[1], i)
  }
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`(?:since|from|sedan|från|alkaen|lähtien)\\s+${MONTH_ALT[i]}|${FI[i]}kuusta`, 'i').test(s)) return mk(1, i)
  }
  if (/yesterday|eilen|igår|i går/.test(s)) return minusDays(now, 1)
  if (/last week|viime viikolla|förra veckan/.test(s)) return minusDays(now, 7)
  if (/last month|viime kuussa|förra månaden/.test(s)) return minusDays(now, 30)
  // "<n> <unit>" relative durations
  const words = s.replace(/[,.!?]/g, ' ').split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    for (const [rx, mult] of UNITS) {
      if (!rx.test(words[i])) continue
      if (mult === 365 && !allowYears) continue
      const prev = words[i - 1]
      const n = prev ? (/^\d+$/.test(prev) ? +prev : NUMW[prev] ?? 1) : 1
      return minusDays(now, n * mult)
    }
  }
  if (/\btoday\b|tänään|idag/.test(s)) return now
  return null
}

// ---------- smoking ----------
export interface SmokeInfo { status?: 'never' | 'current' | 'former'; cpd?: number; years?: number; quit?: number }
export function parseSmoking(text: string): SmokeInfo {
  const s = text.toLowerCase()
  const out: SmokeInfo = {}
  if (/never smok|don'?t smoke|non.?smoker|en ole (koskaan )?(tupakoinut|polttanut)|en tupakoi|aldrig rökt|röker inte/.test(s)) return { status: 'never' }
  if (/quit|stopped|gave up|former|used to|lopet|slutat|slutade/.test(s)) out.status = 'former'
  else if (/smok|tupak|polt|röker/.test(s)) out.status = 'current'
  let m: RegExpExecArray | null
  if ((m = /(\d+(?:[.,]\d+)?|a|one|half|yksi|puoli|ett|en|halv)?\s*(?:packs?|aski\S*|paket\S*)/.exec(s))) {
    const w = m[1]
    const n = !w ? 1 : /half|puoli|halv/.test(w) ? 0.5 : /^\d/.test(w) ? parseFloat(w.replace(',', '.')) : 1
    out.cpd = Math.round(n * 20)
  } else if ((m = /(\d+)\s*(?:cig\S*|savuk\S*|tupak\S*|sätk\S*|a day|per day|\/day|päivässä|om dagen|per dag|om dan)/.exec(s))) out.cpd = +m[1]
  const quitM = /(\d+)\s*(?:years?|yrs?|vuotta|år)\s*(?:ago|sitten|sedan)/.exec(s)
  if (quitM) { out.quit = +quitM[1]; out.status = 'former' }
  const yrsRx = /(?:for\s+|)(\d+)\s*(?:years?|yrs?|vuotta|vuoden|vuosi|år)(?!\s*(?:ago|sitten|sedan))/g
  while ((m = yrsRx.exec(s))) { out.years = +m[1]; break }
  return out
}
export const packYears = (cpd = 0, years = 0) => Math.round((cpd / 20) * years)

// ---------- two-week flag (never a diagnosis) ----------
const RED = ['blood-cough', 'blood-stool', 'blood', 'jaundice', 'weight-loss']
const PERSIST = ['cough', 'breathless', 'hoarse', 'bowel-change', 'abdominal-pain', 'chest-pain']
export interface Reason { tag: string; days: number; red: boolean }
export function firstSeen(diary: DiaryEntry[]) {
  const first: Record<string, string> = {}
  for (const e of diary) for (const t of e.tags) if (!first[t] || e.date < first[t]) first[t] = e.date
  return first
}
export function assess(diary: DiaryEntry[], now = today()): { flag: boolean; reasons: Reason[] } {
  const first = firstSeen(diary)
  const reasons: Reason[] = []
  for (const [tag, d] of Object.entries(first)) {
    const days = daysBetween(d, now)
    if (RED.includes(tag)) reasons.push({ tag, days, red: true })
    else if (PERSIST.includes(tag) && days >= 21) reasons.push({ tag, days, red: false })
  }
  if (first['fatigue'] && first['weight-loss']) reasons.push({ tag: 'fatigue', days: daysBetween(first['fatigue'], now), red: false })
  reasons.sort((a, b) => Number(b.red) - Number(a.red) || b.days - a.days)
  return { flag: reasons.length > 0, reasons }
}

// ---------- PLCOm2012 ----------
const RACE = { white: 0, black: 0.3944778, hispanic: -0.7434744, asian: -0.466585, other: 0 }
export const PLCO_THRESHOLD = 0.0151
export function plco(i: RiskInputs): number {
  const cpd = Math.max(1, i.cigsPerDay)
  const logit = -4.532506
    + 0.0778868 * (i.age - 62)
    - 0.0812744 * (i.education - 4)
    - 0.0274194 * (i.bmi - 27)
    + 0.3553063 * (i.copd ? 1 : 0)
    + 0.4589971 * (i.personalCancer ? 1 : 0)
    + 0.587185 * (i.familyLung ? 1 : 0)
    + 0.2597431 * (i.smoker === 'current' ? 1 : 0)
    - 1.822606 * (Math.pow(cpd / 10, -1) - 0.4021541613)
    + 0.0317321 * (i.yearsSmoked - 27)
    - 0.0308572 * ((i.smoker === 'current' ? 0 : i.yearsQuit) - 10)
    + RACE[i.ethnicity]
  return Math.exp(logit) / (1 + Math.exp(logit))
}
export const PLCO_HOW = 'logit = −4.532506 + 0.0778868·(age−62) − 0.0812744·(edu−4) − 0.0274194·(BMI−27) + 0.3553063·COPD + 0.4589971·prior cancer + 0.587185·family lung ca + 0.2597431·current − 1.822606·((cpd/10)⁻¹ − 0.4021542) + 0.0317321·(yrs smoked−27) − 0.0308572·(yrs quit−10) + race term; p = eˡ/(1+eˡ). Threshold ≥ 1.51 %.'

// ---------- screening programmes (risk thresholds + who they apply to) ----------
export const PROGRAMMES = [
  { id: 'bowel' as const, from: 56, to: 74, sex: ['f', 'm', 'x'] },
  { id: 'breast' as const, from: 50, to: 69, sex: ['f', 'x'] },
  { id: 'cervical' as const, from: 30, to: 65, sex: ['f', 'x'] },
]


// ---------- bowel / breast / cervical Estimate ----------
// NOT a clinical model. No free, validated model exists for these cancers, so (spec 3.1) we combine
// rough Finnish Cancer Registry incidence by age and sex with relative risks from published
// meta-analyses. Labelled "Estimate" wherever it surfaces. The person never sees the number.
type Cancer3 = 'bowel' | 'breast' | 'cervical'
/** New cases per 100 000 per year, by 10-year age band starting at 0, 10, 20 … 80+. Rounded, demo-grade. */
const INCIDENCE: Record<Cancer3, { f: number[]; m: number[] }> = {
  bowel: { f: [0, 0, 1, 5, 18, 45, 100, 190, 290], m: [0, 0, 1, 5, 20, 60, 150, 280, 380] },
  breast: { f: [0, 0, 2, 50, 190, 270, 320, 280, 250], m: [0, 0, 0, 0, 1, 1, 2, 2, 3] },
  cervical: { f: [0, 0, 6, 11, 9, 7, 7, 6, 6], m: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
}
/** Relative risks (approximate, from published meta-analyses). Multiplied together. */
export const ESTIMATE_RR = {
  bowel: { current: 1.2, former: 1.15, drinks7: 1.15, drinks14: 1.4, bmi25: 1.1, bmi30: 1.3, family: 1.8 },
  breast: { current: 1.1, former: 1.05, drinks7: 1.1, drinks14: 1.3, bmi30after50: 1.25, family: 1.8 },
  cervical: { current: 2.0, former: 1.3 },
} as const
export interface EstimateInput { age: number; sex: 'f' | 'm' | 'x'; smoker: CheckInputs['smoker']; drinksPerWeek: number; bmi: number; familyBowel: boolean; familyBreast: boolean }

function baseline10y(c: Cancer3, sex: 'f' | 'm' | 'x', age: number) {
  const rows = INCIDENCE[c][sex === 'm' ? 'm' : 'f']
  let rate = 0
  for (let a = age; a < age + 10; a++) rate += rows[Math.min(8, Math.floor(a / 10))]
  return 1 - Math.exp(-rate / 100_000)
}
function relRisk(c: Cancer3, i: EstimateInput) {
  let rr = 1
  if (c === 'bowel') {
    const r = ESTIMATE_RR.bowel
    if (i.smoker === 'current') rr *= r.current; else if (i.smoker === 'former') rr *= r.former
    rr *= i.drinksPerWeek > 14 ? r.drinks14 : i.drinksPerWeek >= 7 ? r.drinks7 : 1
    rr *= i.bmi >= 30 ? r.bmi30 : i.bmi >= 25 ? r.bmi25 : 1
    if (i.familyBowel) rr *= r.family
  } else if (c === 'breast') {
    const r = ESTIMATE_RR.breast
    if (i.smoker === 'current') rr *= r.current; else if (i.smoker === 'former') rr *= r.former
    rr *= i.drinksPerWeek > 14 ? r.drinks14 : i.drinksPerWeek >= 7 ? r.drinks7 : 1
    if (i.bmi >= 30 && i.age >= 50) rr *= r.bmi30after50
    if (i.familyBreast) rr *= r.family
  } else {
    const r = ESTIMATE_RR.cervical
    if (i.smoker === 'current') rr *= r.current; else if (i.smoker === 'former') rr *= r.former
  }
  return rr
}
/** Estimate of the 10-year chance of one cancer, or null if it does not apply (e.g. cervical for men). */
export function estimate(c: Cancer3, i: EstimateInput): number | null {
  if (c !== 'bowel' && i.sex === 'm') return null
  return Math.min(0.99, baseline10y(c, i.sex, i.age) * relRisk(c, i))
}
export function estimates(i: EstimateInput): Estimates {
  return { bowel: estimate('bowel', i), breast: estimate('breast', i), cervical: estimate('cervical', i) }
}
/**
 * "High" = the person's Estimate is at least as high as the lowest average risk of anyone Finland already
 * screens (lowest 10-year risk across the programme's age range, same sex). Age is just one input to the risk.
 */
export function estimateHigh(c: Cancer3, i: EstimateInput) {
  const e = estimate(c, i)
  const p = PROGRAMMES.find((x) => x.id === c)!
  let bar = Infinity
  for (let a = p.from; a <= p.to; a++) bar = Math.min(bar, baseline10y(c, i.sex, a))
  return e !== null && e >= bar
}
export const ESTIMATE_HOW = 'Estimate, not a clinical score. 10-year chance = Finnish Cancer Registry incidence for your age and sex × relative risks (smoking, alcohol, BMI, family history) from published meta-analyses. Screening is suggested when this is at least as high as the average risk of people Finland already screens.'

export const bmiOf = (heightCm: number, weightKg: number) => +(weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)
export const DEFAULT_CHECK: CheckInputs = {
  smoker: 'never', cigsPerDay: 15, yearsSmoked: 25, yearsQuit: 0, heightCm: 172, weightKg: 76, drinksPerWeek: 3,
  familyLung: false, familyBowel: false, familyBreast: false, education: 4, copd: false, personalCancer: false, ethnicity: 'white',
}
/** Lung model inputs from the check, or null for never-smokers (PLCOm2012 only covers ever-smokers). */
export function toRiskInputs(age: number, c: CheckInputs): RiskInputs | null {
  if (c.smoker === 'never') return null
  return { age, education: c.education, bmi: bmiOf(c.heightCm, c.weightKg), copd: c.copd, personalCancer: c.personalCancer, familyLung: c.familyLung, smoker: c.smoker, cigsPerDay: c.cigsPerDay, yearsSmoked: c.yearsSmoked, yearsQuit: c.smoker === 'current' ? 0 : c.yearsQuit, ethnicity: c.ethnicity }
}

// ---------- next step per cancer: the only thing the person sees ----------
export type CheckCancer = 'lung' | 'bowel' | 'breast' | 'cervical'
export type StepLevel = 'doctor' | 'act' | 'done' | 'none' | 'unknown'
export interface NextStep {
  id: CheckCancer
  level: StepLevel
  /** i18n key of the full sentence */
  say: string
  /** i18n key of the 2–3 word stamp */
  short: string
  /** false = does not apply to this person (breast/cervical for men) */
  applies: boolean
}
const LUNG_SYM = ['blood-cough', 'cough', 'hoarse', 'breathless', 'chest-pain']
const BOWEL_SYM = ['blood-stool', 'bowel-change']
export const CHECK_ORDER: CheckCancer[] = ['lung', 'bowel', 'breast', 'cervical']
const RANK: Record<StepLevel, number> = { doctor: 0, act: 1, unknown: 2, done: 3, none: 4 }

export function nextSteps(s: Pick<State, 'profile' | 'check' | 'diary'>, override?: CheckInputs): NextStep[] {
  const { age, sex } = s.profile
  const c = override ?? s.check?.inputs ?? null
  const sym = new Set(assess(s.diary).reasons.map((r) => r.tag))
  const mk = (id: CheckCancer, level: StepLevel, say: string, short: string, applies = true): NextStep => ({ id, level, say, short, applies })
  const symptomStep = (id: CheckCancer) => mk(id, 'doctor', 'ck.sym', 'ck.s.doctor2w')
  const ei: EstimateInput | null = age && c ? { age, sex: sex ?? 'x', smoker: c.smoker, drinksPerWeek: c.drinksPerWeek, bmi: bmiOf(c.heightCm, c.weightKg), familyBowel: c.familyBowel, familyBreast: c.familyBreast } : null

  return CHECK_ORDER.map((id) => {
    const prog = PROGRAMMES.find((p) => p.id === id)
    const applies = !prog || !sex || prog.sex.includes(sex)
    if (!applies) return mk(id, 'none', 'ck.notForYou', 'ck.s.none', false)
    if (id === 'lung' && LUNG_SYM.some((t) => sym.has(t))) return symptomStep(id)
    if (id === 'bowel' && BOWEL_SYM.some((t) => sym.has(t))) return symptomStep(id)
    if (!age) return mk(id, 'unknown', 'ck.needAge', 'ck.s.unknown')

    if (id === 'lung') {
      if (!c) return mk(id, 'unknown', 'ck.needAnswers', 'ck.s.unknown')
      if (c.smoker === 'never') return mk(id, 'none', 'ck.lung.never', 'ck.s.none')
      const ri = toRiskInputs(age, c)!
      if (plco(ri) >= PLCO_THRESHOLD) return mk(id, 'doctor', 'ck.lung.high', 'ck.s.discuss')
      return mk(id, 'none', c.smoker === 'current' ? 'ck.lung.lowSmoker' : 'ck.none', 'ck.s.none')
    }

    if (!ei) return mk(id, 'unknown', 'ck.needAnswers', 'ck.s.unknown')
    if (estimateHigh(id, ei)) return mk(id, 'act', 'ck.worth', 'ck.s.worth')
    return mk(id, 'none', 'ck.none', 'ck.s.none')
  })
}
/** The most pressing step first. */
export const byUrgency = (steps: NextStep[]) => [...steps].filter((x) => x.applies).sort((a, b) => RANK[a.level] - RANK[b.level])

export const addDays = (isoDate: string, n: number) => iso(new Date(new Date(isoDate.slice(0, 10) + 'T12:00:00').getTime() + n * DAY))
export { minusDays }

/** Next caring check-in: last + every N days, never in the past. */
export function nextCheckin(c: { lastAt?: string; everyDays: number }, nowIso = new Date().toISOString()) {
  const base = c.lastAt ?? nowIso
  const next = new Date(new Date(base).getTime() + c.everyDays * DAY).toISOString()
  return next < nowIso ? nowIso : next
}

// ---------- caring check-ins (spec 1.6) ----------
/** More often for people the screening check sends to a doctor / screening, or who logged a worrying symptom. */
export function checkinRecommended(s: Pick<State, 'profile' | 'check' | 'diary'>): { every: number; why: 'risk' | 'symptom' | null } {
  if (assess(s.diary).flag) return { every: 3, why: 'symptom' }
  if (nextSteps(s).some((x) => x.level === 'doctor' || x.level === 'act')) return { every: 3, why: 'risk' }
  return { every: 7, why: null }
}

/** When the next check-in is due (ISO), or null if off / not started. Not clamped to now. */
export function checkinDueAt(c: State['checkins']): string | null {
  if (!c.enabled || !c.lastAt) return null
  const due = new Date(new Date(c.lastAt).getTime() + c.everyDays * DAY).toISOString()
  return c.snoozedUntil && c.snoozedUntil > due ? c.snoozedUntil : due
}
export const checkinIsDue = (c: State['checkins'], nowIso = new Date().toISOString()) => {
  const due = checkinDueAt(c)
  return !!due && due <= nowIso
}

/** What the check-in asks about: the most worrying symptom from the most recent entry, and when it was first mentioned. */
export function checkinSubject(diary: DiaryEntry[], now = today()): { tag: string | null; ago: number } {
  const last = [...diary].filter((e) => e.tags.some((t) => t !== 'smoking')).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop()
  if (!last) return { tag: null, ago: 0 }
  const tag = ['blood-cough', 'blood-stool', 'blood', 'jaundice', 'weight-loss'].find((t) => last.tags.includes(t)) ?? last.tags.find((t) => t !== 'smoking')!
  const firstMention = diary.filter((e) => e.tags.includes(tag)).map((e) => e.createdAt.slice(0, 10)).sort()[0] ?? now
  return { tag, ago: daysBetween(firstMention, now) }
}
