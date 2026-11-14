// The monitor for breast and cervical screening: same layout, wording rules and one-page plan as bowel.
// Pick a county on the map → verdict and three steps → one start-here action (who, how you know, what it achieves)
// → what it takes → one-page plan; the evidence (all proven options, the numbers, caveats) is collapsed below.
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Btn, Card, Display, Drawer, Label, Picker, Toggle, cx } from '../../components/ui'
import type { Briefing } from './ActionSheet'
import { BREAST, BREAST_FI, BREAST_PUBLISHED, type BreastRow } from './breastData'
import { CERVICAL, CERVICAL_FI, CERVICAL_PUBLISHED, type CervicalRow } from './cervicalData'
import { LeakMap } from './Compare'
import { FollowUpList } from './FollowUpList'
import { GOAL_ATTENDANCE, programmeView, stepsBehind, type ProgrammeId, type ProgrammeView, type StepTile } from './programmes'
import { ProgrammeTabs } from './ProgrammeTabs'

const n0 = (x: number) => Math.round(x).toLocaleString('en-GB')
const n1 = (x: number) => x.toFixed(1)
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
const STEP_WORD = ['attendance', 'follow-up', 'wait']

function Tile({ t }: { t: StepTile }) {
  const flag = t.missing ? 'No data' : t.behind ? 'Falling behind' : 'On track'
  return (
    <div className={cx('rounded-lg border p-5 sm:p-6 bg-paper min-w-0', t.behind || t.missing ? 'border-terra/60' : 'border-black/15')}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-2xl leading-tight">{t.title}</p>
        <span className={cx('font-type text-[13px] uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0',
          t.behind ? 'bg-terra text-paper' : t.missing ? 'border border-terra text-terra' : 'bg-black/[.06] opacity-80')}>{flag}</span>
      </div>
      <p className={cx('mt-5 font-serif text-5xl sm:text-6xl leading-none', t.behind && 'text-terra')}>{t.big}{t.unit && t.big !== '–' ? <span className="text-3xl"> {t.unit}</span> : null}</p>
      <p className="mt-2 font-sans text-[15px] opacity-65">vs {t.finland} in Finland</p>
      <p className="mt-4 font-sans text-[17px] leading-snug">{t.line}</p>
    </div>
  )
}

function Block({ a, b, children, id }: { a: ReactNode; b?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-16 sm:mt-20 scroll-mt-28">
      <Display a={a} b={b} className="!text-4xl lg:!text-5xl mb-6" />
      {children}
    </section>
  )
}
const SourceLine = ({ children }: { children: ReactNode }) => <p className="mt-3 font-sans text-[13px] opacity-55">{children}</p>

/** The numbers behind the three tiles, for the evidence section. */
function NumbersTable({ p, id }: { p: ProgrammeId; id: string }) {
  const rows: [string, string, string][] = []
  if (p === 'breast') {
    const r = BREAST.find((x) => x.id === id) as BreastRow, f = BREAST_FI
    rows.push(['Invited women', n0(r.invited), n0(f.invited)], ['Came for the mammogram', `${n0(r.attended)} (${n1(r.attendedPct)}%)`, `${n1(f.attendedPct)}%`],
      ['Called back for further tests', `${n0(r.recalled)} (${n1(r.recalledPct)}%)`, `${n1(f.recalledPct)}%`],
      ['Referred to specialist care', n0(r.referred), n0(f.referred)], ['Cancers found by screening', n0(r.cancers), n0(f.cancers)],
      ['Referred, no result on record', `${n0(r.noHistology)} (${n1(r.noHistologyPct)}%)`, `${n1(f.noHistologyPct)}%`],
      ['Median wait for further tests', r.medianMonthsToExam != null ? `${n1(r.medianMonthsToExam)} months` : '–', `${n1(f.medianMonthsToExam!)} months`])
  } else {
    const r = CERVICAL.find((x) => x.id === id) as CervicalRow, f = CERVICAL_FI
    rows.push(['Invited women', n0(r.invited), n0(f.invited)], ['Tested', `${n0(r.participated)} (${n1(r.participationPct)}%)`, `${n1(f.participationPct)}%`],
      ['Referred to colposcopy', `${n0(r.referredColposcopy)} (${n1(r.referredColposcopyPct)}%)`, `${n1(f.referredColposcopyPct)}%`],
      ['Colposcopy on record', `${n0(r.colposcopyDone)} (${n1(r.colposcopyOfReferredPct)}%)`, `${n1(f.colposcopyOfReferredPct)}%`],
      ['Serious precancer or cancer found (HSIL+)', n0(r.hsilPlus), n0(f.hsilPlus)],
      ['Median wait for colposcopy', r.medianMonthsToColposcopyApprox != null ? `${n1(r.medianMonthsToColposcopyApprox)} months` : '–', `${n1(f.medianMonthsToColposcopyApprox!)} months`])
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] font-sans text-[15px] border-collapse">
        <thead><tr className="text-left text-[13px] opacity-60"><th className="font-normal py-2 pr-4">2024</th><th className="font-normal pr-4">This county</th><th className="font-normal">Finland</th></tr></thead>
        <tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-t border-black/10"><td className="py-2.5 pr-4">{a}</td><td className="font-serif text-lg pr-4">{b}</td><td className="opacity-70">{c}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

/** One-page plan for breast and cervical, the same shape as bowel's. */
export function ProgrammeSheet({ v, county, briefing, applied, onShowList }: { v: ProgrammeView; county: string; briefing: Briefing; applied: boolean; onShowList?: () => void }) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const grounded = briefing.source === 'ai' && !!briefing.evidence?.length && !!briefing.lines
  return (
    <article className="sheet font-sans text-ink bg-paper" style={{ overflowWrap: 'anywhere' }}>
      <header className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
        <div className="min-w-0">
          <p className="font-type uppercase tracking-widest text-[12px] opacity-70">One-page plan · {v.label.toLowerCase()}</p>
          <h1 className="font-serif text-5xl leading-none mt-1">{county}</h1>
        </div>
        <p className="font-type text-[12px] uppercase tracking-wider opacity-70 text-right shrink-0">{date}<br />2024 screening round</p>
      </header>
      <p className="mt-3 font-serif text-[22px] leading-snug">{v.verdict}</p>
      <section className="mt-3 border-l-4 border-terra pl-3">
        <p className="font-type uppercase tracking-widest text-[11px] opacity-60">Briefing</p>
        <p className="mt-1 text-[14px] leading-snug">
          {grounded ? briefing.lines!.map((l, i) => (
            <span key={l.label}>{i > 0 && ' '}{l.text}{l.cites.length > 0 && <sup className="font-type text-[10px] opacity-60 ml-0.5">{l.cites.join(',')}</sup>}</span>
          )) : briefing.text}
        </p>
        <p className="text-[11px] opacity-60 mt-1 italic">
          {briefing.source === 'ai'
            ? `Written by AI from our calculated numbers${grounded ? ' and the numbered sources at the bottom' : ''}. Numbers come from the Cancer Registry and our calculations, not the AI.`
            : `Template briefing, built from the numbers on this page.${briefing.note ? ` ${briefing.note}` : ''}`}
        </p>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
        {[
          [`Do this (${applied ? 'chosen plan' : v.onTrack ? 'to do even better' : 'recommended first step'})`, <>
            <p>{v.start.text}</p>
            <p className="mt-1 opacity-80"><b className="font-medium">Who:</b> {v.start.who}</p>
            {v.list && onShowList && <button onClick={onShowList} className="print:hidden mt-1 text-[12px] underline underline-offset-2 hover:text-terra">See what the nurse&apos;s list looks like</button>}
          </>],
          [v.start.estimate ? 'What it achieves (estimate)' : 'What it achieves', <>
            <p>{v.start.result}</p>
            <p className="mt-1 text-[12px] opacity-70">{v.start.estimate ? 'Effect measured in a study, applied to this county’s 2024 numbers. A scenario, not a promise.' : 'From the Cancer Registry’s 2024 figures.'}</p>
          </>],
          ['What it takes', <p>{v.start.takes}</p>],
          ['How you’ll know it works', <p>{v.start.measure}</p>],
        ].map(([label, body]) => (
          <div key={label as string} className="min-w-0 border-t border-black/20 pt-2">
            <p className="font-type uppercase tracking-widest text-[11px] opacity-60">{label}</p>
            <div className="mt-1 text-[14px] leading-snug">{body}</div>
          </div>
        ))}
      </section>
      <footer className="mt-5 pt-2 border-t border-black/30 text-[10.5px] leading-snug opacity-85">
        <p className="font-type uppercase tracking-widest text-[10px] opacity-70">Sources and caveats</p>
        <p className="mt-1"><b className="font-medium">{county} in 2024:</b> {v.tiles.map((t) => `${t.title.toLowerCase()} ${t.big}${t.unit && t.big !== '–' ? ` ${t.unit}` : ''} (Finland ${t.finland})`).join(' · ')}. The official target is {GOAL_ATTENDANCE}% attendance (National Cancer Strategy, Goal 2).</p>
        {grounded && (
          <ol className="mt-1.5 space-y-0.5">
            {briefing.evidence!.map((e) => (
              <li key={e.n} className="grid grid-cols-[1rem_minmax(0,1fr)]">
                <span className="font-type opacity-70">{e.n}</span>
                <span className="min-w-0"><span className="line-clamp-1">{e.title}</span><span className="opacity-75"> {e.publisher}{e.publicationDate ? `, ${e.publicationDate.slice(0, 4)}` : ''}{e.page ? `, p. ${e.page}` : ''} · <a href={e.url} target="_blank" rel="noreferrer" className="underline decoration-black/30">{host(e.url)}</a></span></span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-1.5">Sources: Finnish Cancer Registry, {v.label.toLowerCase()} statistics 2024 (<a href={v.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-black/30">{host(v.sourceUrl)}</a>){v.start.basisUrl ? <> · the study behind the estimate (<a href={v.start.basisUrl} target="_blank" rel="noreferrer" className="underline decoration-black/30">{host(v.start.basisUrl)}</a>)</> : null} · National Cancer Strategy 2026–2035.</p>
        <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
          <li>{v.start.basis}</li>
          <li>&quot;Falling behind&quot; is our own warning line ({v.warningLines}); waits were read from a published chart.</li>
          {v.caveat && <li>{v.caveat}</li>}
          {briefing.source === 'ai' && <li>The briefing is written by AI; it adds no numbers of its own, and every number and citation is checked.</li>}
        </ul>
      </footer>
    </article>
  )
}

export function ProgrammeMonitor({ p, countyId, select, setProgramme, briefingFor, aiOn, writeBriefing, aiBusy }: {
  p: Exclude<ProgrammeId, 'bowel'>; countyId: string; select: (id: string) => void; setProgramme: (p: ProgrammeId) => void
  briefingFor: (v: ProgrammeView) => Briefing; aiOn: boolean | null; writeBriefing: (v: ProgrammeView) => void; aiBusy: boolean
}) {
  const v = programmeView(p, countyId)!
  const options = useMemo(() => (p === 'breast' ? BREAST : CERVICAL).map((r) => ({ id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, 'fi')), [p])
  const [applied, setApplied] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [list, setList] = useState(false)
  const [evidence, setEvidence] = useState(false)
  useEffect(() => { setApplied(false) }, [countyId, p])
  const openEvidence = (id: string) => { setEvidence(true); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }
  const briefing = briefingFor(v)
  const published = new Date(`${p === 'breast' ? BREAST_PUBLISHED : CERVICAL_PUBLISHED}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const name = v.facts.county as string

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 pb-3 bg-paper/95 backdrop-blur-sm border-b border-stone/60">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 min-w-0">
            <Picker label="County" value={countyId} onChange={select} options={options} className="font-serif text-xl sm:text-2xl italic py-0.5 max-w-[60vw] sm:max-w-none" />
            <ProgrammeTabs value={p} onChange={setProgramme} />
          </div>
          <button onClick={() => setSheet(true)}
            className="font-type text-[15px] uppercase tracking-widest flex items-center gap-2 rounded-full bg-ink text-paper pl-4 pr-1.5 py-1.5 hover:bg-terra transition-colors">
            One-page plan <span className="w-6 h-6 rounded-full bg-mustard text-ink flex items-center justify-center">↓</span>
          </button>
        </div>
      </div>

      <section className="mt-8 sm:mt-10 grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        <div className="max-w-[150px] sm:max-w-[240px] mx-auto lg:max-w-none lg:mx-0 w-full">
          <p className="font-sans text-[14px] opacity-65 mb-2 text-center lg:text-left">Tap a county on the map</p>
          <LeakMap selected={countyId} onSelect={select} countOf={(id) => stepsBehind(p, id)}
            tipOf={(id) => {
              const x = programmeView(p, id)
              if (!x) return null
              const behind = x.tiles.map((t, i) => (t.behind || t.missing ? STEP_WORD[i] : null)).filter(Boolean)
              return behind.length ? `Behind: ${behind.join(', ')}` : 'On track'
            }} />
        </div>
        <div className="min-w-0">
          <Label className="mb-4">{v.label} · {name} · {v.scope}</Label>
          <p key={countyId + p} className="rise font-serif text-3xl sm:text-[2.6rem] leading-[1.12] max-w-4xl">{v.verdict}</p>
          <div className="mt-8 grid md:grid-cols-3 gap-4 lg:gap-5">{v.tiles.map((t) => <Tile key={t.title} t={t} />)}</div>
          <SourceLine>Source: Finnish Cancer Registry, {v.label.toLowerCase()} statistics, 2024 round (published {published}). &quot;Falling behind&quot; means past our own warning line ({v.warningLines}). The only official target is {GOAL_ATTENDANCE}% attendance in every county (National Cancer Strategy, Goal 2).</SourceLine>
        </div>
      </section>

      <Block a="What" b="to do">
        <Card tone={applied ? 'ink' : 'paper'} className="p-6 sm:p-8">
          <Label className="!opacity-70">{v.onTrack ? 'Nothing is falling behind. To do even better' : 'Start here'}</Label>
          <p className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">{v.start.title}</p>
          <p className="mt-3 font-sans text-[17px] leading-relaxed max-w-2xl opacity-90">{v.start.text}</p>
          <p className={cx('mt-4 font-serif text-2xl leading-snug', applied ? 'text-mustard' : 'text-terra')}>{v.start.result}</p>
          <p className="mt-1 font-sans text-[14px] opacity-60">{v.start.estimate ? 'Proven in another screening programme; an estimate for this county, not a promise.' : 'From the Cancer Registry’s 2024 figures; no effect size is claimed.'}</p>
          <dl className={cx('mt-4 grid sm:grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-1 font-sans text-[15px] max-w-2xl', applied ? 'opacity-90' : 'opacity-80')}>
            <dt className="font-medium">Who, how often</dt><dd>{v.start.who}</dd>
            <dt className="font-medium">How you know</dt><dd>{v.start.measure}</dd>
          </dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Toggle on={applied} onChange={setApplied} label={applied ? 'Applied' : 'Apply this'} />
            <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {v.list && <button onClick={() => setList(true)} className="font-sans text-[15px] underline underline-offset-4 hover:text-terra">See what the nurse&apos;s list looks like</button>}
              <button onClick={() => openEvidence('p-evidence-options')} className="font-sans text-[15px] underline underline-offset-4 opacity-75 hover:opacity-100 hover:text-terra">See other proven options</button>
            </span>
          </div>
        </Card>
        <SourceLine>{v.start.basis}{v.start.basisUrl ? <> <a className="underline underline-offset-2 hover:text-terra" href={v.start.basisUrl} target="_blank" rel="noreferrer">Study</a></> : null}</SourceLine>
      </Block>

      <Block a="What it" b="will take">
        <p className="font-serif text-3xl sm:text-4xl leading-tight max-w-4xl">{v.start.takes}</p>
        <SourceLine>From {name}&apos;s 2024 figures (Cancer Registry), averaged over 52 weeks.</SourceLine>
      </Block>

      <div className="mt-14 flex flex-wrap items-center gap-4">
        <button onClick={() => setSheet(true)}
          className="group inline-flex items-center gap-3 bg-ink text-paper rounded-full pl-7 pr-2 py-2 font-type uppercase text-sm tracking-widest hover:bg-terra transition-colors">
          Get the one-page plan
          <span className="w-10 h-10 rounded-full bg-mustard text-ink flex items-center justify-center group-hover:translate-y-0.5 transition-transform">↓</span>
        </button>
        <span className="font-sans text-[15px] opacity-60">Everything above, with the numbers and sources, ready to print.</span>
      </div>

      <details open={evidence} onToggle={(e) => setEvidence((e.target as HTMLDetailsElement).open)} className="mt-16 border-t border-black/15">
        <summary className="cursor-pointer list-none py-6 flex items-center justify-between gap-4 select-none">
          <span className="font-serif text-3xl sm:text-4xl">See the evidence</span>
          <span className="font-type text-sm uppercase tracking-widest opacity-70 flex items-center gap-2">{evidence ? 'Hide' : 'Numbers, options, sources'} <span className={cx('inline-block transition-transform', evidence && 'rotate-180')}>↓</span></span>
        </summary>
        {evidence && <div className="pb-6 max-w-4xl">
          <Block a="The numbers," b="2024"><NumbersTable p={p} id={countyId} /></Block>
          <Block a="Other proven" b="options" id="p-evidence-options">
            <ul className="divide-y divide-black/10">
              {v.evidence.map((e) => (
                <li key={e.id} className="py-4">
                  <p className="font-serif text-xl leading-tight">{e.action}</p>
                  <p className="font-sans text-[15px] opacity-80 mt-1">{e.effect}</p>
                  <p className="font-sans text-[13px] opacity-60 mt-1">{e.citation} <a className="underline underline-offset-2 hover:text-terra" href={e.url} target="_blank" rel="noreferrer">{host(e.url)}</a></p>
                </li>
              ))}
            </ul>
          </Block>
          {v.caveat && <Block a="About this" b="county’s data"><p className="font-sans text-[16px] leading-relaxed">{v.caveat}</p></Block>}
        </div>}
      </details>

      <footer className="mt-16 pt-8 border-t border-black/15 max-w-5xl font-sans text-[15px] leading-snug">
        <p className="font-serif text-3xl">Where the numbers come from</p>
        <ul className="mt-4 divide-y divide-black/10">
          <li className="py-3"><b className="font-medium">Finnish Cancer Registry, {v.label.toLowerCase()} statistics</b> (2024 round, published {published}). Used for the three steps and the counts. <a className="underline underline-offset-2 hover:text-terra" href={v.sourceUrl} target="_blank" rel="noreferrer">Open source</a></li>
          <li className="py-3"><b className="font-medium">Published studies</b> for the effects of each option, listed under &quot;See the evidence&quot;. Used for: what an action achieves, only where a study gives an effect size.</li>
          <li className="py-3"><b className="font-medium">National Cancer Strategy 2026–2035</b>. Used for the {GOAL_ATTENDANCE}% attendance goal. <a className="underline underline-offset-2 hover:text-terra" href="https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf" target="_blank" rel="noreferrer">Open source</a></li>
        </ul>
        <p className="mt-4 text-[13px] opacity-60">Caveats: waits were read from a published chart. A follow-up figure far below the national one usually means results are not reaching the register, not that women were not seen. Studies come from other programmes and countries.</p>
      </footer>

      {v.list && (
        <Drawer open={list} onClose={() => setList(false)} label="Daily follow-up list (demo)" wide>
          <div className="p-5 sm:p-8 pt-16"><FollowUpList key={countyId + p} r={{ id: countyId, name }} wording={v.list} /></div>
        </Drawer>
      )}
      <Drawer open={sheet} onClose={() => setSheet(false)} label="County action sheet">
        <div className="p-6 pt-16">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
            <Label>Preview · one printable page</Label>
            <div className="flex items-center gap-2">
              <Btn type="button" variant="ghost" disabled={aiBusy || aiOn === false} aria-busy={aiBusy}
                onClick={(e) => { e.stopPropagation(); writeBriefing(v) }}
                title={aiOn === false ? 'Start the server with LLM_KEY to use AI' : undefined}
                className="whitespace-nowrap min-w-[13.5rem] justify-center">
                {aiBusy ? <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" />Writing briefing…</span>
                  : briefing.source === 'ai' ? 'Rewrite with AI' : 'Write briefing with AI'}
              </Btn>
              <Btn onClick={() => window.print()}>Print</Btn>
            </div>
          </div>
          {aiOn === false && <p className="font-sans text-[13px] opacity-60 mb-3">AI is off on this server, so the briefing comes from a template. The numbers are the same either way.</p>}
          <div className="border border-black/15 rounded-lg p-4 bg-paper shadow-inner sheet-preview">
            <ProgrammeSheet v={v} county={name} briefing={briefing} applied={applied} onShowList={v.list ? () => { setSheet(false); setList(true) } : undefined} />
          </div>
        </div>
      </Drawer>
      {createPortal(<div id="monitor-print"><ProgrammeSheet v={v} county={name} briefing={briefing} applied={applied} /></div>, document.body)}
    </>
  )
}

