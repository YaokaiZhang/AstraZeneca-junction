// Checks the model's structured answer before anything reaches the browser. Any failure -> template fallback.
// Rules: schema shape; every cited id is in the evidence pack; every line but Capacity cites at least one passage;
// each line at most MAX_LINE_WORDS words; every number in the lines and limitations is a number from the facts;
// the Do-this line cites at least one official or intervention (review / study) source.
import { LINE_KEYS, type EvidencePack, type LineKey, type ValidAnswer } from './buildEvidencePack.ts'
import { isIntervention, isOfficial } from './types.ts'

export const MAX_LINE_WORDS = 25
const MAX_LIMITATIONS = 3
const MAX_LIMITATION_WORDS = 40

/** The JSON schema for output_config.format; citation ids are limited to the pack's ids. */
export function answerSchema(ids: string[]) {
  const lineProps = Object.fromEntries(LINE_KEYS.map((k) => [k, { type: 'string' }]))
  const citeProps = Object.fromEntries(LINE_KEYS.map((k) => [k, { type: 'array', items: { type: 'string', enum: ids } }]))
  return {
    type: 'object',
    additionalProperties: false,
    required: ['lines', 'citations', 'limitations'],
    properties: {
      lines: { type: 'object', additionalProperties: false, required: [...LINE_KEYS], properties: lineProps },
      citations: { type: 'object', additionalProperties: false, required: [...LINE_KEYS], properties: citeProps },
      limitations: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['text', 'citations'], properties: { text: { type: 'string' }, citations: { type: 'array', items: { type: 'string', enum: ids } } } },
      },
    },
  }
}

/** Citation markers the model may slip into the text: [1], [E2], (E3), bare E4. */
const MARKERS = /\[(?:E)?\d+\]|\(E\d+\)|\bE\d+\b/g
export const stripMarkers = (s: string) => s.replace(MARKERS, ' ')

/**
 * Every number in the text must match a number in the facts (or inside a fact's words), allowing the usual rounding.
 * Same rule as numbersMatch() in src/pages/monitor/briefing.ts, after stripping citation markers, plus one stricter
 * rule: a year-like whole number (1900-2100) must match exactly, so a study year cannot pass as "about 2024".
 */
export function numbersMatch(text: string, facts: Record<string, number | string>): boolean {
  const allowed: number[] = []
  for (const v of Object.values(facts)) {
    if (typeof v === 'number') allowed.push(v)
    else for (const m of v.match(/\d+(?:\.\d+)?/g) ?? []) allowed.push(+m)
  }
  const found = stripMarkers(text).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) ?? []
  return found.every((m) => {
    const n = +m
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) return allowed.includes(n)
    return allowed.some((v) => Math.abs(n - v) <= Math.max(0.5, Math.abs(v) * 0.05))
  })
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const LABEL = /^\s*\**\s*(problem|do this|result|capacity)\s*\**\s*:\s*/i

function cleanLine(s: string) {
  return stripMarkers(s).replace(LABEL, '').replace(/[*`#]/g, '').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim()
}

/** Claims the data cannot support: the register only shows recorded colonoscopies, and the cancer count is a scenario. */
const OVERCLAIM = /\bnever (had|got|received|followed)\b|\bnever been followed\b|\b(find|finds|finding|found|catch|catches|catching|caught|detect\w*|diagnos\w*)\b[^.;]{0,40}?\bearlier\b|\blives? saved\b|\bsav(e|es|ing) lives\b/i

export type Validation = { ok: true; answer: ValidAnswer } | { ok: false; errors: string[] }

export function validateAnswer(raw: unknown, pack: EvidencePack, facts: Record<string, number | string>): Validation {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['not an object'] }
  const r = raw as Record<string, unknown>
  const lines = r.lines as Record<string, unknown> | undefined
  const cites = r.citations as Record<string, unknown> | undefined
  if (!lines || typeof lines !== 'object' || !cites || typeof cites !== 'object' || !Array.isArray(r.limitations)) return { ok: false, errors: ['schema'] }

  const known = new Map(pack.items.map((i) => [i.id, i]))
  const outLines = {} as Record<LineKey, string>
  const outCites = {} as Record<LineKey, string[]>
  for (const k of LINE_KEYS) {
    const line = typeof lines[k] === 'string' ? cleanLine(lines[k] as string) : ''
    if (!line) errors.push(`${k}: empty`)
    else if (words(line) > MAX_LINE_WORDS) errors.push(`${k}: too long`)
    if (/https?:\/\/|www\./i.test(line)) errors.push(`${k}: link`)
    outLines[k] = line
    const c = cites[k]
    if (!Array.isArray(c) || !c.every((x) => typeof x === 'string')) { errors.push(`${k}: citations not a list`); outCites[k] = []; continue }
    const ids = [...new Set(c as string[])]
    const unknown = ids.filter((id) => !known.has(id))
    if (unknown.length) errors.push(`${k}: unknown evidence id`)
    outCites[k] = ids.filter((id) => known.has(id))
    if (k !== 'capacity' && !outCites[k].length) errors.push(`${k}: no citation`)
  }
  if (outCites.do_this.length && !outCites.do_this.some((id) => { const t = known.get(id)!.source.sourceType; return isOfficial(t) || isIntervention(t) })) {
    errors.push('do_this: needs an official or intervention source')
  }

  // each limitation names the passage it rests on, so a caveat like "a US review found no clear effect" is traceable too
  const limitations: string[] = []
  const limitationCites: string[][] = []
  for (const x of r.limitations as unknown[]) {
    const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
    const t = o && typeof o.text === 'string' ? cleanLine(o.text) : ''
    if (!t) continue
    const ids = o && Array.isArray(o.citations) ? [...new Set(o.citations.filter((c): c is string => typeof c === 'string'))] : []
    if (ids.some((id) => !known.has(id))) errors.push('limitations: unknown evidence id')
    if (!ids.length) errors.push('limitations: no citation')
    limitations.push(t)
    limitationCites.push(ids.filter((id) => known.has(id)))
  }
  if (limitations.length > MAX_LIMITATIONS) errors.push('limitations: too many')
  if (limitations.some((l) => words(l) > MAX_LIMITATION_WORDS)) errors.push('limitations: too long')

  for (const k of LINE_KEYS) if (OVERCLAIM.test(outLines[k])) errors.push(`${k}: overclaim`)
  if (limitations.some((l) => OVERCLAIM.test(l))) errors.push('limitations: overclaim')
  for (const k of LINE_KEYS) if (!numbersMatch(outLines[k], facts)) errors.push(`${k}: number not in facts`)
  if (!limitations.every((l) => numbersMatch(l, facts))) errors.push('limitations: number not in facts')

  return errors.length ? { ok: false, errors } : { ok: true, answer: { lines: outLines, citations: outCites, limitations, limitationCites } }
}
