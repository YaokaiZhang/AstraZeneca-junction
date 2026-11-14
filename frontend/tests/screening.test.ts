// Sanity tests for the screening calculations of all three programmes. They pin the figures the demo and the pitch
// quote, so a data or model edit that changes them fails loudly. Run: npm run test:screening
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCREENING, SCREENING_FI, screeningById } from '../src/pages/monitor/data'
import { EMPTY_PLAN, evaluate, flags, in2031, losses } from '../src/pages/monitor/model'
import { weakestStep } from '../src/pages/monitor/plain'
import { BREAST, BREAST_FI } from '../src/pages/monitor/breastData'
import { CERVICAL, CERVICAL_FI } from '../src/pages/monitor/cervicalData'
import { breastView, cervicalView, stepsBehind } from '../src/pages/monitor/programmes'

const close = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not within ${tol} of ${b}`)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// ---------- data integrity ----------

test('each programme has all 22 wellbeing services counties (Helsinki included, Åland not)', () => {
  for (const rows of [SCREENING, BREAST, CERVICAL]) {
    assert.equal(rows.length, 22)
    assert.ok(rows.some((r) => r.id === 'helsinki') && rows.some((r) => r.id === 'pohjois-savo'))
    assert.ok(!rows.some((r) => r.id === 'ahvenanmaa'))
  }
})

test('county counts add up to the Finland row (bowel and breast)', () => {
  assert.equal(sum(SCREENING.map((r) => r.invited)), SCREENING_FI.invited)
  assert.equal(sum(SCREENING.map((r) => r.noColonoscopy)), SCREENING_FI.noColonoscopy)
  assert.equal(sum(BREAST.map((r) => r.invited)), BREAST_FI.invited)
  assert.equal(sum(BREAST.map((r) => r.cancers)), BREAST_FI.cancers)
})

// ---------- bowel ----------

test('bowel: Pohjois-Savo figures and the step to start with', () => {
  const r = screeningById('pohjois-savo')!
  assert.equal(r.noColonoscopy, 226)
  assert.equal(r.medianMonths, 3.7)
  assert.equal(weakestStep(r), 'referral')
  assert.deepEqual(flags(r), { detection: false, referral: true, capacity: true })
})

test('bowel: 2031 widening (Finland about +64% invites and +125 colonoscopies a week; Helsinki +63% and +10.6)', () => {
  const fi = in2031(SCREENING_FI)
  close((fi.growth - 1) * 100, 64, 0.5, 'Finland invite growth %')
  close(fi.extraWeek, 125.5, 0.5, 'Finland extra colonoscopies a week')
  const h = in2031(screeningById('helsinki')!)
  close((h.growth - 1) * 100, 63.2, 0.5, 'Helsinki invite growth %')
  close(h.extraWeek, 10.6, 0.05, 'Helsinki extra a week')
})

test('bowel: the follow-up list (patient navigation) in Helsinki and Pohjois-Savo', () => {
  const h = evaluate(screeningById('helsinki')!, { ...EMPTY_PLAN, referral: ['navigation'] })
  close(h.referral.colonoscopies, 209, 1, 'Helsinki extra colonoscopies a year')
  close(h.total.cancers, 9.1, 0.1, 'Helsinki estimated cancers')
  const p = evaluate(screeningById('pohjois-savo')!, { ...EMPTY_PLAN, referral: ['navigation'] })
  close(p.referral.colonoscopies, 123, 1, 'Pohjois-Savo extra colonoscopies a year')
  close(p.queue.extraPerWeek, 2.4, 0.05, 'Pohjois-Savo extra a week now')
})

test('bowel: queue model (Pohjois-Savo about 9.9 a week, 159 waiting, 77 catch-up to 1.9 months)', () => {
  const r = screeningById('pohjois-savo')!
  const q = evaluate(r, EMPTY_PLAN).queue
  close(q.arrivalsWeek, 9.9, 0.05, 'arrivals a week')
  close(q.queueNow, 159, 1, 'people waiting')
  close(q.catchUp, 77, 1, 'catch-up')
  close(losses(r).referral.lost, 226, 0, 'lost at referral')
})

// ---------- breast ----------

test('breast: published figures (Finland 81.6% attend, 1,904 cancers; Helsinki 74.3%; Satakunta 26.5% no result)', () => {
  assert.equal(BREAST_FI.attendedPct, 81.6)
  assert.equal(BREAST_FI.cancers, 1904)
  assert.equal(BREAST.find((r) => r.id === 'helsinki')!.attendedPct, 74.3)
  assert.equal(BREAST.find((r) => r.id === 'satakunta')!.noHistologyPct, 26.5)
})

test('breast: Helsinki starts with attendance; text reminders estimate about 2,050 more women', () => {
  const v = breastView('helsinki')!
  assert.equal(v.start.kind, 'attendance')
  assert.equal(v.start.estimate, true)
  assert.match(v.start.result, /about 2,050 more women screened/)
  assert.ok(v.tiles[0].behind && v.tiles[2].behind)
})

test('breast: a big result gap is called a likely reporting gap, a small one a possible one', () => {
  const s = breastView('satakunta')!
  assert.equal(s.start.kind, 'reporting')
  assert.match(s.verdict, /most likely a reporting gap/)
  assert.match(breastView('varsinais-suomi')!.verdict, /possibly a reporting gap/)
})

test('breast: Pohjois-Savo is on track, above the 80% goal, and the action is to do even better on attendance', () => {
  const v = breastView('pohjois-savo')!
  assert.equal(v.onTrack, true)
  assert.match(v.verdict, /above the 80% goal/)
  assert.equal(v.start.kind, 'attendance')
})

// ---------- cervical ----------

test('cervical: published figures (Finland 73.5% / 1.2% referred / 84.7% colposcopy; Pohjois-Karjala lowest at 67.8%)', () => {
  assert.equal(CERVICAL_FI.participationPct, 73.5)
  assert.equal(CERVICAL_FI.referredColposcopyPct, 1.2)
  assert.equal(CERVICAL_FI.colposcopyOfReferredPct, 84.7)
  const low = [...CERVICAL].sort((a, b) => a.participationPct - b.participationPct)[0]
  assert.equal(low.id, 'pohjois-karjala')
  assert.equal(low.participationPct, 67.8)
})

test('cervical: Varsinais-Suomi (4 of 190 colposcopies on record) is a reporting gap, not a follow-up failure', () => {
  const v = cervicalView('varsinais-suomi')!
  assert.equal(v.start.kind, 'reporting')
  assert.ok(v.tiles[1].missing)
  assert.match(v.verdict, /4 of 190/)
  assert.match(v.verdict, /reporting gap/)
  assert.equal(v.list, undefined)
  assert.equal(stepsBehind('cervical', 'varsinais-suomi'), 2)
})

test('cervical: Pohjois-Savo starts with attendance; self-sampling kits reach about 1,090 untested women, against about 960 with a reminder letter', () => {
  const v = cervicalView('pohjois-savo')!
  assert.equal(v.start.kind, 'attendance')
  assert.match(v.start.result, /About 1,090 of the 3,670 untested women tested a year with a mailed kit, against about 960 with a reminder letter alone/)
})

test('cervical: Satakunta is on track against our lines but still below the 80% goal; Helsinki starts with the wait', () => {
  const s = cervicalView('satakunta')!
  assert.equal(s.onTrack, true)
  assert.match(s.verdict, /still below the 80% goal/)
  assert.equal(cervicalView('helsinki')!.start.kind, 'wait')
})

test('no programme view quotes a number with more than one decimal or a NaN', () => {
  for (const r of BREAST) for (const v of [breastView(r.id)!, cervicalView(r.id)!]) {
    const text = [v.verdict, v.start.result, v.start.takes, ...v.tiles.map((t) => `${t.big} ${t.line}`)].join(' ')
    assert.ok(!/NaN|undefined|\d\.\d\d/.test(text), `${r.id}: ${text}`)
  }
})

test('cervical: Pohjois-Pohjanmaa follow-up gap mentions a possible reporting gap (39 of 146 with no follow-up info)', () => {
  const v = cervicalView('pohjois-pohjanmaa')!
  assert.equal(v.startStep, 1)
  assert.match(v.verdict, /39 of them the register has no follow-up information/)
  assert.match(v.start.result, /possibly a reporting gap/)
})

test('briefing facts carry the reporting-gap flag whenever the start card says it', () => {
  assert.equal(cervicalView('pohjois-pohjanmaa')!.facts.reporting_gap, 'possibly, in part')
  assert.equal(cervicalView('varsinais-suomi')!.facts.reporting_gap, 'most likely')
  assert.equal(breastView('satakunta')!.facts.reporting_gap, 'most likely')
  assert.equal(breastView('varsinais-suomi')!.facts.reporting_gap, 'possibly')
  assert.equal(cervicalView('pohjois-savo')!.facts.reporting_gap, undefined)
  assert.equal(breastView('helsinki')!.facts.reporting_gap, undefined)
})
