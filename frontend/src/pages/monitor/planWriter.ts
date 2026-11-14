// Writes the one-page plan on request: sends the calculated facts to /api/briefing, keeps the AI briefing only if it
// passes our checks, and records what really happened (the trace shown in the plan panel). Shared by all three tabs.
import { useEffect, useState } from 'react'
import type { Briefing } from './ActionSheet'
import { briefingLines, numbersMatch, stripCites, type Facts } from './briefing'
import type { BriefingResponse, EvidenceRef } from './evidence'

export interface Trace {
  /** calculated figures sent (numbers in the facts) */
  figures: number
  /** running = waiting for the server; done = AI briefing passed every check; fallback = template used */
  stage: 'running' | 'done' | 'fallback'
  passages?: number
  sources?: number
  /** numbers in the AI text checked against the facts, and citations checked against the returned sources */
  numbers?: number
  citations?: number
  /** fallback: one plain line saying why */
  note?: string
}

export function briefingErrorNote(status: number, error: unknown): string {
  const e = String(error ?? '')
  if (e === 'ai_off') return 'AI is off on this server, so the plan uses the template briefing.'
  if (e === 'key_format') return 'The server’s LLM_KEY is not an Anthropic API key (it should start with sk-ant-), so the plan uses the template briefing.'
  if (e.includes('401')) return 'The server’s LLM_KEY was not accepted by Anthropic, so the plan uses the template briefing.'
  if (e === 'insufficient_evidence') return 'Not enough approved evidence for this case, so the plan uses the template briefing.'
  if (e === 'invalid_output') return 'The AI text did not pass our checks, so the plan uses the template briefing.'
  return `The AI could not be reached (${e || status}), so the plan uses the template briefing.`
}

/** The AI briefing if the /api/briefing response passes every check, else null: the server says it is grounded,
 *  it has the four labelled lines, every number matches the facts and every [n] points at a returned source. */
export function groundedBriefing(body: Partial<BriefingResponse>, facts: Facts): Briefing | null {
  if (body.status !== 'grounded' || typeof body.text !== 'string' || !Array.isArray(body.evidence) || !body.evidence.length) return null
  const evidence: EvidenceRef[] = body.evidence
  const lines = briefingLines(body.text)
  if (!lines || !numbersMatch(stripCites(body.text), facts)) return null
  if (!lines.every((l) => l.cites.every((n) => evidence.some((e) => e.n === n)))) return null
  return {
    text: body.text,
    source: 'ai',
    lines,
    evidence,
    evidenceLevel: body.evidenceLevel === 'evidence_backed' ? 'evidence_backed' : 'limited_evidence',
    limitations: (body.limitations ?? []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 3),
  }
}

const countNumbers = (text: string) => (stripCites(text).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) ?? []).length

/** One writer per page: results are kept per facts key, so switching county and back keeps a written plan. */
export function usePlanWriter() {
  const [results, setResults] = useState<Record<string, { briefing?: Briefing; trace: Trace }>>({})
  const [aiOn, setAiOn] = useState<boolean | null>(null)
  useEffect(() => { fetch('/api/health').then((x) => x.json()).then((h) => setAiOn(!!h.ai)).catch(() => setAiOn(false)) }, [])

  const write = async (facts: Facts) => {
    const key = JSON.stringify(facts)
    const figures = Object.values(facts).filter((v) => typeof v === 'number').length
    const set = (r: { briefing?: Briefing; trace: Trace }) => setResults((cur) => ({ ...cur, [key]: r }))
    if (aiOn === false) { set({ trace: { figures, stage: 'fallback', note: briefingErrorNote(503, 'ai_off') } }); return }
    set({ trace: { figures, stage: 'running' } })
    try {
      const resp = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts }) })
      const body: Partial<BriefingResponse> & { error?: string } = await resp.json().catch(() => ({}))
      const meta = { passages: body.retrieval?.passages, sources: body.retrieval?.sources }
      const b = resp.ok ? groundedBriefing(body, facts) : null
      if (b) {
        const cites = new Set([...b.lines!.flatMap((l) => l.cites), ...(b.limitations ?? []).flatMap((l) => [...l.matchAll(/\[(\d{1,2})\]/g)].map((m) => +m[1]))])
        set({ briefing: b, trace: { figures, stage: 'done', ...meta, numbers: countNumbers(b.text) + (b.limitations ?? []).reduce((n, l) => n + countNumbers(l), 0), citations: cites.size } })
      } else {
        const note = !resp.ok ? briefingErrorNote(resp.status, body.error)
          : body.status === 'template_fallback' && body.reason ? briefingErrorNote(resp.status, body.reason)
          : 'The AI text did not pass our checks, so the plan uses the template briefing.'
        set({ trace: { figures, stage: 'fallback', ...meta, note } })
      }
    } catch {
      set({ trace: { figures, stage: 'fallback', note: briefingErrorNote(0, 'unreachable') } })
    }
  }

  /** The briefing for these facts: the AI one if written and checked, else the template (with the fallback note). */
  const briefingFor = (facts: Facts, template: Briefing): Briefing => {
    const r = results[JSON.stringify(facts)]
    return r?.briefing ?? { ...template, note: r?.trace.stage === 'fallback' ? r.trace.note : undefined }
  }
  const traceFor = (facts: Facts): Trace | undefined => results[JSON.stringify(facts)]?.trace
  return { aiOn, write, briefingFor, traceFor }
}
