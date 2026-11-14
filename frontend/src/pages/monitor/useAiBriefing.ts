// The briefing at the top of the one-page plan.
// Template text by default. "Write with AI" asks the server (/api/briefing, key LLM_KEY stays server-side) to word it;
// the AI text is only used if every number in it matches the calculated facts, and only for the facts it was written from.
import { useEffect, useMemo, useState } from 'react'
import type { ScreeningRow } from './data'
import type { Plan, Result } from './model'
import type { Briefing } from './ActionSheet'
import { buildFacts, numbersMatch, templateBriefing } from './briefing'

function errorNote(status: number, error: unknown): string {
  const e = String(error ?? '')
  if (e === 'ai_off') return 'AI is off on this server (no LLM_KEY).'
  if (e === 'key_format') return 'The server’s LLM_KEY is not an Anthropic API key (it should start with sk-ant-).'
  if (e.includes('401')) return 'The server’s LLM_KEY was not accepted by Anthropic.'
  return `The AI could not be reached (${e || status}).`
}

export function useAiBriefing(r: ScreeningRow, plan: Plan, res: Result) {
  const facts = useMemo(() => buildFacts(r, plan, res), [r, plan, res])
  const key = JSON.stringify(facts)
  const [ai, setAi] = useState<{ key: string; text: string } | null>(null)
  const [note, setNote] = useState<{ key: string; note: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiOn, setAiOn] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/health').then((x) => x.json()).then((h) => setAiOn(!!h.ai)).catch(() => setAiOn(false))
  }, [])

  const briefing: Briefing = ai?.key === key
    ? { text: ai.text, source: 'ai' }
    : { text: templateBriefing(facts), source: 'template', note: note?.key === key ? note.note : undefined }

  const write = async () => {
    const k = key
    setBusy(true)
    try {
      const resp = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts }) })
      const body = await resp.json().catch(() => ({}))
      if (resp.ok && typeof body.text === 'string' && numbersMatch(body.text, facts)) { setAi({ key: k, text: body.text }); setNote(null) }
      else setNote({ key: k, note: resp.ok ? 'The AI text used a number we could not match, so it was not used.' : errorNote(resp.status, body.error) })
    } catch {
      setNote({ key: k, note: 'The AI could not be reached.' })
    } finally {
      setBusy(false)
    }
  }

  return { briefing, write, busy, aiOn }
}
