// County one-page plan. Leads with what a decision-maker needs (problem, briefing, the action and who does it,
// what it achieves, what it takes, how you'll know); everything else is one small "Sources and caveats" block.
// Every number comes from buildFacts() (the same rounded facts the briefing is written from), so the sheet and the
// briefing never disagree. No calculation lives here.
import type { ReactNode } from 'react'
import { type ScreeningRow } from './data'
import { buildFacts, type BriefingLine } from './briefing'
import { sourceBadge, type EvidenceLevel, type EvidenceRef } from './evidence'
import { n0, type Plan, type Result } from './model'
import { Verdict } from './Simple'
import { Bars, Measures, StepsStrip } from './PlanGlance'
import { bowelGlance } from './bowelGlance'

export interface Briefing {
  text: string
  source: 'ai' | 'template'
  note?: string
  /** the parsed lines with their citation numbers (AI text only) */
  lines?: BriefingLine[]
  /** the cited passages; only for AI text the server grounded in evidence */
  evidence?: EvidenceRef[]
  evidenceLevel?: EvidenceLevel
  limitations?: string[]
}

/** Short source labels with their links; the full references live on the monitor's "Where the numbers come from". */
const SOURCES: [string, string][] = [
  ['Finnish Cancer Registry, bowel screening statistics 2024', 'https://stats.cancerregistry.fi/joukkistilastot/suolisto.html'],
  ['Cancer Registry, screening programme (ages 56–74 from 2031)', 'https://syoparekisteri.fi/seulonta/suolistosyovan-seulonta/'],
  ['Statistics Finland, population 2025', 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/11rz.px/'],
  ['National Cancer Strategy 2026–2035', 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf'],
  ['Follow-up review, JAMA Intern Med 2026', 'https://pubmed.ncbi.nlm.nih.gov/42832233/'],
  ['Screening uptake review, JAMA Intern Med 2018', 'https://pubmed.ncbi.nlm.nih.gov/30326005/'],
]

const REFERRAL_IDS = ['navigation', 'patient-reminder', 'clinician-reminder', 'auto-referral']
const DETECTION_IDS = ['reminder', 'multilingual', 'clinician']

/** Who does it and how you'll know, for the actions in the plan. */
function ownership(ids: string[]) {
  const out: { who: string; measure: string }[] = []
  if (ids.some((i) => REFERRAL_IDS.includes(i))) out.push({ who: 'The screening nurse or screening coordinator, every working day.', measure: 'Days from positive test to booking; share of positive tests with a recorded colonoscopy; people still without one.' })
  if (ids.some((i) => DETECTION_IDS.includes(i))) out.push({ who: 'The screening programme team, after each invitation batch.', measure: 'Share of invited people who send the kit back, month by month.' })
  if (ids.includes('catch-up')) out.push({ who: 'The colonoscopy unit, for the weeks of the catch-up.', measure: 'Median wait from positive test to colonoscopy; people waiting.' })
  return out
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/\.?$/, '.')
const fmtDate = (d?: string) => (d && /^\d{4}/.test(d) ? d.slice(0, 4) : d)

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-black/20 pt-2">
      <p className="font-type uppercase tracking-widest text-[11px] opacity-60">{label}</p>
      <div className="mt-1 text-[13px] leading-snug">{children}</div>
    </div>
  )
}

export function ActionSheet({ r, plan, res, briefing, onShowList }: { r: ScreeningRow; plan: Plan; res: Result; briefing?: Briefing; onShowList?: () => void }) {
  const x = buildFacts(r, plan, res)
  const ids = String(x.action_ids ?? '').split(',').filter(Boolean)
  const own = ownership(ids)
  const glance = bowelGlance(r, plan, res)
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const grounded = briefing?.source === 'ai' && !!briefing.evidence?.length && !!briefing.lines
  const colsYear = Number(x.action_about_extra_colonoscopies_per_year)
  const cancers = Number(x.action_estimated_extra_cancers_detected)
  const now = Number(x.about_extra_colonoscopies_per_week_now)
  const actionLabel = x.action_is === 'the plan chosen on the monitor' ? 'Do this (chosen plan)' : x.action_is === 'a step to do even better' ? 'Do this (to do even better)' : 'Do this (recommended first step)'
  const wrap = { overflowWrap: 'anywhere' as const }

  return (
    <article className="sheet font-sans text-ink bg-paper" style={wrap}>
      <header className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
        <div className="min-w-0">
          <p className="font-type uppercase tracking-widest text-[12px] opacity-70">One-page plan · bowel cancer screening</p>
          <h1 className="font-serif text-5xl leading-none mt-1">{r.name}</h1>
        </div>
        <p className="font-type text-[12px] uppercase tracking-wider opacity-70 text-right shrink-0">{date}<br />2024 screening round</p>
      </header>

      <p className="mt-3 font-serif text-[19px] leading-snug"><Verdict r={r} /></p>
      <section className="mt-3 py-2.5 border-y border-black/15"><StepsStrip steps={glance.steps} county={r.name} /></section>

      {briefing && (
        <section className="mt-3 border-l-4 border-terra pl-3">
          <p className="font-type uppercase tracking-widest text-[11px] opacity-60">Briefing</p>
          <p className="mt-1 text-[13.5px] leading-snug">
            {grounded
              ? briefing.lines!.map((l, i) => (
                <span key={l.label}>
                  {i > 0 && ' '}{l.text}
                  {l.cites.length > 0 && <sup className="font-type text-[10px] opacity-60 ml-0.5">{l.cites.join(',')}</sup>}
                </span>
              ))
              : briefing.text}
          </p>
          <p className="text-[11px] opacity-60 mt-1 italic">
            {briefing.source === 'ai'
              ? `Written by AI from our calculated numbers${grounded ? ' and the numbered sources at the bottom' : ''}. Numbers come from our calculations, not the AI.`
              : `Template briefing, built from the numbers on this page.${briefing.note ? ` ${briefing.note}` : ''}`}
          </p>
        </section>
      )}

      <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-5 gap-y-3">
        <Block label={actionLabel}>
          <p>{x.action === 'no change' ? 'No action chosen yet.' : sentence(String(x.action))}</p>
          {own.map((o) => <p key={o.who} className="mt-1 opacity-80"><b className="font-medium">Who:</b> {o.who}</p>)}
          {onShowList && ids.some((i) => REFERRAL_IDS.includes(i)) && (
            <button onClick={onShowList} className="print:hidden mt-1 text-[12px] underline underline-offset-2 hover:text-terra">See what the nurse&apos;s list looks like</button>
          )}
        </Block>
        <Block label={glance.change?.kind === 'target' ? 'What it achieves (target)' : 'What it achieves (estimate)'}>
          {glance.change ? <>
            <p className="text-[11px] opacity-70 mb-1">{glance.change.title}</p>
            <Bars bars={glance.change.bars} unit={glance.change.unit} label={glance.change.title} />
            {colsYear > 0 && <p className="mt-1 text-[12px]">About <b>{n0(colsYear)}</b> more colonoscopies a year{cancers >= 1 ? <>, an estimated <b>{n0(cancers)}</b> more {cancers === 1 ? 'cancer' : 'cancers'} detected</> : null}.</p>}
            <p className="mt-0.5 text-[11px] opacity-65">{glance.change.kind === 'estimate' ? 'Effects from other programmes, applied to 2024 numbers: a scenario, not a promise.' : 'A target from our queue model, not a study result.'}</p>
          </> : <p>No change in this plan.</p>}
        </Block>
        <Block label="What it takes">
          {glance.takes && <>
            <p className="text-[11px] opacity-70 mb-1">{glance.takes.title}</p>
            <Bars bars={glance.takes.bars} unit={glance.takes.unit} label={glance.takes.title} />
          </>}
          {x.about_catch_up_colonoscopies_total ? <p className="mt-1 text-[12px]">Plus about <b>{n0(Number(x.about_catch_up_colonoscopies_total))}</b> one-off colonoscopies over {String(x.catch_up_weeks)} weeks.</p> : null}
          {now > 0 && x.about_wait_in_a_year_if_not_added_months ? <p className="mt-1 text-[11px] opacity-70">Without them, the wait grows to about {n0(Number(x.about_wait_in_a_year_if_not_added_months))} months in a year.</p> : null}
        </Block>
        <Block label="How you’ll know it works"><Measures items={glance.measures} /></Block>
      </section>

      <footer className="mt-5 pt-2 border-t border-black/30 text-[10.5px] leading-snug opacity-85">
        <p className="font-type uppercase tracking-widest text-[10px] opacity-70">Sources and caveats</p>

        <p className="mt-1">&quot;Behind&quot; is our own warning line (kit return below 72%, follow-up below 70%, wait over 2.5 months); the only official target is 80% kit return (National Cancer Strategy, Goal 2). {r.name} has {n0(r.noColonoscopy)} positive tests with no recorded colonoscopy (2024).</p>

        {grounded && (
          <ol className="mt-1.5 space-y-0.5">
            {briefing!.evidence!.map((e) => (
              <li key={e.n} className="grid grid-cols-[1rem_minmax(0,1fr)]">
                <span className="font-type opacity-70">{e.n}</span>
                <span className="min-w-0">
                  <span className="line-clamp-1">{e.title}</span>
                  <span className="opacity-75"> {e.publisher}{e.publicationDate ? `, ${fmtDate(e.publicationDate)}` : ''}{e.page ? `, p. ${e.page}` : ''} · {sourceBadge(e).toLowerCase()} · <a href={e.url} target="_blank" rel="noreferrer" className="underline decoration-black/30">{host(e.url)}</a></span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-1.5">
          {grounded ? 'Other sources: ' : 'Sources: '}
          {SOURCES.map(([t, u], i) => (
            <span key={u}>{i > 0 && ' · '}{t} (<a href={u} target="_blank" rel="noreferrer" className="underline decoration-black/30">{host(u)}</a>)</span>
          ))}.
        </p>

        <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
          <li>&quot;No recorded colonoscopy&quot; may include private colonoscopies not reported to the register; 2024 figures may still be updated.</li>
          <li>Effects come from studies abroad, mostly in the United States, and are estimates for {r.name}.</li>
          <li>The wait comes from a simple queue model and a published chart (±0.1 month); 2031 assumes today&apos;s rates.</li>
          {briefing?.source === 'ai' && <li>The briefing is written by AI; it adds no numbers of its own, and every number and citation is checked.</li>}
          {grounded && !!briefing!.limitations?.length && briefing!.limitations!.slice(0, 1).map((l) => <li key={l}>{l}</li>)}
        </ul>
      </footer>
    </article>
  )
}
