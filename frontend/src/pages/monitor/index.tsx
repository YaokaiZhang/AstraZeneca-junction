// Screening Chain Monitor. Bowel cancer screening, every county, every step of the chain:
// Detection (patient) → Referral (primary care) → Diagnosis (specialist care).
// Pick a county → see where it leaks → apply proven fixes → see what they do to colonoscopy capacity.
import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Btn, Display, Drawer, KindLegend, Label, Picker, SourceBadge, cx } from '../../components/ui'
import { GROUPS, SCREENING, SCREENING_FI, screeningById, MISSED_CANCERS_2022 } from './data'
import { EMPTY_PLAN, GROUP_FACTS, evaluate, flags, n1, type Plan } from './model'
import { Chain, headline } from './Chain'
import { Missed } from './Missed'
import { MixGap } from './MixGap'
import { Fixes } from './Fixes'
import { Bottleneck } from './Bottleneck'
import { ActionSheet } from './ActionSheet'
import { LeakMap, Ranking } from './Compare'

const OPTIONS = SCREENING.map((r) => ({ id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, 'fi'))

function Section({ n, a, b, children, id, aside }: { n: string; a: ReactNode; b?: ReactNode; children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <section id={id} className="mt-16 sm:mt-20 scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <span className="font-type text-sm opacity-60 mt-2">{n}</span>
          <Display a={a} b={b} className="!text-4xl lg:!text-5xl" />
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export default function MonitorPage() {
  const [q, setQ] = useSearchParams()
  const countyId = screeningById(q.get('c') ?? '') ? q.get('c')! : 'helsinki'
  const r = screeningById(countyId)!
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN)
  const [sheet, setSheet] = useState(false)
  const res = useMemo(() => evaluate(r, plan), [r, plan])
  const f = flags(r)
  const select = (id: string) => setQ((p) => { const n = new URLSearchParams(p); n.set('c', id); return n }, { replace: true })
  const touched = JSON.stringify(plan) !== JSON.stringify(EMPTY_PLAN)

  return (
    <div className="monitor-root county-root px-4 sm:px-6 lg:px-10 pb-20 max-w-[1400px] overflow-x-clip">
      <MonitorStyles />

      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 pb-3 bg-paper/95 backdrop-blur-sm border-b border-stone/60">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-4 min-w-0">
            <Picker label="County" value={countyId} onChange={select} options={OPTIONS}
              className="font-serif text-2xl sm:text-3xl italic py-0.5 max-w-[70vw] sm:max-w-none" />
            <span className="hidden sm:flex items-center gap-1" aria-label="Leaking steps">
              {(['detection', 'referral', 'capacity'] as const).map((s) => <span key={s} className={cx('w-2.5 h-2.5 rounded-full', f[s] ? 'bg-terra' : 'bg-stone')} />)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {touched && <button onClick={() => setPlan(EMPTY_PLAN)} className="font-type text-sm uppercase tracking-widest opacity-70 hover:opacity-100 hover:text-terra">Reset fixes</button>}
            <button onClick={() => setSheet(true)}
              className="font-type text-[15px] uppercase tracking-widest flex items-center gap-2 rounded-full bg-ink text-paper pl-4 pr-1.5 py-1.5 hover:bg-terra transition-colors">
              Action sheet <span className="w-6 h-6 rounded-full bg-mustard text-ink flex items-center justify-center">↓</span>
            </button>
          </div>
        </div>
      </div>

      {/* 01 · the chain */}
      <section className="mt-8">
        <Label className="mb-3">Bowel cancer screening · 2024 round · Screening chain monitor</Label>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          <div className="min-w-0 rise" key={countyId}>
            <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.1] max-w-4xl">{headline(r)}</p>
            <div className="mt-8"><Chain r={r} /></div>
          </div>
          <div className="hidden xl:block">
            <LeakMap selected={countyId} onSelect={select} />
          </div>
        </div>
      </section>

      <Section n="02" a="Who is" b="being missed">
        <Missed />
        <div key={countyId} className="rise"><MixGap r={r} /></div>
      </Section>

      <Section n="03" a="Proven fixes," b={`in ${r.name}`}
        aside={<p className="font-sans text-[15px] opacity-70 max-w-sm">Each card shows the measured effect and its source. Tap to apply; the numbers are for {r.name}&apos;s 2024 volumes.</p>}>
        <Fixes r={r} plan={plan} setPlan={setPlan} res={res} />
      </Section>

      <Section n="04" a="The bottleneck" b="warning" id="bottleneck">
        <Bottleneck r={r} plan={plan} setPlan={setPlan} res={res} />
        <div className="mt-6 flex justify-end">
          <Btn variant="terra" onClick={() => setSheet(true)}>Open the action sheet</Btn>
        </div>
      </Section>

      <Section n="05" a="Every county," b="same tool">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
          <Ranking selected={countyId} onSelect={(id) => { select(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          <div className="xl:hidden"><LeakMap selected={countyId} onSelect={select} className="max-w-md mx-auto" /></div>
          <About />
        </div>
      </Section>

      <Drawer open={sheet} onClose={() => setSheet(false)} label="County action sheet">
        <div className="p-6 pt-16">
          <div className="flex items-center justify-between mb-4 gap-3">
            <Label>Preview · one printable page</Label>
            <Btn onClick={() => window.print()}>Print</Btn>
          </div>
          <div className="border border-black/15 rounded-lg p-4 bg-paper shadow-inner sheet-preview">
            <ActionSheet r={r} plan={plan} res={res} />
          </div>
        </div>
      </Drawer>

      {createPortal(<div id="monitor-print"><ActionSheet r={r} plan={plan} res={res} /></div>, document.body)}
    </div>
  )
}

const groupRate = (dimension: string, group: string) => GROUPS.find((g) => g.dimension === dimension && g.group === group)!.participationPct
const nativeRate = groupRate('mother_tongue', 'Finnish/Swedish/Sami')
const upperRate = groupRate('education', 'Upper secondary')
const higherRate = groupRate('education', 'Higher')

function About() {
  return (
    <div className="min-w-0">
      <Label className="mb-3">About the numbers</Label>
      <ul className="font-sans text-[15px] leading-relaxed space-y-2.5 opacity-85 list-none">
        <li><b>Data.</b> Finnish Cancer Registry, bowel cancer screening statistics for the 2024 round (published 20 May 2026), by county; group figures are national only, not per county.</li>
        <li><b>Waits</b> from positive test to colonoscopy were read by eye from a chart, accurate to about ± 0.1 month. Finland: {SCREENING_FI.medianMonths} months.</li>
        <li><b>&quot;No colonoscopy&quot;</b> may partly be private colonoscopies not reported to the register. Still: in the 2022 round, {MISSED_CANCERS_2022} people who tested positive and skipped colonoscopy were later diagnosed with bowel cancer.</li>
        <li><b>Effects</b> come from two meta-analyses, mostly of US programmes. They are estimates, not promises. Referral effects are not stacked: only the strongest chosen fix counts, and follow-through is capped at 95%.</li>
        <li><b>The queue model</b> (Little&apos;s law) treats today&apos;s throughput as today&apos;s capacity and the median wait as if it were the mean. It shows direction and size, not an exact forecast.</li>
        <li><b>Population mix.</b> Statistics Finland PxWeb tables vaerak/11rz (population by age and language, 2025) and vkour/12bq (education by age, 2025), rolled up from municipalities to wellbeing counties. The multilingual card uses each county&apos;s share of residents aged 56–74 with another mother tongue.</li>
        <li><b>Expected participation</b> = national 2024 group rates weighted by the county&apos;s mix: other mother tongue {n1(GROUP_FACTS.otherTongue)}% vs {n1(nativeRate)}%; basic education {n1(GROUP_FACTS.basicEducation)}%, upper secondary {n1(upperRate)}%, higher {n1(higherRate)}%.</li>
        <li><b>2031.</b> Screening widens to everyone aged 56–74, invited every two years by even age (<a className="underline underline-offset-2" href="https://syoparekisteri.fi/seulonta/suolistosyovan-seulonta/" target="_blank" rel="noreferrer">Cancer Registry programme page</a>). Invites in 2031 = people aged 56–74 × 10/19; colonoscopies grow by the same factor at today&apos;s rates. It ignores ageing to 2031 and lower positivity in younger people.</li>
        <li><b>Earlier rounds.</b> 2022 and 2023 county figures from the same <a className="underline underline-offset-2" href="https://stats.cancerregistry.fi/joukkistilastot/suolisto.html" target="_blank" rel="noreferrer">Cancer Registry screening statistics</a>. National colonoscopy follow-through fell from 78.6% (2023) to 72.7% (2024), probably partly reports still to come in.</li>
        <li><b>No number</b> on this page or the action sheet is written by a language model; all come from the calculations in the badges.</li>
      </ul>
      <KindLegend kinds={['direct', 'estimate']} long className="mt-5" />
      <ul className="mt-4 font-type text-[13px] uppercase tracking-wider opacity-70 flex flex-wrap gap-2 items-center">
        <li className="flex items-center gap-1">2024 round <SourceBadge id="bowelScreening2024" kind="direct" demo={false} /></li>
        <li className="flex items-center gap-1">2022–2023 <SourceBadge id="bowelScreeningRounds" kind="direct" demo={false} /></li>
        <li className="flex items-center gap-1">Language <SourceBadge id="statfinLang" kind="direct" demo={false} /></li>
        <li className="flex items-center gap-1">Education <SourceBadge id="statfinEdu" kind="direct" demo={false} /></li>
        <li className="flex items-center gap-1">2031 <SourceBadge id="bowelExpansion" kind="direct" demo={false} /></li>
      </ul>
    </div>
  )
}

function MonitorStyles() {
  return (
    <style>{`
      .county-range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 9999px; outline-offset: 6px; }
      .county-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 9999px; background: #FFC233; border: 2px solid #1F1F1F; cursor: grab; }
      .county-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 9999px; background: #FFC233; border: 2px solid #1F1F1F; cursor: grab; }
      .monitor-root .rounded-lg.paper-texture { overflow: visible; }
      .monitor-root .rounded-lg.paper-texture::before { border-radius: inherit; }
      .sheet-preview .sheet h1 { font-size: 2.2rem; }
      #monitor-print { display: none; }
      @media print {
        #root { display: none !important; }
        #monitor-print { display: block !important; }
        @page { size: A4; margin: 14mm; }
        body { background: #fff !important; }
        #monitor-print .sheet { background: #fff; }
        #monitor-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  )
}
