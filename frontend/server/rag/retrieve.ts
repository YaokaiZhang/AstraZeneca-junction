// Keyword retrieval over the approved corpus. The query is built only from the controlled facts
// pathway_step and action_ids (never from free text), as a list of concepts; each concept has Finnish and
// English variants. Scoring is BM25 over concept counts (heading and keywords count double), times a
// source-type boost, then a diversity pass (max 2 passages per source, try to include a Finnish official
// passage and an intervention passage) and a minimum-match gate.
import { isIntervention, isOfficial, type Chunk, type Corpus, type PathwayStep, type RetrievalResult, type ScoredChunk, type SourceType } from './types.ts'

export const QUERY_VERSION = 'kw-2026-11-14.2'
export const TOP_K = 6
const MAX_PER_SOURCE = 2
/** fewer qualifying passages than this -> insufficient_evidence */
export const MIN_QUALIFYING = 2

/**
 * Concept -> variants. Single words match a token exactly; a variant of 5+ characters also matches as a token prefix
 * (light Finnish stemming: kolonoskopia -> kolonoskopiaan), and one of 7+ characters also inside a token (compounds:
 * suolistosyöpäseulonta). Variants with a space match as a phrase at a word start (hyphens count as spaces).
 */
export const SYNONYMS: Record<string, string[]> = {
  fit: ['fit', 'fobt', 'gfobt', 'ulostetest', 'ulostenäyt', 'ulostenäyte', 'stool test', 'stool sample', 'stool based', 'faecal immunochemical', 'fecal immunochemical', 'faecal occult', 'fecal occult', 'test kit', 'home test', 'näytteenott'],
  colonoscopy: ['colonoscop', 'kolonoskop', 'tähystys', 'tähystyk', 'endoscop', 'endoskop'],
  followup: ['follow up', 'followup', 'jatkotutki', 'jatkotutkimu', 'diagnostic evaluation', 'diagnostic follow', 'completion', 'completed'],
  referral: ['referral', 'referred', 'lähete', 'lähettee', 'lähett'],
  positive: ['positive', 'positiivi', 'abnormal'],
  screening: ['screening', 'screened', 'seulon', 'seulont', 'seulonna', 'seulottav'],
  participation: ['participat', 'osallistu', 'uptake', 'attendance', 'adherence', 'kit return', 'return rate', 'returned'],
  reminder: ['reminder', 'remind', 'muistutu', 'muistutt', 'muistute', 'muistuk'],
  outreach: ['outreach', 'mailed', 'letter', 'kirje', 'sms', 'text messag', 'tekstiviest', 'phone call', 'telephone', 'puhelin', 'puhelu', 'soitt'],
  navigation: ['navigat', 'navigaat', 'navigaattor', 'navigator', 'hoitaja', 'nurse', 'coordinator', 'koordinaatt', 'koordinoi'],
  waiting: ['waiting', 'wait time', 'waits', 'delay', 'jono', 'jonot', 'jonon', 'jonoa', 'jonossa', 'odotu', 'odotus', 'odotusai', 'hoitoon pääsy', 'hoitoonpääs', 'queue', 'backlog', 'time to colonoscopy', 'timeliness'],
  capacity: ['capacity', 'kapasitee', 'resourc', 'resurss', 'workforce', 'henkilöstö'],
  multilingual: ['multilingual', 'monikiel', 'vieraskiel', 'language', 'äidinkiel', 'mother tongue', 'translat', 'käännet', 'käännö', 'immigrant', 'maahanmuutt', 'foreign born', 'ulkomaalaistaust'],
  bowel: ['bowel', 'colorectal', 'colon cancer', 'rectal', 'suolisto', 'suolistosyöp', 'paksusuol', 'peräsuol', 'crc'],
  equality: ['equalit', 'equity', 'inequalit', 'yhdenvertai', 'tasa arvo', 'eriarvo', 'disparit', 'underserved'],
  clinician: ['clinician', 'physician', 'general practitioner', 'gp', 'primary care', 'lääkär', 'perusterveydenhu', 'provider', 'terveyskesk'],
  tracking: ['tracking', 'track', 'tracked', 'ownership', 'responsib', 'rekisteriseuranta', 'vastuuhenkil'],
  booking: ['booking', 'scheduling', 'schedul', 'ajanvara', 'varataan', 'automat', 'automaatt', 'automatic'],
}

/** Concepts per pathway step and per action id. Weights: step and action concepts 1, background 0.4. */
const STEP_CONCEPTS: Record<PathwayStep, string[]> = {
  referral: ['positive', 'followup', 'colonoscopy', 'referral'],
  capacity: ['waiting', 'capacity', 'colonoscopy'],
  detection: ['participation', 'fit', 'screening'],
  none: ['screening', 'participation'],
}
const ACTION_CONCEPTS: Record<string, string[]> = {
  navigation: ['navigation', 'tracking', 'followup', 'positive'],
  'patient-reminder': ['reminder', 'outreach', 'followup', 'positive'],
  'clinician-reminder': ['clinician', 'reminder', 'followup'],
  'auto-referral': ['booking', 'tracking', 'referral', 'followup'],
  reminder: ['reminder', 'outreach', 'participation'],
  multilingual: ['multilingual', 'equality', 'reminder', 'participation'],
  clinician: ['clinician', 'reminder', 'participation'],
  'catch-up': ['waiting', 'capacity', 'colonoscopy'],
}
const BACKGROUND = ['bowel', 'screening']

const BOOST: Record<SourceType, number> = {
  official_policy: 1.3, official_guidance: 1.3, official_statistics: 1.25,
  systematic_review: 1.15, primary_study: 1.0, mentor_input: 0.85,
}

export interface Query {
  /** concept -> weight */
  weights: Map<string, number>
  /** concepts from the step and the actions (not background) */
  core: string[]
  /** concepts from the actions only */
  action: string[]
}

/** The controlled query for the facts' pathway_step and action_ids. Unknown values contribute nothing. */
export function buildQuery(facts: Record<string, number | string>): Query {
  const step = typeof facts.pathway_step === 'string' && facts.pathway_step in STEP_CONCEPTS ? (facts.pathway_step as PathwayStep) : 'none'
  const ids = typeof facts.action_ids === 'string' ? facts.action_ids.split(',').map((s) => s.trim()).filter((s) => Object.hasOwn(ACTION_CONCEPTS, s)) : []
  const action = [...new Set(ids.flatMap((id) => ACTION_CONCEPTS[id]))]
  const core = [...new Set([...STEP_CONCEPTS[step], ...action])]
  const weights = new Map<string, number>()
  for (const c of BACKGROUND) weights.set(c, 0.4)
  for (const c of core) weights.set(c, 1)
  return { weights, core, action }
}

const norm = (s: string) => s.toLowerCase().normalize('NFC').replace(/[-‐‑–—_/]/g, ' ')
const tokenize = (s: string) => norm(s).match(/[\p{L}\p{N}]+/gu) ?? []
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const tokenMatches = (tok: string, v: string) => tok === v || (v.length >= 5 && tok.startsWith(v)) || (v.length >= 7 && tok.includes(v))

/** How often each concept occurs in a text. */
export function conceptCounts(text: string): Map<string, number> {
  const toks = tokenize(text)
  const flat = toks.join(' ')
  const out = new Map<string, number>()
  for (const [concept, variants] of Object.entries(SYNONYMS)) {
    let n = 0
    const words = variants.filter((v) => !v.includes(' ')).map(norm)
    for (const t of toks) if (words.some((v) => tokenMatches(t, v))) n++
    for (const p of variants.filter((v) => v.includes(' '))) {
      n += flat.match(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(norm(p))}`, 'gu'))?.length ?? 0
    }
    if (n) out.set(concept, n)
  }
  return out
}

interface DocStats { chunk: Chunk; tf: Map<string, number>; len: number }
const statsCache = new WeakMap<Chunk, DocStats>()
function stats(chunk: Chunk): DocStats {
  let s = statsCache.get(chunk)
  if (!s) {
    const tf = conceptCounts(chunk.text)
    for (const extra of [chunk.heading, chunk.keywords.join(', ')]) {
      for (const [c, n] of conceptCounts(extra)) tf.set(c, (tf.get(c) ?? 0) + 2 * n)
    }
    s = { chunk, tf, len: Math.max(1, tokenize(chunk.text).length) }
    statsCache.set(chunk, s)
  }
  return s
}

/** Score every chunk with BM25 over concepts, times the source-type boost. */
export function scoreAll(corpus: Corpus, q: Query): ScoredChunk[] {
  const sources = new Map(corpus.sources.map((s) => [s.id, s]))
  const docs = corpus.chunks.filter((c) => sources.get(c.sourceId)?.reviewStatus === 'approved').map(stats)
  if (!docs.length) return []
  const N = docs.length
  const avg = docs.reduce((a, d) => a + d.len, 0) / N
  const k1 = 1.2, b = 0.75
  const df = new Map<string, number>()
  for (const d of docs) for (const c of d.tf.keys()) df.set(c, (df.get(c) ?? 0) + 1)
  return docs.map((d) => {
    const source = sources.get(d.chunk.sourceId)!
    let score = 0
    const matched: string[] = []
    for (const [c, w] of q.weights) {
      const tf = d.tf.get(c) ?? 0
      if (!tf) continue
      matched.push(c)
      const n = df.get(c) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      score += w * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d.len / avg))
    }
    return { chunk: d.chunk, source, score: score * BOOST[source.sourceType], matched }
  })
}

/** A passage qualifies when it matches at least two core (step or action) concepts; background words alone never count. */
function qualifies(s: ScoredChunk, q: Query) {
  return s.score > 0 && s.matched.filter((c) => q.core.includes(c)).length >= Math.min(2, q.core.length)
}

/** The registry statistics for the facts' data year: the source of the county's own numbers. */
export const statsForYear = (src: { sourceType: SourceType; dataPeriod?: string }, year: unknown) =>
  src.sourceType === 'official_statistics' && year !== undefined && year !== '' && !!src.dataPeriod?.startsWith(String(year))

const finnishOfficial = (s: ScoredChunk) => s.source.setting === 'finland' && isOfficial(s.source.sourceType)
const interventionLike = (s: ScoredChunk, q: Query) => isIntervention(s.source.sourceType) && (!q.action.length || s.matched.some((c) => q.action.includes(c)))

/** Top passages for the facts, or insufficient_evidence when too few passages match. */
export function retrieve(corpus: Corpus, facts: Record<string, number | string>): RetrievalResult {
  const q = buildQuery(facts)
  const meta = { method: 'keyword' as const, queryVersion: QUERY_VERSION, corpusVersion: corpus.corpusVersion }
  const query = [...q.weights.keys()]
  const byScore = (a: ScoredChunk, b: ScoredChunk) => b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId)
  const all = scoreAll(corpus, q)
  const ranked = all.filter((s) => qualifies(s, q)).sort(byScore)
  if (ranked.length < MIN_QUALIFYING) return { status: 'insufficient_evidence', chunks: [], query, meta }

  const picked: ScoredChunk[] = []
  const perSource = new Map<string, number>()
  const take = (s: ScoredChunk | undefined) => {
    if (!s || picked.includes(s) || picked.length >= TOP_K || (perSource.get(s.source.id) ?? 0) >= MAX_PER_SOURCE) return
    picked.push(s)
    perSource.set(s.source.id, (perSource.get(s.source.id) ?? 0) + 1)
  }
  // the county's numbers come from the registry statistics for the data year, so the problem line can always cite them
  take([...all].sort(byScore).find((s) => statsForYear(s.source, facts.data_year)))
  take(ranked.find(finnishOfficial))
  take(ranked.find((s) => interventionLike(s, q)))
  // the national policy the action serves (strategy / roadmap), when one qualifies
  take(ranked.find((s) => s.source.sourceType === 'official_policy' && s.source.setting === 'finland'))
  for (const s of ranked) take(s)
  picked.sort((a, b) => b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId))
  return { status: 'ok', chunks: picked, query, meta }
}
