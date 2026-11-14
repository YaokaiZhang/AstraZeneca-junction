// Demo seed: realistic example patient so every view has something to show.
import { useStore, uid, type CheckInputs, type DiaryEntry } from '../../lib/store'
import { today } from '../../data/pathway'
import { bmiOf, DEFAULT_CHECK, estimates, minusDays, plco, toRiskInputs } from './logic'
import { useChat, helloMsg, type Msg } from './chat'

export function seedDemo() {
  const now = today()
  const ago = (n: number) => minusDays(now, n)
  const at = (n: number, h = 10) => `${ago(n)}T${String(h).padStart(2, '0')}:15:00.000Z`
  const diary: DiaryEntry[] = [
    { id: uid(), date: ago(42), createdAt: at(30), text: 'Cough since early October, worse in the mornings.', tags: ['cough'], source: 'chat' },
    { id: uid(), date: ago(30), createdAt: at(30, 11), text: 'Lost about 4 kg without trying (−4 kg)', tags: ['weight-loss'], source: 'chat' },
    { id: uid(), date: ago(30), createdAt: at(30, 12), text: 'Smoked a pack a day for 30 years.', tags: ['smoking'], source: 'chat' },
    { id: uid(), date: ago(25), createdAt: at(25), text: 'Getting out of breath on the stairs.', tags: ['breathless'], source: 'chat' },
    { id: uid(), date: ago(16), createdAt: at(16), text: 'Cough: still there', tags: ['cough'], source: 'checkin' },
    { id: uid(), date: ago(9), createdAt: at(9), text: 'Very tired in the afternoons.', tags: ['fatigue'], source: 'chat' },
  ]
  const check: CheckInputs = { ...DEFAULT_CHECK, smoker: 'current', cigsPerDay: 20, yearsSmoked: 30, heightCm: 178, weightKg: 77, drinksPerWeek: 8, education: 3 }
  const inputs = toRiskInputs(64, check)!
  const est = estimates({ age: 64, sex: 'm', smoker: check.smoker, drinksPerWeek: check.drinksPerWeek, bmi: bmiOf(check.heightCm, check.weightKg), familyBowel: false, familyBreast: false })
  useStore.getState().set({
    profile: { age: 64, sex: 'm', county: 'Kainuu' },
    diary,
    risk: { inputs, prob6y: plco(inputs), at: new Date().toISOString() },
    check: { inputs: check, est, at: new Date().toISOString() },
    pathway: { cancer: 'lung', dates: { gp: ago(28), referral: ago(21) } },
    barriers: [],
    checkins: { enabled: true, everyDays: 3, auto: true, lastAt: at(16) },
  })
  const m = (from: Msg['from'], d: number, x: Partial<Msg>): Msg => ({ id: uid(), from, at: at(d), ...x })
  useChat.getState().set({
    msgs: [
      helloMsg(),
      m('me', 30, { text: 'Cough since early October, worse in the mornings.' }),
      m('bot', 30, { key: 'bot.noted', vars: { syms: '@cough' } }),
      m('me', 30, { text: 'Lost about 4 kg without trying' }),
      m('bot', 30, { key: 'bot.since' }),
      m('me', 30, { text: '1 month ago' }),
      m('bot', 30, { key: 'bot.saved', vars: { date: ago(30) } }),
      m('bot', 30, { key: 'bot.q.smoke' }),
      m('me', 30, { text: 'Smoked a pack a day for 30 years.' }),
      m('bot', 30, { key: 'bot.smokeSaved', vars: { cpd: 20, yrs: 30, py: 30 } }),
      m('me', 25, { text: 'Getting out of breath on the stairs.' }),
      m('bot', 25, { key: 'bot.noted', vars: { syms: '@breathless' } }),
      m('bot', 16, { key: 'bot.checkin', vars: { ago: 14, sym: '@cough' } }),
      m('me', 16, { text: 'Still there' }),
      m('bot', 16, { key: 'bot.thanks' }),
      m('me', 9, { text: 'Very tired in the afternoons.' }),
      m('bot', 9, { key: 'bot.noted', vars: { syms: '@fatigue' } }),
      m('bot', 9, { key: 'bot.anything' }),
    ],
    pending: null,
    asked: ['kg', 'smoke', 'blood-cough', 'breathless'],
    smoke: { status: 'current', cpd: 20, years: 30 },
  })
}

export function erasePatient() {
  useStore.getState().set({
    profile: {}, diary: [], risk: null, check: null, pathway: { cancer: 'lung', dates: {} }, barriers: [],
    checkins: { enabled: false, everyDays: 7 }, sharing: { hospital: false, stats: false },
  })
  useChat.getState().set({ msgs: [helloMsg()], pending: null, asked: [], smoke: {} })
}
