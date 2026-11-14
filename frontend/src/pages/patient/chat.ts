// Scripted symptom-diary bot (no LLM). Transcript lives in a small local persisted store;
// diary entries go to the shared store so the hospital page can read them.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore, uid, type DiaryEntry } from '../../lib/store'
import { today, daysBetween } from '../../data/pathway'
import { extractTags, parseKg, parseSmoking, parseWhen, packYears, minusDays, type SmokeInfo } from './logic'
import { tr, type Key, type Vars } from './i18n'

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

/** Handle one user turn. `value` is set when a chip was tapped; `label` is what to echo. */
export function send(label: string, value?: string) {
  const st = useChat.getState()
  const lang = useStore.getState().lang
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
    if (value?.startsWith('d:')) date = minusDays(today(), +value.slice(2))
    else date = parseWhen(text) ?? today()
    addEntry(p.text, p.tags, date, p.source)
    out.push(bot('bot.saved', { date }))
    finish(p.source)
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
    const answer = value ?? ''
    const symLabel = p.tag ? tr(lang, `sym.${p.tag}`) : tr(lang, 'd.checkin')
    const extra = extractTags(text).filter((t) => t !== 'smoking')
    const keep = p.tag && (answer === 'still' || answer === 'worse' || (!answer && !/gone|better|ohi|parempi|borta|bättre/i.test(text)))
    const tags = [...new Set([...(keep && p.tag ? [p.tag] : []), ...extra])]
    const entryText = value ? `${symLabel}: ${label}` : `${symLabel}: ${text}`
    addEntry(entryText, tags, parseWhen(text) ?? today(), 'checkin')
    useStore.getState().set((s) => ({ checkins: { ...s.checkins, lastAt: new Date().toISOString() } }))
    out.push(bot('bot.thanks'))
  } else {
    // free text, nothing pending
    const tags = extractTags(text)
    const symptomTags = tags.filter((t) => t !== 'smoking')
    const smokeInfo = tags.includes('smoking') ? parseSmoking(text) : null
    const date = parseWhen(text, today(), !smokeInfo)
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

  useChat.getState().set({ msgs: [...history, me, ...out], pending, asked })
}

/** Push a caring check-in into the chat, referencing the last logged symptom. */
export function simulateCheckin() {
  const diary = useStore.getState().diary
  const last = [...diary].filter((e) => e.tags.some((t) => t !== 'smoking')).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop()
  const tag = last ? (['blood-cough', 'blood-stool', 'weight-loss'].find((t) => last.tags.includes(t)) ?? last.tags.find((t) => t !== 'smoking')!) : null
  const st = useChat.getState()
  const history = st.msgs.map((m) => (m.chips || m.datePicker ? { ...m, chips: undefined, datePicker: false } : m))
  const chips: Chip[] = [{ key: 'c.still', value: 'still' }, { key: 'c.better', value: 'better' }, { key: 'c.worse', value: 'worse' }, { key: 'c.gone', value: 'gone' }]
  const msg = tag && last
    ? bot('bot.checkin', { ago: daysBetween(last.createdAt.slice(0, 10), today()), sym: '@' + tag }, { chips })
    : bot('bot.checkinGeneric')
  st.set({ msgs: [...history, msg], pending: { kind: 'checkin', tag } })
}
