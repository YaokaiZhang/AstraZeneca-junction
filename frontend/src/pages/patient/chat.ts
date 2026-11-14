// Symptom-diary bot. Two paths that save diary entries the same way (source 'chat'):
//  - AI path (when /api/chat is up and the person has not turned AI replies off): typed free text goes,
//    with the recent transcript, language and today's date, to Claude on the server (server/llm.ts), which
//    returns a short reply + structured symptom tags / start date / kg / smoking. Urgency still comes from
//    logic.ts assess(); the app adds its own two-week and 112 notes.
//  - Scripted path (no LLM): keyword extraction + follow-up questions. Used for chip taps, check-in answers
//    and whenever the AI is off. One failed or slow (>8 s) AI reply switches the rest of the session to it.
// Transcript lives in a small local persisted store; diary entries go to the shared store so the hospital page can read them.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore, uid, type DiaryEntry } from '../../lib/store'
import { daysBetween, today } from '../../data/pathway'
import { assess, checkinSubject, extractTags, SYMPTOM_KEYS, parseKg, parseSmoking, parseWhen, packYears, minusDays, type SmokeInfo } from './logic'
import { fmtDate, tr, type Key, type Vars } from './i18n'
import type { Lang } from '../../lib/store'

export interface Chip { key: Key; value: string }
export interface Msg {
  id: string
  from: 'bot' | 'me'
  at: string
  key?: Key
  vars?: Vars
  text?: string
  chips?: Chip[]
  datePicker?: boolean
  /** written by the AI (shown with an "AI-written" label) */
  ai?: boolean
}

type Pending =
  | { kind: 'date'; text: string; tags: string[]; source: DiaryEntry['source'] }
  | { kind: 'blood' }
  | { kind: 'yesno'; tag: string }
  | { kind: 'kg' }
  | { kind: 'smoke' }
  | { kind: 'smokeHow'; status: 'current' | 'former' }
  | { kind: 'checkin'; tag: string | null }

interface ChatState {
  msgs: Msg[]
  pending: Pending | null
  asked: string[]
  smoke: SmokeInfo
  set: (p: Partial<ChatState>) => void
}

/** A message as plain text in the given language (used by the chat view and by notifications). */
export function msgText(lang: Lang, m: Msg): string {
  if (!m.key) return m.text ?? ''
  const vars: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(m.vars ?? {})) {
    if (k === 'date') vars[k] = fmtDate(String(v), lang, { day: 'numeric', month: 'long', ...(String(v).slice(0, 4) !== today().slice(0, 4) ? { year: 'numeric' } : {}) })
    else if (k === 'ago') vars[k] = Number(v) <= 0 ? tr(lang, 'ago.today') : tr(lang, 'ago.days', { n: v })
    else if (typeof v === 'string' && v.startsWith('@')) vars[k] = v.split(',').map((x) => tr(lang, `sym.${x.slice(1)}`).toLowerCase()).join(', ')
    else vars[k] = v
  }
  return tr(lang, m.key, vars)
}

export const helloMsg = (): Msg => ({ id: uid(), from: 'bot', at: new Date().toISOString(), key: 'bot.hello' })

export const useChat = create<ChatState>()(
  persist((set) => ({ msgs: [helloMsg()], pending: null, asked: [], smoke: {}, set: (p) => set(p) }), { name: 'ajoissa-patient-chat-v1' }),
)

const DATE_CHIPS: Chip[] = [
  { key: 'c.today', value: 'd:0' }, { key: 'c.1w', value: 'd:7' }, { key: 'c.2w', value: 'd:14' },
  { key: 'c.1m', value: 'd:30' }, { key: 'c.3m', value: 'd:90' },
]
const YESNO: Chip[] = [{ key: 'c.yes', value: 'yes' }, { key: 'c.no', value: 'no' }]

const bot = (key: Key, vars?: Vars, extra?: Partial<Msg>): Msg => ({ id: uid(), from: 'bot', at: new Date().toISOString(), key, vars, ...extra })
const syms = (tags: string[]) => tags.map((t) => '@' + t).join(',')

function addEntry(text: string, tags: string[], date: string, source: DiaryEntry['source']) {
  const e: DiaryEntry = { id: uid(), date, createdAt: new Date().toISOString(), text, tags, source }
  useStore.getState().set((s) => ({ diary: [...s.diary, e] }))
  return e
}
function patchLast(fn: (e: DiaryEntry) => DiaryEntry | null, pick: (e: DiaryEntry) => boolean) {
  useStore.getState().set((s) => {
    const idx = [...s.diary].reverse().findIndex(pick)
    if (idx < 0) return {}
    const i = s.diary.length - 1 - idx
    const diary = [...s.diary]
    const n = fn(diary[i])
    if (n) diary[i] = n
    return { diary }
  })
}

/** Decide the next follow-up question once nothing is pending. */
function nextQuestion(asked: string[], smoke: SmokeInfo): { msgs: Msg[]; pending: Pending | null; asked: string[] } {
  const diary = useStore.getState().diary
  const has = (t: string) => diary.some((e) => e.tags.includes(t))
  const ask = (id: string) => !asked.includes(id)
  const done = (id: string, msgs: Msg[], pending: Pending | null) => ({ msgs, pending, asked: [...asked, id] })
  if (has('weight-loss') && ask('kg') && !diary.some((e) => e.tags.includes('weight-loss') && parseKg(e.text) !== null))
    return done('kg', [bot('bot.q.kg', undefined, { chips: ['2', '4', '6', '10'].map((v) => ({ key: v + ' kg' as Key, value: v })) })], { kind: 'kg' })
  if (has('blood') && ask('blood'))
    return done('blood', [bot('bot.q.bloodWhere', undefined, { chips: [{ key: 'c.cough', value: 'cough' }, { key: 'c.stool', value: 'stool' }, { key: 'c.elsewhere', value: 'other' }] })], { kind: 'blood' })
  const yn = (tag: string) => done(tag, [bot(`bot.q.${tag}` as Key, undefined, { chips: YESNO })], { kind: 'yesno', tag })
  if (has('cough') && !has('blood-cough') && ask('blood-cough')) return yn('blood-cough')
  if (has('cough') && !has('breathless') && ask('breathless')) return yn('breathless')
  if ((has('abdominal-pain') || has('blood-stool')) && !has('bowel-change') && ask('bowel-change')) return yn('bowel-change')
  if (!has('smoking') && !smoke.status && ask('smoke'))
    return done('smoke', [bot('bot.q.smoke', undefined, { chips: [{ key: 'c.never', value: 'never' }, { key: 'c.current', value: 'current' }, { key: 'c.former', value: 'former' }] })], { kind: 'smoke' })
  return { msgs: [bot('bot.anything')], pending: null, asked }
}

function saveSmoking(info: SmokeInfo, out: Msg[]) {
  const st = useChat.getState()
  const smoke = { ...st.smoke, ...info }
  st.set({ smoke })
  const vars = { cpd: smoke.cpd ?? '?', yrs: smoke.years ?? '?', py: packYears(smoke.cpd, smoke.years) }
  addEntry(tr(useStore.getState().lang, 'bot.smokeSaved', vars), ['smoking'], today(), 'chat')
  out.push(bot('bot.smokeSaved', vars))
}

/** Smoking details mentioned in passing: save when complete, otherwise remember what was said. */
function storeSmoking(info: SmokeInfo, out: Msg[]) {
  const st = useChat.getState()
  if (info.status === 'never') st.set({ smoke: { status: 'never' } })
  else if (info.cpd && info.years) saveSmoking(info, out)
  else st.set({ smoke: { ...st.smoke, ...info } })
}

/** A symptom start date we believe: not in the future and not more than ~2 years back. */
const MAX_ONSET_DAYS = 730
export const plausibleOnset = (date: string, now = today()) => date <= now && daysBetween(date, now) <= MAX_ONSET_DAYS

/** Handle one user turn. `value` is set when a chip was tapped; `label` is what to echo. */
function sendScripted(label: string, value?: string, echoed = false) {
  const st = useChat.getState()
  const me: Msg = { id: uid(), from: 'me', at: new Date().toISOString(), text: label }
  const out: Msg[] = []
  let pending: Pending | null = null
  let asked = st.asked
  const text = value ?? label
  let p = st.pending
  // typed text that names a new symptom wins over a pending follow-up question
  if (!value && p && p.kind !== 'date' && p.kind !== 'checkin' && p.kind !== 'smokeHow') {
    const cur = p
    const fresh = extractTags(text).filter((t) => t !== 'smoking' && !(cur.kind === 'yesno' && t === cur.tag) && !(cur.kind === 'blood' && t.startsWith('blood')))
    if (fresh.length) p = null
  }
  // strip chips from earlier bot messages so old answers can't be re-tapped
  const history = st.msgs.map((m) => (m.chips || m.datePicker ? { ...m, chips: undefined, datePicker: false } : m))

  const finish = (src: DiaryEntry['source'] = 'chat') => {
    if (src === 'checkin') { out.push(bot('bot.thanks')); return }
    const n = nextQuestion(asked, useChat.getState().smoke)
    out.push(...n.msgs); pending = n.pending; asked = n.asked
  }

  if (p?.kind === 'date') {
    let date: string | null = null
    let reask = false
    if (value?.startsWith('d:')) date = minusDays(today(), +value.slice(2))
    else if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) date = value // picked in the calendar: trust it
    else {
      // "I smoke 20 a day for 30 years" answers smoking, not "since when?": keep it and ask again
      const smokeInfo = extractTags(text).includes('smoking') ? parseSmoking(text) : null
      if (smokeInfo) storeSmoking(smokeInfo, out)
      const parsed = parseWhen(text, today(), !smokeInfo)
      if (parsed && !plausibleOnset(parsed)) reask = true
      else if (parsed) date = parsed
      else if (smokeInfo) reask = true
      else date = today()
    }
    if (reask || !date) {
      out.push(bot('bot.since', undefined, { chips: DATE_CHIPS, datePicker: true }))
      pending = p
    } else {
      addEntry(p.text, p.tags, date, p.source)
      out.push(bot('bot.saved', { date }))
      finish(p.source)
    }
  } else if (p?.kind === 'blood') {
    const where = value ?? (/(cough|ysk|host)/i.test(text) ? 'cough' : /(stool|ulost|avför)/i.test(text) ? 'stool' : 'other')
    const tag = where === 'cough' ? 'blood-cough' : where === 'stool' ? 'blood-stool' : 'blood'
    patchLast((e) => ({ ...e, tags: [...new Set(e.tags.filter((t) => t !== 'blood').concat(tag))] }), (e) => e.tags.includes('blood'))
    out.push(bot('bot.noted', { syms: syms([tag]) }))
    finish()
  } else if (p?.kind === 'yesno') {
    const yes = value ? value === 'yes' : /^(y|yes|kyllä|joo|ja)/i.test(text.trim()) || extractTags(text).includes(p.tag)
    if (yes) {
      patchLast((e) => ({ ...e, tags: [...new Set([...e.tags, p.tag])] }), (e) => e.source === 'chat' && e.tags.some((t) => t !== 'smoking'))
      out.push(bot('bot.noted', { syms: syms([p.tag]) }))
    }
    finish()
  } else if (p?.kind === 'kg') {
    const kg = parseKg(text)
    if (kg !== null) patchLast((e) => ({ ...e, text: `${e.text} (−${kg} kg)` }), (e) => e.tags.includes('weight-loss'))
    finish()
  } else if (p?.kind === 'smoke') {
    const info = value ? { status: value as SmokeInfo['status'] } : parseSmoking(text)
    if (info.status === 'never') { st.set({ smoke: { status: 'never' } }); finish() }
    else if (info.cpd && info.years) { saveSmoking(info, out); finish() }
    else {
      st.set({ smoke: { ...st.smoke, ...info } })
      out.push(bot('bot.q.smokeHow')); pending = { kind: 'smokeHow', status: info.status ?? 'current' }
    }
  } else if (p?.kind === 'smokeHow') {
    const info = parseSmoking(text)
    if (!info.cpd) { const n = /(\d+)/.exec(text); if (n) info.cpd = +n[1] }
    saveSmoking({ status: p.status, ...info, ...(info.status === 'current' && p.status === 'former' ? { status: 'former' } : {}) }, out)
    finish()
  } else if (p?.kind === 'checkin') {
    saveCheckin(p.tag, value ?? null, label)
    out.push(bot('bot.thanks'))
  } else {
    // free text, nothing pending
    const tags = extractTags(text)
    const symptomTags = tags.filter((t) => t !== 'smoking')
    const smokeInfo = tags.includes('smoking') ? parseSmoking(text) : null
    const when = parseWhen(text, today(), !smokeInfo)
    const date = when && plausibleOnset(when) ? when : null
    if (symptomTags.length) {
      out.push(bot('bot.noted', { syms: syms(symptomTags) }))
      if (date) { addEntry(text, symptomTags, date, 'chat'); out.push(bot('bot.saved', { date })) }
      else { out.push(bot('bot.since', undefined, { chips: DATE_CHIPS, datePicker: true })); pending = { kind: 'date', text, tags: symptomTags, source: 'chat' } }
    }
    if (smokeInfo) {
      if (smokeInfo.status === 'never') st.set({ smoke: { status: 'never' } })
      else if (smokeInfo.cpd && smokeInfo.years) saveSmoking(smokeInfo, out)
      else if (!pending) { st.set({ smoke: { ...st.smoke, ...smokeInfo } }); out.push(bot('bot.q.smokeHow')); pending = { kind: 'smokeHow', status: smokeInfo.status === 'former' ? 'former' : 'current' } }
    }
    if (!symptomTags.length && !smokeInfo) out.push(bot('bot.unclear'))
    else if (!pending) finish()
  }

  useChat.getState().set({ msgs: [...history, ...(echoed ? [] : [me]), ...out], pending, asked })
}

// ---------------- AI path ----------------
interface AiState { server: 'unknown' | 'on' | 'off'; busy: boolean; set: (p: Partial<AiState>) => void }
/** Whether the server-side LLM endpoint is up, and whether a reply is being written. Not persisted. */
export const useAi = create<AiState>()((set) => ({ server: 'unknown', busy: false, set: (p) => set(p) }))

let healthCheck: Promise<void> | null = null
/** Ask the server once whether AI replies are available (GET /api/health). */
export function checkAi(force = false) {
  if (healthCheck && !force) return healthCheck
  healthCheck = fetch('/api/health', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3_000) })
    .then(async (r) => { const j = r.ok ? await r.json() : null; useAi.getState().set({ server: j?.ai ? 'on' : 'off' }) })
    .catch(() => useAi.getState().set({ server: 'off' }))
  return healthCheck
}
/** AI replies are used when the server has a key and the person has not switched them off. */
export const aiActive = (server: AiState['server'], aiChat: boolean | undefined) => server === 'on' && aiChat !== false

interface AiResult {
  reply: string
  symptoms: string[]
  started: string | null
  weightLostKg: number | null
  smoking: { status: SmokeInfo['status'] | null; cigarettesPerDay: number | null; yearsSmoked: number | null; yearsSinceQuit: number | null } | null
  followUp: string | null
  emergency: boolean
}

const aiMsg = (text: string, extra?: Partial<Msg>): Msg => ({ id: uid(), from: 'bot', at: new Date().toISOString(), text, ai: true, ...extra })
const withKg = (text: string, kg: number | null) => (kg && parseKg(text) === null ? `${text} (−${kg} kg)` : text)

/** Handle one typed message: AI when available, otherwise (or on any failure) the scripted bot. */
export function send(label: string, value?: string) {
  const ai = useAi.getState()
  if (ai.busy) return
  const p = useChat.getState().pending
  // chip taps and check-in answers stay scripted
  if (value !== undefined || p?.kind === 'checkin') return sendScripted(label, value)
  if (ai.server === 'unknown') { void checkAi().then(() => send(label, value)); return }
  if (!aiActive(ai.server, useStore.getState().aiChat)) return sendScripted(label, value)
  void sendAi(label)
}

const AI_TIMEOUT_MS = 8_000

async function sendAi(label: string) {
  const st = useChat.getState()
  const lang = useStore.getState().lang
  const pend = st.pending
  const history = st.msgs.map((m) => (m.chips || m.datePicker ? { ...m, chips: undefined, datePicker: false } : m))
  const me: Msg = { id: uid(), from: 'me', at: new Date().toISOString(), text: label }
  st.set({ msgs: [...history, me] })
  useAi.getState().set({ busy: true })
  const before = assess(useStore.getState().diary).flag
  // only the chat text itself: no profile, age, county or check answers
  const body = {
    lang,
    today: today(),
    flag: before,
    awaitingDateFor: pend?.kind === 'date' ? pend.tags : undefined,
    messages: [...history, me].slice(-14).map((m) => ({ from: m.from, text: msgText(lang, m) })).filter((m) => m.text),
  }
  let result: AiResult | null = null
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(AI_TIMEOUT_MS) })
    if (res.ok) result = (await res.json()) as AiResult
  } catch { /* network error / timeout: fall back */ }
  const ok = !!result && typeof result.reply === 'string'
  // one slow or failed reply and the rest of this session stays on the instant scripted bot
  useAi.getState().set(ok ? { busy: false } : { busy: false, server: 'off' })
  if (!ok || !result) return sendScripted(label, undefined, true)
  applyAi(label, result, pend, before)
}

function applyAi(label: string, r: AiResult, pend: Pending | null, flagBefore: boolean) {
  const out: Msg[] = [aiMsg(r.reply)]
  if (r.emergency) out.push(bot('bot.emergency'))
  let pending: Pending | null = null
  const kg = r.weightLostKg
  let kgUsed = false
  const symptoms = r.symptoms.filter((t) => t !== 'smoking' && (SYMPTOM_KEYS as readonly string[]).includes(t))

  const smokingSaid = !!(r.smoking?.status || r.smoking?.cigarettesPerDay || r.smoking?.yearsSmoked) || extractTags(label).includes('smoking')
  const started = r.started && plausibleOnset(r.started) ? r.started : null
  if (pend?.kind === 'date') {
    // the app had asked "since when?" for symptoms already noted
    const parsed = parseWhen(label, today(), !smokingSaid)
    const date = started ?? (parsed && plausibleOnset(parsed) ? parsed : null) ?? (smokingSaid || r.started || parsed ? null : today())
    if (date) {
      const text = pend.tags.includes('weight-loss') ? withKg(pend.text, kg) : pend.text
      kgUsed ||= text !== pend.text
      addEntry(text, [...new Set([...pend.tags, ...symptoms])], date, pend.source)
      out.push(bot('bot.saved', { date }))
    } else pending = pend
  } else if (symptoms.length) {
    const text = symptoms.includes('weight-loss') ? withKg(label, kg) : label
    kgUsed ||= text !== label || (kg !== null && parseKg(label) !== null)
    if (started) { addEntry(text, symptoms, started, 'chat'); out.push(bot('bot.saved', { date: started })) }
    else pending = { kind: 'date', text, tags: symptoms, source: 'chat' }
  }
  if (kg && !kgUsed) {
    // "about 4 kilos" answering a question about an earlier weight-loss entry
    patchLast((e) => (parseKg(e.text) === null ? { ...e, text: withKg(e.text, kg) } : null), (e) => e.tags.includes('weight-loss'))
  }

  if (r.smoking?.status || r.smoking?.cigarettesPerDay || r.smoking?.yearsSmoked) {
    const s = r.smoking
    const cur = useChat.getState().smoke
    if (s.status === 'never') useChat.getState().set({ smoke: { status: 'never' } })
    else {
      const info: SmokeInfo = {
        status: s.status ?? cur.status ?? 'current',
        ...(s.cigarettesPerDay ? { cpd: Math.round(s.cigarettesPerDay) } : {}),
        ...(s.yearsSmoked ? { years: Math.round(s.yearsSmoked) } : {}),
        ...(s.yearsSinceQuit ? { quit: Math.round(s.yearsSinceQuit), status: 'former' as const } : {}),
      }
      const merged = { ...cur, ...info }
      if (merged.cpd && merged.years) saveSmoking(merged, out)
      else useChat.getState().set({ smoke: merged })
    }
  }

  // the two-week note comes from the app's own rule, never from the model
  if (!flagBefore && assess(useStore.getState().diary).flag) out.push(bot('bot.flag'))

  if (pending && pending === pend) out.push(bot('bot.since', undefined, { chips: DATE_CHIPS, datePicker: true }))
  else if (pending) out.push(r.followUp ? aiMsg(r.followUp, { chips: DATE_CHIPS, datePicker: true }) : bot('bot.since', undefined, { chips: DATE_CHIPS, datePicker: true }))
  else if (r.followUp) out.push(aiMsg(r.followUp))

  const now = useChat.getState()
  now.set({ msgs: [...now.msgs, ...out], pending })
}

export const CHECKIN_CHIPS: Chip[] = [{ key: 'c.still', value: 'still' }, { key: 'c.better', value: 'better' }, { key: 'c.worse', value: 'worse' }, { key: 'c.gone', value: 'gone' }]

/** The warm check-in question as a chat message (falls back to a generic one when the diary has no symptom). */
export function checkinQuestion(withChips = true): { msg: Msg; tag: string | null } {
  const { tag, ago } = checkinSubject(useStore.getState().diary)
  const msg = tag ? bot('bot.checkin', { ago, sym: '@' + tag }, withChips ? { chips: CHECKIN_CHIPS } : undefined) : bot('bot.checkinGeneric')
  return { msg, tag }
}

/**
 * Save one check-in answer as a diary entry (source 'checkin') and restart the check-in clock.
 * `value` = a tapped chip (still/better/worse/gone); otherwise `label` is the person's own words.
 */
export function saveCheckin(tag: string | null, value: string | null, label: string) {
  const lang = useStore.getState().lang
  const symLabel = tag ? tr(lang, `sym.${tag}`) : tr(lang, 'd.checkin')
  const text = value ? '' : label
  const extra = extractTags(text).filter((t) => t !== 'smoking')
  const keep = tag && (value === 'still' || value === 'worse' || (!value && !/gone|better|ohi|parempi|borta|bättre/i.test(text)))
  const tags = [...new Set([...(keep && tag ? [tag] : []), ...extra])]
  addEntry(`${symLabel}: ${label}`, tags, (text && parseWhen(text)) || today(), 'checkin')
  useStore.getState().set((s) => ({ checkins: { ...s.checkins, lastAt: new Date().toISOString(), snoozedUntil: undefined } }))
}

/** Answer a due check-in from a prompt card (Today / Diary): saves it and mirrors the exchange in the chat transcript. */
export function answerCheckin(value: string | null, label: string) {
  const st = useChat.getState()
  const { msg, tag } = checkinQuestion(false)
  saveCheckin(tag, value, label)
  const history = st.msgs.map((m) => (m.chips || m.datePicker ? { ...m, chips: undefined, datePicker: false } : m))
  const me: Msg = { id: uid(), from: 'me', at: new Date().toISOString(), text: label }
  st.set({ msgs: [...history, msg, me, bot('bot.thanks')], pending: st.pending?.kind === 'checkin' ? null : st.pending })
}

/** Push a caring check-in into the chat, referencing the last logged symptom. */
export function simulateCheckin() {
  const st = useChat.getState()
  const history = st.msgs.map((m) => (m.chips || m.datePicker ? { ...m, chips: undefined, datePicker: false } : m))
  const { msg, tag } = checkinQuestion()
  st.set({ msgs: [...history, msg], pending: { kind: 'checkin', tag } })
}
