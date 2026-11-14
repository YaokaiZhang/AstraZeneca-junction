// The one-page plan panel, shared by Bowel, Breast and Cervical. Opens on the county and one button; clicking it
// writes the plan and lists what actually happened (live, aria-live), then shows the plan with Rewrite and Print.
// Only real steps are shown, with real counts: nothing advances on a timer.
import type { ReactNode } from 'react'
import { Btn, Label, cx } from '../../components/ui'
import type { Trace } from './planWriter'

const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`

function Steps({ t, county }: { t: Trace; county: string }) {
  const steps: { text: string; state: 'done' | 'running' | 'warn' }[] = [{ text: `Read ${n(t.figures, 'calculated figure', 'calculated figures')} for ${county}`, state: 'done' }]
  if (t.stage === 'running') steps.push({ text: 'Finding approved evidence and writing the briefing…', state: 'running' })
  if (t.passages != null && t.sources != null) steps.push({ text: `Found ${n(t.passages, 'passage', 'passages')} in ${n(t.sources, 'approved source', 'approved sources')}`, state: 'done' })
  if (t.stage === 'done') {
    steps.push({ text: 'Wrote the briefing', state: 'done' })
    steps.push({ text: `Checked ${n(t.numbers ?? 0, 'number', 'numbers')} against our calculations and ${n(t.citations ?? 0, 'citation', 'citations')} against the sources`, state: 'done' })
  }
  if (t.stage === 'fallback' && t.note) steps.push({ text: t.note, state: 'warn' })
  return (
    <ol className="space-y-2 font-sans text-[14px]" aria-live="polite">
      {steps.map((s) => (
        <li key={s.text} className="flex items-start gap-2.5">
          <span className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center" aria-hidden>
            {s.state === 'done' ? <span className="text-[#4F5D40] font-semibold">✓</span>
              : s.state === 'running' ? <span className="w-3.5 h-3.5 rounded-full border-2 border-terra border-r-transparent animate-spin" />
              : <span className="text-terra font-semibold">!</span>}
          </span>
          <span className={cx(s.state === 'warn' && 'text-terra')}>{s.text}</span>
        </li>
      ))}
    </ol>
  )
}

export function PlanPanel({ county, label, trace, aiOn, onWrite, sheet }: {
  county: string
  /** e.g. "Bowel cancer screening" */
  label: string
  trace: Trace | undefined
  aiOn: boolean | null
  onWrite: () => void
  /** the finished plan */
  sheet: ReactNode
}) {
  const running = trace?.stage === 'running'
  return (
    <div className="p-6 pt-16">
      {!trace ? (
        <div>
          <Label>One-page plan · {label}</Label>
          <p className="mt-2 font-serif text-5xl leading-none">{county}</p>
          <p className="mt-4 font-sans text-[15px] leading-relaxed opacity-80 max-w-md">
            {aiOn === false
              ? 'AI is off on this server. The plan is built from our calculations with a template briefing.'
              : 'The AI writes a short briefing from our calculated numbers and approved sources, then every number and citation is checked. The rest of the plan comes straight from our calculations.'}
          </p>
          <div className="mt-6">
            <Btn onClick={onWrite} className="whitespace-nowrap">{aiOn === false ? 'Build the one-page plan' : 'Write the one-page plan'}</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
            <Label>{running ? 'Writing the plan' : 'Preview · one printable page'}</Label>
            {!running && (
              <div className="flex items-center gap-2">
                {aiOn !== false && <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); onWrite() }}>Rewrite</Btn>}
                <Btn onClick={() => window.print()}>Print</Btn>
              </div>
            )}
          </div>
          <div className={cx('rounded-lg border p-4 mb-4', trace.stage === 'fallback' ? 'border-terra/40' : 'border-black/15')}><Steps t={trace} county={county} /></div>
          {!running && <div className="border border-black/15 rounded-lg p-4 bg-paper shadow-inner sheet-preview">{sheet}</div>}
        </div>
      )}
    </div>
  )
}
