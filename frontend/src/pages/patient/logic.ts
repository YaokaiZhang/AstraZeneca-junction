// Pure logic for the patient page: keyword symptom extraction (fi/sv/en, some ru/so),
// date parsing, smoking parsing, the two-week flag rule, PLCOm2012 and screening ages.
import { DAY, daysBetween, today } from '../../data/pathway'
import type { DiaryEntry, RiskInputs } from '../../lib/store'

export const SYMPTOM_KEYS = ['cough', 'weight-loss', 'blood-cough', 'blood-stool', 'blood', 'breathless', 'chest-pain', 'fatigue', 'bowel-change', 'jaundice', 'abdominal-pain', 'hoarse', 'smoking'] as const

const RX: [string, RegExp][] = [
  ['cough', /cough|yski|yskä|hosta|hostar|hostat|каш[её]?л|qufac/i],
  ['breathless', /breath|hengäst|hengenahd|hengitys|andfådd|andnöd|andas tungt|одышк|задыха|neef/i],
  ['chest-pain', /chest|rintakip|kipua? rinnassa|rinnassa kipu|bröstsmärt|ont i bröstet|боль в груди|груд|laab/i],
  ['fatigue', /tired|fatigue|exhaust|no energy|väsy|uupu|voimaton|trött|utmatt|orkeslös|устал|слабост|\bdaal|daciif/i],
  ['bowel-change', /bowel|diarrh|constipat|loose stool|ripul|ummet|suolen toimin|vatsan toimin|förstopp|diarré|avföringsvan|понос|запор|shuban/i],
  ['jaundice', /jaundic|yellow|keltai|gulsot|gul hy|gula ögon|желт|cagaar/i],
  ['abdominal-pain', /stomach|abdom|belly|tummy|vatsakip|mahakip|vatsaan sattuu|kipua vatsassa|ont i magen|magont|buksmärt|magsmärt|боль в живот|живот|calool/i],
  ['hoarse', /hoarse|käheä|käheys|heshet|\bhes\b|осип|хрип|xabeeb/i],
  ['weight-loss', /(lost|lose|losing|dropped|down)\b[^.]{0,20}\b(weight|kg|kilo|pound)|weight ?loss|laihtu|laihdu|laihtun|paino[^.]{0,15}(laski|putos|vähen|pudon)|kiloa? pois|menettänyt[^.]{0,10}kilo|gått ner|tappat[^.]{0,10}(vikt|kilo)|viktnedgång|minskat i vikt|похуд|сбросил|потерял[^.]{0,10}(вес|кг)|miisaan/i],
  ['smoking', /smok|cigar|tobacco|\bpacks?\b|tupak|polta|poltin|poltan|savuk|aski|röker|rökt|rökare|röka|cigarett|курю|курил|курен|сигарет|sigaar/i],
]
const BLOOD = /blood|bleed|veri|verta|veris|blod|кров|dhiig/i
const STOOL = /stool|poo|faec|fec|toilet|bottom|uloste|kakka|vessa|peräsuoli|avföring|bajs|toalett|стул|кал\b|saxar/i
const NEG = /(?:\bno|\bnot|\bnever|\bwithout|\bei|\beikä|\bingen|\binte|\butan|нет|не|без|\bmaya|\bma)\s+(?:\S+\s+)?$/i

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
    else if (tags.has('cough') || /cough(ing)? up|ysk|host|каш[её]?л/i.test(text)) tags.add('blood-cough')
    else tags.add('blood')
  }
  // "blood in stool" should not also count as a bowel change by itself
  return [...tags]
}

export const parseKg = (text: string) => {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|кг)/i.exec(text) ?? /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(text)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}

// ---------- dates ----------
const EN = ['jan(?:uary)?', 'feb(?:ruary)?', 'mar(?:ch)?', 'apr(?:il)?', 'may', 'june?', 'july?', 'aug(?:ust)?', 'sep(?:t(?:ember)?)?', 'oct(?:ober)?', 'nov(?:ember)?', 'dec(?:ember)?']
const FI = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu']
const SV = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
const RU = ['январ', 'феврал', 'март', 'апрел', 'ма[яй]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр']
const MONTH_ALT = EN.map((_, i) => `(?:${SV[i]}|${EN[i]}(?![a-zåäö])|${FI[i]}kuu\\S*|${RU[i]}\\S*)`)

const NUMW: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, few: 3, couple: 2,
  yksi: 1, yhden: 1, yhtä: 1, kaksi: 2, kahden: 2, kolme: 3, kolmen: 3, neljä: 4, viisi: 5, kuusi: 6, pari: 2, muutama: 3, muutaman: 3,
  en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, några: 3, par: 2,
  одну: 1, один: 1, два: 2, две: 2, три: 3, четыре: 4, пару: 2, несколько: 3,
}
const UNITS: [RegExp, number][] = [
  [/^(?:days?|päivä\S*|pv|dag(?:ar)?|дн\S*|день|maalmood|maalin)$/i, 1],
  [/^(?:weeks?|wks?|viikko\S*|vko|veck\S*|недел\S*|toddobaad)$/i, 7],
  [/^(?:months?|kuukau\S*|kk|månad\S*|mån|месяц\S*|bil(?:ood)?)$/i, 30],
  [/^(?:years?|vuo\S*|år|лет|год\S*|sano)$/i, 365],
]

const iso = (d: Date) => d.toISOString().slice(0, 10)
const minusDays = (now: string, n: number) => iso(new Date(new Date(now + 'T12:00:00').getTime() - n * DAY))

/** Pull a YYYY-MM-DD out of free text ("since 2 October", "3 weeks", "eilen", "2.10."). */
export function parseWhen(text: string, now: string = today(), allowYears = true): string | null {
  // drop smoking frequencies ("a pack a day", "20 per day") so they don't read as "1 day ago"
  const s = text.toLowerCase().replace(/(?:\ba|per|om|в)\s+(?:day|dag|день)(?!\s*(?:ago|sedan|назад))|päivässä/g, ' ')
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
  if ((m = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?![\d,]|\s*(?:kg|kilo|aski|pack|paket|кг))/.exec(s))) { const r = mk(+m[1], +m[2] - 1, m[3] ? +m[3] : undefined); if (r) return r }
  for (let i = 0; i < 12; i++) {
    const alt = MONTH_ALT[i]
    if ((m = new RegExp(`(\\d{1,2})\\.?\\s*(?:of\\s+)?${alt}`, 'i').exec(s))) return mk(+m[1], i)
    if ((m = new RegExp(`(?:^|\\s)${alt}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').exec(s))) return mk(+m[1], i)
  }
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`(?:since|from|sedan|från|alkaen|lähtien|с|в)\\s+${MONTH_ALT[i]}|${FI[i]}kuusta`, 'i').test(s)) return mk(1, i)
  }
  if (/yesterday|eilen|igår|i går|вчера|shalay/.test(s)) return minusDays(now, 1)
  if (/last week|viime viikolla|förra veckan|прошлой неделе/.test(s)) return minusDays(now, 7)
  if (/last month|viime kuussa|förra månaden|прошлом месяце/.test(s)) return minusDays(now, 30)
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
  if (/\btoday\b|tänään|idag|сегодня|maanta/.test(s)) return now
  return null
}

// ---------- smoking ----------
export interface SmokeInfo { status?: 'never' | 'current' | 'former'; cpd?: number; years?: number; quit?: number }
export function parseSmoking(text: string): SmokeInfo {
  const s = text.toLowerCase()
  const out: SmokeInfo = {}
  if (/never smok|don'?t smoke|non.?smoker|en ole (koskaan )?(tupakoinut|polttanut)|en tupakoi|aldrig rökt|röker inte|не курю|никогда не курил|weligay/.test(s)) return { status: 'never' }
  if (/quit|stopped|gave up|former|used to|lopet|slutat|slutade|бросил|joojiy/.test(s)) out.status = 'former'
  else if (/smok|tupak|polt|röker|курю|sigaar/.test(s)) out.status = 'current'
  let m: RegExpExecArray | null
  if ((m = /(\d+(?:[.,]\d+)?|a|one|half|yksi|puoli|ett|en|halv|одну|пол)?\s*(?:packs?|aski\S*|paket\S*|пачк\S*|baako)/.exec(s))) {
    const w = m[1]
    const n = !w ? 1 : /half|puoli|halv|пол/.test(w) ? 0.5 : /^\d/.test(w) ? parseFloat(w.replace(',', '.')) : 1
    out.cpd = Math.round(n * 20)
  } else if ((m = /(\d+)\s*(?:cig\S*|savuk\S*|tupak\S*|sätk\S*|сигарет\S*|sigaar\S*|a day|per day|\/day|päivässä|om dagen|per dag|om dan|в день|maalintii)/.exec(s))) out.cpd = +m[1]
  const quitM = /(\d+)\s*(?:years?|yrs?|vuotta|år|лет|года?|sano)\s*(?:ago|sitten|sedan|назад|ka hor)/.exec(s)
  if (quitM) { out.quit = +quitM[1]; out.status = 'former' }
  const yrsRx = /(?:for\s+|)(\d+)\s*(?:years?|yrs?|vuotta|vuoden|vuosi|år|лет|года?|sano)(?!\s*(?:ago|sitten|sedan|назад|ka hor))/g
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

// ---------- screening programmes ----------
export const PROGRAMMES = [
  { id: 'bowel' as const, from: 56, to: 74, sex: ['f', 'm', 'x'] },
  { id: 'breast' as const, from: 50, to: 69, sex: ['f', 'x'] },
  { id: 'cervical' as const, from: 30, to: 65, sex: ['f', 'x'] },
]

export const addDays = (isoDate: string, n: number) => iso(new Date(new Date(isoDate.slice(0, 10) + 'T12:00:00').getTime() + n * DAY))
export { minusDays }

/** Next caring check-in: last + every N days, never in the past. */
export function nextCheckin(c: { lastAt?: string; everyDays: number }, nowIso = new Date().toISOString()) {
  const base = c.lastAt ?? nowIso
  const next = new Date(new Date(base).getTime() + c.everyDays * DAY).toISOString()
  return next < nowIso ? nowIso : next
}
