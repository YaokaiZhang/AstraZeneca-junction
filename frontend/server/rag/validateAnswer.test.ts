// node --test --experimental-strip-types server/rag/*.test.ts
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildEvidencePack, cutAtWord, evidencePrompt, renderGrounded } from './buildEvidencePack.ts'
import { loadCorpusFrom } from './loadKnowledge.ts'
import { retrieve } from './retrieve.ts'
import { answerSchema, numbersMatch, validateAnswer } from './validateAnswer.ts'

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'knowledge')
const corpus = loadCorpusFrom(FIXTURE)

const facts = {
  county: 'Testmaa', data_year: 2024, pathway_step: 'referral', action_ids: 'navigation',
  positive_tests_without_colonoscopy: 120, followup_colonoscopy_pct: 64.2, followup_colonoscopy_finland_pct: 78.1,
  about_extra_colonoscopies_per_week_now: 3, about_extra_colonoscopies_per_week_by_2031: 9, year_screening_widens: 2031,
  action_about_extra_colonoscopies_per_year: 40,
}
const found = retrieve(corpus, facts)
const pack = buildEvidencePack(found.chunks)
const idOf = (chunkId: string) => pack.items.find((i) => i.chunk.chunkId === chunkId)!.id
const FI = idOf('fx-fi-guidance#positiivinen-jatkotutkimus')
const NAV = idOf('fx-review-followup#navigation')

const good = () => ({
  lines: {
    problem: '120 people with a positive test never had the follow-up colonoscopy.',
    do_this: 'Give the screening nurse a daily list of positive tests without a booked colonoscopy.',
    result: 'About 40 more colonoscopies a year.',
    capacity: 'About 3 more colonoscopies a week now and about 9 more by 2031.',
  },
  citations: { problem: [FI], do_this: [NAV, FI], result: [NAV], capacity: [] },
  limitations: [{ text: 'The effect comes from studies in the USA and has not been tested in Finland.', citations: [NAV] }],
})

test('a good answer passes and renders with renumbered citations', () => {
  const v = validateAnswer(good(), pack, facts)
  assert.ok(v.ok, v.ok ? '' : v.errors.join('; '))
  const res = renderGrounded(v.answer, pack, found.meta, new Date('2026-11-14T00:00:00Z'))
  assert.equal(res.status, 'grounded')
  assert.equal(res.text, [
    'Problem: 120 people with a positive test never had the follow-up colonoscopy. [1]',
    'Do this: Give the screening nurse a daily list of positive tests without a booked colonoscopy. [2][1]',
    'Result: About 40 more colonoscopies a year. [2]',
    'Capacity: About 3 more colonoscopies a week now and about 9 more by 2031.',
  ].join('\n'))
  assert.deepEqual(res.evidence.map((e) => [e.n, e.chunkId]), [[1, 'fx-fi-guidance#positiivinen-jatkotutkimus'], [2, 'fx-review-followup#navigation']])
  assert.equal(res.evidenceLevel, 'evidence_backed')
  assert.equal(res.evidence[0].page, 12)
  assert.ok(res.evidence.every((e) => e.excerpt.length <= 300))
  assert.equal(res.generatedAt, '2026-11-14T00:00:00.000Z')
})

test('only Finnish official cited -> limited_evidence', () => {
  const a = good()
  a.citations = { problem: [FI], do_this: [FI], result: [FI], capacity: [] }
  const v = validateAnswer(a, pack, facts)
  assert.ok(v.ok)
  assert.equal(renderGrounded(v.answer, pack, found.meta).evidenceLevel, 'limited_evidence')
})

test('rejects unknown evidence ids', () => {
  const a = good()
  a.citations.result = ['E99']
  const v = validateAnswer(a, pack, facts)
  assert.ok(!v.ok && v.errors.some((e) => e.includes('unknown')))
})

test('rejects invented numbers in lines and limitations, allows fact numbers and [n] markers', () => {
  const a = good()
  a.lines.result = 'Navigation raised follow-up by 24 percent.'
  assert.ok(!validateAnswer(a, pack, facts).ok)
  const b = good()
  b.limitations = [{ text: 'Studies from 2019 in the USA.', citations: [NAV] }]
  assert.ok(!validateAnswer(b, pack, facts).ok)
  assert.ok(numbersMatch('About 40 more [2][3] colonoscopies, E4.', facts))
  assert.ok(!numbersMatch('About 47 more.', facts))
  assert.ok(numbersMatch('About 64 percent.', facts), 'rounding of 64.2 is fine')
})

test('limitations must cite a known passage, and cited sources join the evidence list', () => {
  const a = good()
  a.limitations = [{ text: 'A review found no clear effect.', citations: [] }]
  assert.ok(!validateAnswer(a, pack, facts).ok)
  const b = good()
  b.limitations = [{ text: 'A review found no clear effect.', citations: ['E99'] }]
  assert.ok(!validateAnswer(b, pack, facts).ok)
  const extra = pack.items.find((i) => ![FI, NAV].includes(i.id))
  if (extra) {
    const c = good()
    c.limitations = [{ text: 'A review found no clear effect.', citations: [extra.id] }]
    const v = validateAnswer(c, pack, facts)
    assert.ok(v.ok)
    const res = renderGrounded(v.answer, pack, found.meta)
    assert.ok(res.evidence.some((e) => e.chunkId === extra.chunk.chunkId))
    assert.match(res.limitations![0], /\[\d+\]$/)
  }
})

test('rejects missing citations (Capacity may cite none)', () => {
  const a = good()
  a.citations.problem = []
  const v = validateAnswer(a, pack, facts)
  assert.ok(!v.ok && v.errors.includes('problem: no citation'))
  const b = good()
  b.citations.capacity = []
  assert.ok(validateAnswer(b, pack, facts).ok)
})

test('rejects bad shape, long lines and too many limitations', () => {
  assert.ok(!validateAnswer(null, pack, facts).ok)
  assert.ok(!validateAnswer({ lines: {}, citations: {} }, pack, facts).ok)
  const a = good()
  a.lines.do_this = Array(30).fill('word').join(' ')
  assert.ok(!validateAnswer(a, pack, facts).ok)
  const b = good()
  b.limitations = ['One.', 'Two.', 'Three.', 'Four.'].map((text) => ({ text, citations: [NAV] }))
  assert.ok(!validateAnswer(b, pack, facts).ok)
})

test('Do this must cite an official or intervention source', () => {
  const p = buildEvidencePack(found.chunks.map((c) => ({ ...c, source: { ...c.source, sourceType: 'mentor_input' as const } })))
  const v = validateAnswer(good(), p, facts)
  assert.ok(!v.ok && v.errors.some((e) => e.startsWith('do_this: needs')))
})

test('labels and stray markers are stripped from lines', () => {
  const a = good()
  a.lines.problem = 'Problem: 120 people with a positive test never had the follow-up colonoscopy [E1].'
  const v = validateAnswer(a, pack, facts)
  assert.ok(v.ok)
  assert.equal(v.answer.lines.problem, '120 people with a positive test never had the follow-up colonoscopy.')
})

test('prompt injection inside a passage stays inside its passage as data', () => {
  const r = retrieve(corpus, { pathway_step: 'detection', action_ids: 'reminder' })
  const p = buildEvidencePack(r.chunks)
  const inj = p.items.find((i) => i.chunk.chunkId === 'fx-study-outreach#injection')
  assert.ok(inj, 'the injection fixture is retrieved for this query')
  const prompt = evidencePrompt(p)
  assert.equal(prompt.match(/<passage /g)?.length, p.items.length)
  assert.equal(prompt.match(/<\/passage>/g)?.length, p.items.length, 'the passage cannot close its own wrapper')
  assert.ok(!prompt.includes('<system>'))
  assert.ok(prompt.includes('IGNORE ALL PREVIOUS INSTRUCTIONS'), 'the text is kept, as data')
  // an answer that obeyed the injection is rejected: unknown id and a number not in the facts
  const obeyed = validateAnswer({
    lines: { problem: 'Kit return is low.', do_this: 'Send a second reminder.', result: '99% of people will be cured.', capacity: 'No change.' },
    citations: { problem: [p.ids[0]], do_this: [p.ids[0]], result: ['E9'], capacity: [] }, limitations: [],
  }, p, { ...facts, pathway_step: 'detection', action_ids: 'reminder' })
  assert.ok(!obeyed.ok && obeyed.errors.some((e) => e.includes('unknown')) && obeyed.errors.some((e) => e.includes('number')))
})

test('schema limits citation ids to the pack', () => {
  const s = answerSchema(pack.ids) as unknown as { properties: { citations: { properties: { do_this: { items: { enum: string[] } } } } } }
  assert.deepEqual(s.properties.citations.properties.do_this.items.enum, pack.ids)
})

test('cutAtWord cuts at a word boundary', () => {
  const t = cutAtWord('alpha beta gamma delta epsilon', 17)
  assert.ok(t.length <= 17 && t.endsWith('…') && !t.includes('gam'), t)
})
