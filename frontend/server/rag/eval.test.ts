// Retrieval eval against the real curated corpus in knowledge/ (not the fixtures): each question's required sources
// must be retrieved. Fails loudly if a corpus edit drops a source a briefing depends on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadCorpusFrom } from './loadKnowledge.ts'
import { retrieve } from './retrieve.ts'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const corpus = loadCorpusFrom(here('../../knowledge'))
const evalSet = JSON.parse(readFileSync(here('./eval-questions.json'), 'utf8')) as {
  corpusVersion: string
  questions: { id: string; facts: Record<string, string>; requiredSourceIds: string[] }[]
}

test('eval set matches the corpus version', () => assert.equal(evalSet.corpusVersion, corpus.corpusVersion))

for (const q of evalSet.questions) {
  test(`eval ${q.id}`, () => {
    const r = retrieve(corpus, q.facts)
    assert.equal(r.status, 'ok')
    const got = new Set(r.chunks.map((c) => c.source.id))
    for (const id of q.requiredSourceIds) assert.ok(got.has(id), `${id} not retrieved; got ${[...got].join(', ')}`)
    assert.ok(r.chunks.every((c) => c.source.reviewStatus === 'approved'))
  })
}

test('each programme only retrieves its own sources (plus general ones)', () => {
  const own: Record<string, string> = { bowel: 'fcr-colorectal-2024', breast: 'fcr-breast-2024', cervical: 'fcr-cervical-2024' }
  for (const programme of ['bowel', 'breast', 'cervical']) {
    for (const step of ['detection', 'referral', 'capacity', 'reporting']) {
      const r = retrieve(corpus, { programme, data_year: 2024, pathway_step: step, action_ids: '' })
      if (r.status !== 'ok') continue
      for (const c of r.chunks) {
        const tags = c.source.programmes ?? []
        assert.ok(!tags.length || tags.includes(programme as 'bowel'), `${programme}/${step} retrieved ${c.source.id}`)
      }
      assert.ok(r.chunks.some((c) => c.source.id === own[programme]), `${programme}/${step} missed its registry statistics`)
    }
  }
})
