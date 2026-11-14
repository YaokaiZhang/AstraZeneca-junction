// Actions tab for breast and cervical screening: where women are lost, and the one thing to start with.
// Same look as the bowel view (monitor/Simple.tsx); the numbers come from programmes.ts.
import { Label, SourceBadge, cx } from '../../components/ui'
import type { ProgrammeView, StepTile } from './programmes'

/** "Staley H, Shiraz A, … 2021" → "Staley et al. 2021" */
const shortCite = (c: string) => `${c.split(/[ ,]/)[0]} et al. ${c.match(/\b(19|20)\d{2}\b/)?.[0] ?? ''}`.trim()

function Tile({ t, i, hero }: { t: StepTile; i: number; hero: boolean }) {
  const status = t.missing ? 'Not reported' : t.behind ? 'Falling behind' : 'On track'
  return (
    <li className={cx('rounded-xl p-6 flex flex-col min-w-0', hero ? 'bg-terra text-paper shadow-xl -rotate-1' : 'bg-black/[.04]')}>
      <div className="flex items-center justify-between gap-3">
        <span className={cx('w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl shrink-0', hero ? 'bg-paper text-terra' : 'border border-ink')}>{i + 1}</span>
        <span className={cx('font-type text-[13px] uppercase tracking-widest', hero ? 'opacity-90' : t.behind ? 'text-terra' : 'opacity-60')}>{status}</span>
      </div>
      <p className="mt-5 label !opacity-80">{t.title}</p>
      <p className={cx('mt-2 font-serif text-6xl leading-none', t.behind && !hero && 'text-terra', t.missing && 'opacity-40')}>
        {t.big}{t.unit && !t.missing && <span className="text-2xl ml-2">{t.unit}</span>}
      </p>
      <p className="mt-2 font-type text-[13px] uppercase tracking-wider opacity-70">Finland {t.finland}</p>
      <p className="mt-auto pt-5 font-sans text-[16px] leading-snug">{t.line}</p>
    </li>
  )
}

export function Programme({ v, name }: { v: ProgrammeView; name: string }) {
  const hero = v.verdict.onTrack ? -1 : v.startStep
  return (
    <div>
      <Label className="mb-4">{v.label} · {v.scope}</Label>
      <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.15] max-w-4xl">
        {v.verdict.onTrack
          ? <>{name} is on track at every step of {v.label.toLowerCase()}.</>
          : <>{name}&apos;s biggest problem: <span className="italic text-terra">{v.verdict.problem}</span>.</>}
      </p>

      <div className="mt-14 mb-5 flex items-center gap-3"><Label>Where women are lost</Label>
        <SourceBadge id={v.sourceId} kind="direct" demo={false} how={`${name}, ${v.scope}. Finland = whole-country figure. Waits are read from the Registry's chart.`} /></div>
      <ol className="grid md:grid-cols-3 gap-5" aria-label={`The three steps of ${v.label.toLowerCase()}`}>
        {v.tiles.map((t, i) => <Tile key={t.title} t={t} i={i} hero={i === hero} />)}
      </ol>
      {v.caveat && <p className="mt-4 font-sans text-[14px] opacity-65 max-w-3xl">Note: {v.caveat}</p>}

      <div className="mt-16 mb-5 flex items-center gap-3"><Label>Do next</Label>
        <SourceBadge id={v.start.basis.sourceId} kind={v.start.basis.kind} demo={false} how={v.start.basis.how} /></div>
      <div className="rounded-xl p-6 sm:p-8 shadow-lg bg-mustard grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 lg:gap-10">
        <div className="flex gap-5">
          <span className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-xl shrink-0 bg-ink text-mustard">1</span>
          <div className="min-w-0">
            <Label className="!opacity-70">{v.verdict.onTrack ? 'All on track · to do even better' : 'Start here'}</Label>
            <p className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">{v.start.title}</p>
            <p className="mt-3 font-sans text-[17px] leading-relaxed opacity-85">{v.start.text}</p>
          </div>
        </div>
        <div className="lg:pl-10 lg:border-l border-ink/15">
          <Label className="!opacity-70">{v.start.basis.kind === 'estimate' ? 'Expected result' : 'Why'}</Label>
          <p className="mt-2 font-serif text-2xl leading-snug">{v.start.result}</p>
        </div>
      </div>

      <details className="mt-10 group max-w-4xl">
        <summary className="cursor-pointer font-type text-[14px] uppercase tracking-widest opacity-75 hover:opacity-100 hover:text-terra list-none">
          <span className="inline-block transition-transform group-open:rotate-90 mr-2">›</span>Other options with evidence
        </summary>
        <ul className="mt-5 divide-y divide-black/10 border-y border-black/10">
          {v.evidence.map((e) => (
            <li key={e.action} className="py-4 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-8 gap-y-1">
              <p className="font-serif text-xl leading-snug">{e.action}</p>
              <div>
                <p className="font-sans text-[15px] leading-relaxed opacity-85">{e.effect}</p>
                <a href={e.url} target="_blank" rel="noreferrer" className="font-sans text-[13px] opacity-60 underline underline-offset-2 hover:text-terra">{shortCite(e.citation)}</a>
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
