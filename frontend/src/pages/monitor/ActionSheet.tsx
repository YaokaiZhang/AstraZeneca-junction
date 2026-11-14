// County action sheet: one printable page. Template text; every number comes from model.ts.
import { SCREENING_FI, type ScreeningRow } from './data'
import type { BriefingLine } from './briefing'
import { sourceBadge, type EvidenceLevel, type EvidenceRef } from './evidence'
import { DETECTION_FIXES, GROUP_FACTS, flags, in2031, losses, n0, n1, signed, type Plan, type Result, type Step, STEP_META } from './model'

const SOURCES = [
  ['Finnish Cancer Registry, bowel cancer screening statistics, 2024 round (published 20 May 2026)', 'https://stats.cancerregistry.fi/joukkistilastot/suolisto.html'],
  ['Interventions to raise colonoscopy after a positive test, meta-analysis. JAMA Intern Med 2026. PMID 42832233', 'https://pubmed.ncbi.nlm.nih.gov/42832233/'],
  ['Dougherty et al. Interventions to raise colorectal screening uptake. JAMA Intern Med 2018. PMID 30326005', 'https://pubmed.ncbi.nlm.nih.gov/30326005/'],
  ['Kansallinen syöpästrategia 2026–2035 (National Cancer Strategy)', 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf'],
  ['Toimeenpanon tiekartta 2026–2031 (implementation roadmap)', 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_toimeenpanon_tiekartta_2026_2031.pdf'],
  ['Finnish Cancer Registry, bowel cancer screening programme: everyone aged 56–74 invited from 2031', 'https://syoparekisteri.fi/seulonta/suolistosyovan-seulonta/'],
  ['Statistics Finland, population by age and language (vaerak/11rz), 2025, rolled up to counties', 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/statfin_vaerak_pxt_11rz.px/'],
]

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

function fmtDate(d?: string) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const t = new Date(`${d}T00:00:00Z`)
  return isNaN(+t) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function EvidenceList({ evidence, level, limitations }: { evidence: EvidenceRef[]; level?: EvidenceLevel; limitations?: string[] }) {
  return (
    <div className="mt-2 pt-2 border-t border-black/15">
      <p className="font-type uppercase tracking-widest text-[11px] opacity-60">
        Evidence · {level === 'evidence_backed' ? 'Evidence-backed' : 'Limited evidence'}
      </p>
      <ol className="mt-1 space-y-1.5">
        {evidence.map((e) => {
          const meta = [
            e.publisher,
            fmtDate(e.publicationDate),
            e.dataPeriod && `data: ${e.dataPeriod}`,
            e.page ? `p. ${e.page}` : e.section,
          ].filter(Boolean)
          return (
            <li key={e.n} className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-[12px] leading-snug break-inside-avoid">
              <span className="font-type opacity-60">{e.n}</span>
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{e.title}</span>
                  {meta.map((m) => <span key={m}> · {m}</span>)}
                  {' '}<span className="font-type uppercase text-[10px] tracking-wider border border-black/20 rounded px-1 whitespace-nowrap align-[1px]">{sourceBadge(e)}</span>
                </p>
                {e.excerpt && <p className="opacity-70 line-clamp-2">“{e.excerpt}”</p>}
                <a href={e.url} target="_blank" rel="noreferrer" className="opacity-70 underline decoration-black/30 break-all">{e.url}</a>
              </div>
            </li>
          )
        })}
      </ol>
      {!!limitations?.length && (
        <div className="mt-1.5 text-[11px] leading-snug opacity-70 space-y-0.5">
          {limitations.map((x) => <p key={x}>{x}</p>)}
        </div>
      )}
    </div>
  )
}

export function ActionSheet({ r, plan, res, briefing }: { r: ScreeningRow; plan: Plan; res: Result; briefing?: Briefing }) {
  const f = flags(r)
  const l = losses(r)
  const leaks = (Object.keys(f) as Step[]).filter((s) => f[s])
  const q = res.queue
  const y = in2031(r, res)
  const det = DETECTION_FIXES.find((d) => d.id === plan.detectionFix)
  const fixes: string[] = []
  if (res.referral.fix) fixes.push(`${res.referral.fix.name} (${res.referral.fix.effect}): colonoscopy after a positive test ${n1(res.base.c * 100)}% → ${n1(res.referral.cNew * 100)}%, ${signed(res.referral.colonoscopies)} colonoscopies a year.`)
  if (res.detection.pts > 0) fixes.push(`${det ? det.name : 'Raise kit return'} (${det ? det.effect : 'chosen target'}): kit return ${n1(r.participationPct)}% → ${n1(r.participationPct + res.detection.pts)}%, ≈ ${n0(res.detection.kits)} more kits, ${signed(res.detection.colonoscopies)} colonoscopies a year.`)
  if (plan.catchUp && q.catchUp >= 0.5) fixes.push(`Catch-up colonoscopy sessions: ${n0(q.catchUp)} one-off colonoscopies (≈ ${n1(q.catchUpPerWeek)} a week for ${plan.catchUpWeeks} weeks) to bring the median wait to ${n1(plan.targetMonths)} months.`)
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const grounded = briefing?.source === 'ai' && !!briefing.evidence?.length && !!briefing.lines

  const row = (s: Step) => {
    const v = s === 'detection' ? `${n1(r.participationPct)}%` : s === 'referral' ? `${n1(r.colonoscopyOfPositivesPct)}%` : `${n1(r.medianMonths)} mo`
    const fi = s === 'detection' ? `${n1(SCREENING_FI.participationPct)}%` : s === 'referral' ? `${n1(SCREENING_FI.colonoscopyOfPositivesPct)}%` : `${n1(SCREENING_FI.medianMonths)} mo`
    const lost = s === 'detection' ? `${n0(l.detection.lost)} kits not returned` : s === 'referral' ? `${n0(l.referral.lost)} positives with no recorded colonoscopy` : `≈ ${n0(l.capacity.lost)} people waiting`
    return { v, fi, lost }
  }

  return (
    <article className="sheet font-sans text-ink bg-paper">
      <header className="flex items-end justify-between border-b-2 border-ink pb-3">
        <div>
          <p className="font-type uppercase tracking-widest text-[12px] opacity-70">County action sheet · bowel cancer screening</p>
          <h1 className="font-serif text-5xl leading-none mt-1">{r.name}</h1>
        </div>
        <p className="font-type text-[12px] uppercase tracking-wider opacity-70 text-right">{date}<br />2024 screening round, ages 60–70</p>
      </header>

      {briefing && (
        <section className="mt-4 border-l-4 border-terra pl-3">
          <h2 className="font-type uppercase tracking-widest text-[12px] opacity-70 mb-1">Briefing</h2>
          <p className="text-[14px] leading-snug">
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
              ? grounded
                ? 'Written by AI from the numbers below and the sources listed under it. Numbers come from our calculations, not the AI.'
                : 'Written by AI from the numbers below. Numbers come from our calculations, not the AI.'
              : `Template briefing, built from the numbers below.${briefing.note ? ` ${briefing.note}` : ''}`}
          </p>
          {grounded && <EvidenceList evidence={briefing.evidence!} level={briefing.evidenceLevel} limitations={briefing.limitations} />}
        </section>
      )}

      <section className="mt-4">
        <h2 className="font-type uppercase tracking-widest text-[12px] opacity-70 mb-1">1 · Where the chain leaks</h2>
        <table className="w-full text-[13px] border-collapse">
          <thead><tr className="text-left font-type uppercase text-[11px] tracking-wider opacity-70"><th className="py-1">Step</th><th>{r.name}</th><th>Finland</th><th>People</th><th /></tr></thead>
          <tbody>
            {(['detection', 'referral', 'capacity'] as Step[]).map((s) => {
              const x = row(s)
              return (
                <tr key={s} className="border-t border-black/15">
                  <td className="py-1.5">{STEP_META[s].short}: {STEP_META[s].title.toLowerCase()}</td>
                  <td className="font-serif text-lg">{x.v}</td><td>{x.fi}</td><td>{x.lost}</td>
                  <td className={f[s] ? 'text-terra font-type uppercase text-[11px] tracking-wider' : 'opacity-50 font-type uppercase text-[11px] tracking-wider'}>{f[s] ? 'Leaks' : 'Holds'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[13px] leading-snug">
          {leaks.length ? <>Weak link{leaks.length > 1 ? 's' : ''}: <b>{leaks.map((s) => STEP_META[s].short.toLowerCase()).join(', ')}</b>.</> : <>No step is below the flag line.</>}{' '}
          Nationally, people who skipped the previous round returned the kit {n1(GROUP_FACTS.skipped.pct)}% of the time; other mother tongues {n1(GROUP_FACTS.otherTongue)}%, basic education {n1(GROUP_FACTS.basicEducation)}%, men {n1(GROUP_FACTS.men)}%.
        </p>
      </section>

      <section className="mt-4">
        <h2 className="font-type uppercase tracking-widest text-[12px] opacity-70 mb-1">2 · Chosen fixes</h2>
        {fixes.length ? <ul className="list-disc pl-5 text-[13px] leading-snug space-y-1">{fixes.map((x) => <li key={x}>{x}</li>)}</ul>
          : <p className="text-[13px] italic opacity-70">No fix chosen yet. Pick one on the monitor to fill this in.</p>}
        {plan.referral.length > 1 && <p className="text-[12px] opacity-70 mt-1">Several referral fixes chosen; only the strongest is counted.</p>}
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {[
          [signed(res.total.colonoscopies), 'extra colonoscopies a year'],
          [signed(res.total.cancers, n1), 'more cancers detected (estimate)'],
          [signed(res.total.precursors), 'precursors removed'],
        ].map(([v, t]) => (
          <div key={t} className="border border-black/20 rounded p-2">
            <p className="font-serif text-3xl leading-none">{v}</p>
            <p className="font-type uppercase text-[11px] tracking-wider opacity-70 mt-1">{t}</p>
          </div>
        ))}
      </section>

      <section className="mt-4">
        <h2 className="font-type uppercase tracking-widest text-[12px] opacity-70 mb-1">3 · Capacity needed</h2>
        <p className="text-[13px] leading-snug">
          Today ≈ {n1(q.arrivalsWeek)} colonoscopies a week, ≈ {n0(q.queueNow)} people waiting, median wait {n1(r.medianMonths)} months.{' '}
          {q.extraPerWeek >= 0.05
            ? <>The fixes raise demand to {n1(q.newArrivalsWeek)} a week: <b>add {n1(q.extraPerWeek)} colonoscopies a week</b>{plan.addCapacity ? ' (included in this plan).' : <>, or the median wait grows to about {n1(q.waitIn12m)} months within a year.</>}</>
            : <>No extra weekly demand in this plan.</>}{' '}
          {q.catchUp >= 0.5 && <>A one-off catch-up of {n0(q.catchUp)} colonoscopies brings the wait to {n1(plan.targetMonths)} months.</>}
        </p>
        <p className="text-[13px] leading-snug mt-1">
          <b>2031 (estimate):</b> when everyone aged 56–74 is invited, invites grow {signed((y.growth - 1) * 100)}% ({n0(r.invited)} → {n0(y.invited2031)}).
          At today&apos;s rates{y.hasFixes ? ', with the chosen fixes,' : ''} that needs <b>{signed(y.extraWithFixesWeek, n1)} colonoscopies a week</b> over today&apos;s {n1(y.todayWeek)}.
          {' '}Ignores ageing to 2031 and lower positivity in younger people.
        </p>
      </section>

      <section className="mt-4">
        <h2 className="font-type uppercase tracking-widest text-[12px] opacity-70 mb-1">Policy fit</h2>
        <p className="text-[13px] leading-snug">National Cancer Strategy 2026–2035: Goal 2, 80% screening participation in every wellbeing services county; Goal 3, treatment within target times (strategy p. 5); other mother tongues to reach the participation of Finnish and Swedish speakers (sub-objective 1.3, p. 20). Implementation roadmap 2026–2031: measure 1.3.1, multilingual screening outreach, estimated €400,000 (p. 33); 2.4.5, monthly reporting to the screening registers (pp. 50–51); 3.1.4, pathway quality indicators (p. 58); 3.5.3, digital tools and AI (pp. 73–74).</p>
      </section>

      <footer className="mt-4 pt-2 border-t border-black/20 text-[11px] leading-snug opacity-80">
        <p className="font-type uppercase tracking-wider mb-1">Sources and caveats</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          {SOURCES.map(([t, u]) => <li key={u}>{t}. {u}</li>)}
        </ol>
        {briefing?.source === 'ai' && <p className="mt-1">The briefing text is written by AI from our calculated numbers{grounded ? ' and the evidence passages cited under it' : ''}; it adds no numbers of its own, and it is checked against them.</p>}
        <p className="mt-1">2024 is the latest complete screening chain. Preliminary 2025 figures (Finnish Cancer Registry, 29 Oct 2026) cover only kit return (Finland 73.3%); colonoscopy follow-up for 2025 is due in spring 2027, so the two years are not combined here.</p>
        <p className="mt-1">Effects come from mostly US studies and are estimates. Waits were read from a chart (± 0.1 month). Group figures are national. The queue model (Little&apos;s law) uses the median wait as if it were the mean. &quot;No colonoscopy&quot; may include private colonoscopies not reported to the register. Every number on this sheet is calculated from the sources above; none is written by a language model.</p>
      </footer>
    </article>
  )
}
