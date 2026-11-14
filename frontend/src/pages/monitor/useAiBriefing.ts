// The briefing at the top of the one-page plan.
// Template text by default. "Word with AI" asks the server (/api/briefing, key LLM_KEY stays server-side) to word it
// from the calculated facts and a few cited evidence passages. The AI text is only used if the server says it is
// grounded, every number in it matches the facts, every [n] points at a returned source, and only for the facts it was written from.
import { useEffect, useMemo, useState } from 'react'
import type { ScreeningRow } from './data'
import type { Plan, Result } from './model'
import type { Briefing } from './ActionSheet'
import type { BriefingResponse, EvidenceRef } from './evidence'
import { briefingLines, buildFacts, numbersMatch, stripCites, templateBriefing, type Facts } from './briefing'

function errorNote(status: number, error: unknown): string {
  const e = String(error ?? '')
  if (e === 'ai_off') return 'AI is off on this server (no LLM_KEY).'
  if (e === 'key_format') return 'The server’s LLM_KEY is not an Anthropic API key (it should start with sk-ant-).'
  if (e.includes('401')) return 'The server’s LLM_KEY was not accepted by Anthropic.'
  if (e === 'insufficient_evidence') return 'No strong enough evidence found; showing our calculated plan.'
  if (e === 'invalid_output') return 'AI text not used: it did not pass our checks.'
  return `The AI could not be reached (${e || status}).`
}

/** The AI briefing if the response passes every check, else null. */
function grounded(body: Partial<BriefingResponse>, facts: Facts): Briefing | null {
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

export function useAiBriefing(r: ScreeningRow, plan: Plan, res: Result) {
  const facts = useMemo(() => buildFacts(r, plan, res), [r, plan, res])
  const key = JSON.stringify(facts)
  const [ai, setAi] = useState<{ key: string; briefing: Briefing } | null>(null)
  const [note, setNote] = useState<{ key: string; note: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiOn, setAiOn] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/health').then((x) => x.json()).then((h) => setAiOn(!!h.ai)).catch(() => setAiOn(false))
  }, [])

  const briefing: Briefing = ai?.key === key
    ? ai.briefing
    : { text: templateBriefing(facts), source: 'template', note: note?.key === key ? note.note : undefined }

  const write = async () => {
    const k = key
    setBusy(true)
    try {
      const resp = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts }) })
      const body = await resp.json().catch(() => ({}))
      const b = resp.ok ? grounded(body, facts) : null
      if (b) { setAi({ key: k, briefing: b }); setNote(null) }
      else {
        setNote({ key: k, note: !resp.ok ? errorNote(resp.status, body.error)
          : body.status === 'template_fallback' && body.reason ? errorNote(resp.status, body.reason)
          : 'AI text not used: it did not pass our checks.' })
      }
    } catch {
      setNote({ key: k, note: 'The AI could not be reached.' })
    } finally {
      setBusy(false)
    }
  }

  return { briefing, write, busy, aiOn }
}
