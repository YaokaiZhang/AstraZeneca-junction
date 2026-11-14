// Turns retrieved passages into the numbered evidence pack (E1..En) the model sees, and turns a validated
// answer back into the /api/briefing response: citation markers [1] [2] renumbered in first-cited order.
import { isIntervention, isOfficial, type BriefingResponse, type EvidenceRef, type RetrievalMeta, type ScoredChunk } from './types.ts'

export interface PackItem extends ScoredChunk { id: string }
export interface EvidencePack { items: PackItem[]; ids: string[] }

/** Longest passage text put in the prompt. */
const MAX_PASSAGE_CHARS = 1800

export function buildEvidencePack(chunks: ScoredChunk[]): EvidencePack {
  const items = chunks.map((c, i) => ({ ...c, id: `E${i + 1}` }))
  return { items, ids: items.map((i) => i.id) }
}

// passages are untrusted data: no markup can close the <passage> wrapper or open a new one
const escText = (s: string) => s.replace(/</g, '‹').replace(/>/g, '›')
const escAttr = (s: string) => escText(s).replace(/"/g, "'").replace(/\s+/g, ' ').trim()

/** The <evidence> block for the prompt, one <passage> per pack item with its provenance. */
export function evidencePrompt(pack: EvidencePack): string {
  const blocks = pack.items.map((it) => {
    const s = it.source
    const attrs: [string, string | number | undefined][] = [
      ['id', it.id], ['source_id', s.id], ['title', s.title], ['publisher', s.publisher], ['source_type', s.sourceType],
      ['setting', s.setting], ['country', s.country], ['published', s.publicationDate], ['data_period', s.dataPeriod],
      ['language', s.language], ['section', it.chunk.heading || undefined], ['page', it.chunk.page],
    ]
    const head = attrs.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}="${escAttr(String(v))}"`).join(' ')
    const text = it.chunk.text.length > MAX_PASSAGE_CHARS ? cutAtWord(it.chunk.text, MAX_PASSAGE_CHARS) : it.chunk.text
    return `<passage ${head}>\n${escText(text)}\n</passage>`
  })
  return `<evidence>\n${blocks.join('\n')}\n</evidence>`
}

/** At most `max` characters, cut at a word boundary, with an ellipsis when cut. */
export function cutAtWord(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const slice = t.slice(0, max - 1)
  const sp = slice.lastIndexOf(' ')
  return `${(sp > max * 0.5 ? slice.slice(0, sp) : slice).replace(/[\s,;:.-]+$/, '')}…`
}

export const LINE_KEYS = ['problem', 'do_this', 'result', 'capacity'] as const
export type LineKey = (typeof LINE_KEYS)[number]
export const LINE_LABEL: Record<LineKey, string> = { problem: 'Problem', do_this: 'Do this', result: 'Result', capacity: 'Capacity' }

/** A model answer that passed validateAnswer(). Lines are clean text without markers. */
export interface ValidAnswer {
  lines: Record<LineKey, string>
  citations: Record<LineKey, string[]>
  limitations: string[]
  /** evidence ids each limitation rests on (same order as limitations) */
  limitationCites: string[][]
}

const EXCERPT_CHARS = 300

/** The grounded response: four labelled lines with [n] markers, and only the cited evidence, numbered 1..n by first citation. */
export function renderGrounded(answer: ValidAnswer, pack: EvidencePack, retrieval: RetrievalMeta, now = new Date()): BriefingResponse {
  const order: string[] = []
  for (const id of [...LINE_KEYS.flatMap((k) => answer.citations[k]), ...answer.limitationCites.flat()]) if (!order.includes(id)) order.push(id)
  const num = new Map(order.map((id, i) => [id, i + 1]))
  const text = LINE_KEYS.map((k) => {
    const marks = [...new Set(answer.citations[k])].map((id) => `[${num.get(id)}]`).join('')
    return `${LINE_LABEL[k]}: ${answer.lines[k]}${marks ? ` ${marks}` : ''}`
  }).join('\n')
  const byId = new Map(pack.items.map((i) => [i.id, i]))
  const evidence: EvidenceRef[] = order.map((id, i) => {
    const it = byId.get(id)!
    const s = it.source
    return {
      n: i + 1, sourceId: s.id, chunkId: it.chunk.chunkId, title: s.title, publisher: s.publisher, url: s.url,
      sourceType: s.sourceType, setting: s.setting,
      ...(it.chunk.heading ? { section: it.chunk.heading } : {}),
      ...(it.chunk.page ? { page: it.chunk.page } : {}),
      ...(s.publicationDate ? { publicationDate: s.publicationDate } : {}),
      ...(s.dataPeriod ? { dataPeriod: s.dataPeriod } : {}),
      excerpt: cutAtWord(it.chunk.text, EXCERPT_CHARS),
    }
  })
  // the level rests on what the four lines cite, not on passages cited only by a caveat
  const lineIds = new Set(LINE_KEYS.flatMap((k) => answer.citations[k]))
  const support = evidence.filter((e) => lineIds.has(order[e.n - 1]))
  const backed = support.some((e) => e.setting === 'finland' && isOfficial(e.sourceType)) && support.some((e) => isIntervention(e.sourceType))
  return {
    status: 'grounded',
    evidenceLevel: backed ? 'evidence_backed' : 'limited_evidence',
    text,
    limitations: answer.limitations.map((l, i) => {
      const marks = [...new Set(answer.limitationCites[i] ?? [])].map((id) => `[${num.get(id)}]`).join('')
      return marks ? `${l} ${marks}` : l
    }),
    evidence,
    retrieval,
    generatedAt: now.toISOString(),
  }
}
