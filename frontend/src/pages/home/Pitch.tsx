import React, { useEffect, useRef, useState } from 'react'
import { Card, EdgeText, KindLegend, KindDot, Label, SourceBadge, Stamp, TextRing, cx } from '../../components/ui'
import { CANCERS, COUNTIES, type RadarCancerId } from '../../data/counties'
import { FinlandMap } from '../../components/FinlandMap'
import { buildBrief } from '../county/Brief'
import { BOWEL_SURV, RADAR_CANCERS, bowelLives, fmt, pct, scaleColor, spreadContrast, stepInfo, unknownMajority } from '../county/model'
import { REGISTRY_FI } from '../../data/registry.generated'
import { PATHWAY } from '../../data/pathway'
import { tr } from '../patient/i18n'
import { Reveal, Tilt, WordsUp, useCount, useInView, useScrollProgress } from './reveal'

/* short plain-language explainer under each headline */
function Lede({ children, className, delay = 250 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal fx="up" delay={delay} className={cx('max-w-xl font-sans text-base lg:text-lg leading-relaxed opacity-75', className)}>
      <p>{children}</p>
    </Reveal>
  )
}

/* ───────────── marquee band, pushed by scroll ───────────── */
export function Marquee({ words, reverse }: { words: string[]; reverse?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  useEffect(() => {
    const on = () => { const r = ref.current?.getBoundingClientRect(); if (r) setX((innerHeight - r.top) * 0.35) }
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  const row = Array.from({ length: 4 }, () => words).flat()
  return (
    <div ref={ref} className="relative overflow-hidden py-6 border-y border-ink/10 select-none" aria-hidden>
      <div className="flex gap-10 whitespace-nowrap will-change-transform" style={{ transform: `translateX(${reverse ? x - 1200 : -x}px)` }}>
        {row.map((w, i) => (
          <span key={i} className={cx('font-serif text-6xl lg:text-8xl leading-none', i % 2 ? 'italic text-terra' : 'text-outline')}>
            {w}<span className="mx-10 text-mustard not-italic">✳</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ───────────── 1 · the clock (sticky, scroll-driven) ───────────── */
const STEPS = PATHWAY.map((s) => ({ id: s.id === 'gp' ? 'Doctor visit' : s.id === 'mdt' ? 'Plan' : s.short, d: s.targetDays ?? 0 }))
const CUM = STEPS.reduce<number[]>((a, s) => [...a, (a[a.length - 1] ?? 0) + s.d], [])
const TOTAL = CUM[CUM.length - 1]

export function Clock() {
  const [ref, p] = useScrollProgress<HTMLElement>()
  const fill = Math.min(1, Math.max(0, (p - 0.05) / 0.5))
  const real = p > 0.68
  const days = Math.round(TOTAL * fill)
  /* steps sit evenly spaced so their labels never collide; each lights up once the clock passes its day */
  const lit = (i: number) => fill >= CUM[i] / TOTAL - 0.001
  return (
    <section ref={ref} className="relative h-[150vh]">
      <div className="sticky top-0 h-[100svh] flex flex-col justify-center px-5 lg:px-24 overflow-hidden">
        <div className="absolute right-[-6vw] xl:right-[4vw] top-1/2 -translate-y-1/2 w-[46vh] h-[46vh] hidden lg:block pointer-events-none" aria-hidden>
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="96" fill="none" stroke="#1F1F1F" strokeOpacity=".15" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#C65D3B" strokeWidth="10" strokeOpacity=".9"
              pathLength={100} strokeDasharray="100" strokeDashoffset={100 - fill * 100} transform="rotate(-90 100 100)" />
            {Array.from({ length: 56 }, (_, i) => (
              <line key={i} x1="100" y1={i % 7 ? 10 : 6} x2="100" y2="16" stroke="#1F1F1F" strokeOpacity={i / 56 <= fill ? 0.8 : 0.2} transform={`rotate(${(i / 56) * 360} 100 100)`} />
            ))}
            <g style={{ transform: `rotate(${real ? 360 * 4 + p * 2000 : fill * 360}deg)`, transformOrigin: '100px 100px', transition: real ? 'transform 2s cubic-bezier(.2,.7,.2,1)' : 'none' }}>
              <line x1="100" y1="100" x2="100" y2="32" stroke="#1F1F1F" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="5" fill="#FFC233" stroke="#1F1F1F" />
            <text x="100" y="140" textAnchor="middle" className="font-type" style={{ fontSize: 9, letterSpacing: '0.2em' }} fill="#1F1F1F" fillOpacity=".6">{real ? '— ? —' : `DAY ${days}`}</text>
          </svg>
        </div>
        <Label>The pathway clock</Label>
        <div className="relative mt-4 h-[2.1em] text-[13vw] sm:text-7xl xl:text-8xl font-serif font-light leading-[0.95]">
          <h2 className={cx('absolute inset-0 transition-all duration-700', real ? 'opacity-0 -translate-y-8 blur-sm' : 'opacity-100')}>
            <span className="tabular-nums lining-nums">{TOTAL}</span> days,<br /><span className="italic pl-[0.6em]">on paper.</span>
          </h2>
          <h2 className={cx('absolute inset-0 transition-all duration-700', real ? 'opacity-100' : 'opacity-0 translate-y-8 blur-sm')}>
            The real number?<br /><span className="italic text-terra pl-[0.6em]">Nobody counts it.</span>
          </h2>
        </div>
        <div className="relative mt-6 max-w-xl h-[8.5em] sm:h-[7em] lg:h-[5.5em] font-sans text-base lg:text-lg leading-relaxed">
          <p className={cx('absolute inset-0 transition-opacity duration-700', real ? 'opacity-0' : 'opacity-75')}>
            The official rule: treatment starts within 6 weeks of the referral reaching the hospital. Add about a week for the health centre to send it, and the whole journey should take 7 weeks.
          </p>
          <p className={cx('absolute inset-0 transition-opacity duration-700', real ? 'opacity-75' : 'opacity-0')}>
            Hospitals publish waiting lists, but not how long each cancer patient waited from first visit to treatment. Ajoissa records those dates, so the real length can be counted.
          </p>
        </div>

        <div className="mt-10 lg:mt-14 relative max-w-6xl lg:w-[calc(100%-46vh-4vw)]">
          {/* target track */}
          <div className="flex items-center gap-3 mb-3"><span className="label">Target</span><SourceBadge id="thlTargets" kind="estimate" demo={false} how={`${tr('en', 'how.targets')} The split into steps is ours, not official.`} /></div>
          <ol className="relative grid grid-cols-3 sm:grid-cols-6 gap-y-6">
            {/* the line runs through the dot centres (first to last column middle) */}
            <div className="hidden sm:block absolute top-3 h-px bg-ink/20" style={{ left: `${100 / 12}%`, right: `${100 / 12}%` }} />
            <div className="hidden sm:block absolute top-3 h-[3px] -mt-px bg-ink" style={{ left: `${100 / 12}%`, width: `${(Math.max(0, STEPS.filter((_, i) => lit(i)).length - 1) / 6) * 100}%` }} />
            {STEPS.map((s, i) => (
              <li key={s.id} className="relative flex flex-col items-center text-center">
                <span className={cx('w-6 h-6 rounded-full border-2 border-ink transition-all duration-300', lit(i) ? 'bg-mustard scale-110' : 'bg-paper')} />
                <span className={cx('mt-3 font-type text-[12px] uppercase tracking-wider leading-tight transition-opacity', lit(i) ? 'opacity-90' : 'opacity-30')}>{s.id}</span>
                <span className={cx('mt-1 font-serif italic text-lg leading-none transition-opacity', lit(i) ? 'opacity-100' : 'opacity-25')}>day {CUM[i]}</span>
              </li>
            ))}
          </ol>

          {/* reality track */}
          <div className={cx('mt-10 transition-all duration-700', real ? 'opacity-100' : 'opacity-0 translate-y-6')}>
            <div className="flex items-center gap-3 mb-3"><span className="label !opacity-90 text-terra">Reality</span><SourceBadge id="waitGap" kind="gap" /></div>
            <div className="relative h-10">
              <div className="absolute left-0 top-3 h-[3px] reality-line" style={{ width: real ? '125%' : '0%' }} />
              <div className="absolute right-0 -top-8 lg:-top-10 font-serif text-6xl lg:text-8xl text-terra leading-none">?</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-5 lg:left-24 right-5 lg:right-24 h-px bg-ink/10">
          <div className="h-full bg-terra" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    </section>
  )
}

/* ───────────── 2 · found too late: one real county contrast, then the whole country ───────────── */
/** Headline finding, computed from the Registry: breast cancer found after spread, highest vs lowest county. */
const BREAST = spreadContrast('breast')

function Ring({ label, value, unknown, delay }: { label: string; value: number; unknown: number; delay: number }) {
  const [ref, on] = useInView<HTMLDivElement>(0.4)
  const n = useCount(value * 100, on, 1600 + delay)
  const C = 2 * Math.PI * 54
  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-28 h-28 lg:w-40 lg:h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#D1D1C9" strokeWidth="5" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#C65D3B" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={on ? C * (1 - value) : C}
            style={{ transition: `stroke-dashoffset 1.8s cubic-bezier(.2,.7,.2,1) ${delay}ms` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-serif text-4xl lg:text-5xl tabular-nums lining-nums">
          {Math.round(n)}<span className="text-xl">%</span>
        </div>
      </div>
      <div className="mt-3 font-serif italic text-2xl">{label}</div>
      <div className="font-type text-xs tracking-wider opacity-50">stage unknown {pct(unknown)}</div>
    </div>
  )
}

/** One county as a bar with its 95% range drawn as a whisker; Finland as a dashed tick. */
function ContrastBar({ name, v, lo, hi, nat, hot, on, delay }: { name: string; v: number; lo: number; hi: number; nat: number; hot?: boolean; on: boolean; delay: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className={cx('font-serif text-2xl lg:text-3xl leading-none', hot && 'italic text-terra')}>{name}</span>
        <span className={cx('font-serif text-5xl lg:text-6xl leading-none tabular-nums lining-nums', hot && 'text-terra')}>{pct(v)}</span>
      </div>
      <div className="relative mt-3 h-4">
        <div className="absolute inset-0 rounded-full bg-ink/[0.07]" />
        <div className={cx('absolute inset-y-0 left-0 rounded-full origin-left transition-transform duration-[1400ms] ease-out', hot ? 'bg-terra' : 'bg-ink/80')}
          style={{ width: `${v * 100}%`, transform: `scaleX(${on ? 1 : 0})`, transitionDelay: `${delay}ms` }} />
        <div className={cx('absolute top-1/2 h-px bg-ink transition-opacity duration-500', on ? 'opacity-100' : 'opacity-0')}
          style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, transitionDelay: `${delay + 1300}ms` }} aria-hidden>
          <span className="absolute left-0 -top-2 h-4 border-l border-ink" />
          <span className="absolute right-0 -top-2 h-4 border-r border-ink" />
        </div>
        <div className="absolute -top-1.5 -bottom-1.5 border-l-2 border-dashed border-ink/50" style={{ left: `${nat * 100}%` }} aria-hidden />
      </div>
    </div>
  )
}

export function TooLate() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const { worst, best, nat, counted } = BREAST
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40 overflow-hidden">
      <div className="absolute -right-48 -top-24 opacity-[0.07] pointer-events-none hidden lg:block text-terra" aria-hidden><TextRing size={640} text="found too late • stage at diagnosis • " /></div>
      <h2 className="relative font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
        <WordsUp text="Found" /><br /><WordsUp text="too late." className="italic text-terra" delay={140} />
      </h2>

      <Lede className="mt-8">
        A cancer found after it has spread is much harder to treat. In {worst.c.name}, {Math.round(worst.v * 100)} of every 100 breast cancers had already spread when they were found. In {best.c.name}, {Math.round(best.v * 100)}. Same country, same national screening programme.
      </Lede>

      <div ref={ref} className="mt-14 lg:mt-20 grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-12 lg:gap-24 items-center">
        <div>
        <div className="flex items-center gap-2">
          <Label>Breast cancers found after they had spread</Label>
          <SourceBadge id="cancerRegistry" kind="direct" demo={false}
            how={`Non-localized share of breast cancers with known stage, 2021–25 preliminary statistics. ${worst.c.name} ${pct(worst.v)} (95% range ${pct(worst.lo)}–${pct(worst.hi)}, ${worst.n} cases; stage unknown for ${pct(worst.unknown)}, close to half). ${best.c.name} ${pct(best.v)} (${pct(best.lo)}–${pct(best.hi)}, ${best.n} cases; unknown ${pct(best.unknown)}). Finland ${pct(nat)}. Highest and lowest of the ${counted} counties where stage is known for at least half of cases.`} />
        </div>
        <div className="mt-8 space-y-8">
          <ContrastBar name={worst.c.name} v={worst.v} lo={worst.lo} hi={worst.hi} nat={nat} hot on={on} delay={0} />
          <ContrastBar name={best.c.name} v={best.v} lo={best.lo} hi={best.hi} nat={nat} on={on} delay={200} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-type text-xs uppercase tracking-widest opacity-60">
          <span className="flex items-center gap-2"><span className="h-3 border-l-2 border-dashed border-ink/60" />Finland {pct(nat)}</span>
          <span className="flex items-center gap-2"><span className="relative w-4 h-2 border-x border-ink"><span className="absolute inset-x-0 top-1/2 h-px bg-ink" /></span>95% range</span>
        </div>
        </div>
        <p className="font-serif text-3xl lg:text-4xl leading-snug lg:border-l lg:border-ink/15 lg:pl-10">
          The gap opens before treatment: <span className="italic text-terra">at screening and when symptoms are noticed.</span>
        </p>
      </div>

      <div className="mt-24 lg:mt-32">
        <div className="flex items-center gap-2">
          <Label>Whole country · found after spread</Label>
          <SourceBadge id="cancerRegistry" kind="direct" demo={false} how="Whole country, 2021–25 preliminary statistics. Share of cases with known stage that had spread beyond the organ (non-localized). This includes spread to nearby lymph nodes, so it is not the same as stage III–IV. Cases with unknown stage are left out; the share unknown is shown under each ring." />
        </div>
        <p className="mt-4 max-w-xl font-sans text-base lg:text-lg leading-relaxed opacity-75">
          Across Finland, most lung, bowel, pancreas and liver cancers with a known stage are found after they have spread. The small number under each ring is how often the stage was not recorded at all.
        </p>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-y-12">
          {CANCERS.map((c, i) => <Ring key={c.id} label={c.label} value={c.lateShare} unknown={c.unknownStage} delay={i * 150} />)}
        </div>
      </div>
    </section>
  )
}

/* ───────────── the cost of late: bowel cancer, in lives ───────────── */
const LIVES = bowelLives()
const LIVES_MAX = Math.max(...LIVES.byCounty.map((r) => r.per100k))
const LIVES_TOP = [...LIVES.byCounty].sort((a, b) => b.hi - a.hi)[0].c.id
const r1 = (n: number) => (n < 10 ? fmt(n, 1) : fmt(n))
const LIVES_HOW = `Bowel cancer only. Each county's share of bowel cancers found after spread (Cancer Registry, 2021–25, cases with a recorded stage) is brought down to the best quarter of counties (${pct(LIVES.bench)}; Finland ${pct(LIVES.nat)}). That gives ${fmt(LIVES.found)} cancers a year found before spreading instead of after. Each one is then worth the gap in 5-year relative survival: ${pct(BOWEL_SURV.local, 1)} when localized, against ${pct(BOWEL_SURV.spreadBest, 1)} to ${pct(BOWEL_SURV.spreadWorst, 1)} after spread, depending on how far (Finnish patients diagnosed 2006–15, BMC Cancer 2022). No pooled figure exists, so we show the whole range. Cases with unknown stage are not counted, so this is a floor. Survival has improved since 2006–15, and being found earlier does not guarantee survival.`

export function CostOfLate() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const t = useCount(1, on, 1800)
  const [cid, setCid] = useState(LIVES_TOP)
  const row = LIVES.byCounty.find((r) => r.c.id === cid)!
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40 overflow-hidden" aria-label="The cost of late">
      <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
        <WordsUp text="The cost" /><br /><WordsUp text="of late." className="italic text-terra" delay={140} />
      </h2>
      <Lede className="mt-8">
        Bowel cancer found early: {pct(BOWEL_SURV.local)} alive after five years. Found after it spreads: as few as {pct(BOWEL_SURV.spreadWorst)}.
      </Lede>

      <div ref={ref} className="mt-14 lg:mt-20 grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-14 lg:gap-24 items-center">
        <div>
          <Label>If every county caught up with the best</Label>
          <div className="mt-4 flex items-end gap-4 flex-wrap">
            <span className="font-serif text-8xl lg:text-[9rem] leading-[0.8] tabular-nums lining-nums text-terra whitespace-nowrap">
              {fmt(Math.round(LIVES.lo * t))}<span className="opacity-50">–</span>{fmt(Math.round(LIVES.hi * t))}
            </span>
            <span className="pb-1 font-serif text-2xl lg:text-3xl leading-tight">more people alive<br /><span className="italic">every year</span>
              <SourceBadge id="bowelStageSurvival" kind="estimate" demo={false} className="ml-2 align-middle" how={LIVES_HOW} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)] gap-6 sm:gap-8 items-center">
          <FinlandMap selected={cid} onSelect={setCid} label="People a year by county"
            style={(c) => {
              const r = LIVES.byCounty.find((x) => x.c.id === c.id)!
              return { fill: r.found > 0 ? scaleColor(0.15 + 0.85 * (r.per100k / LIVES_MAX)) : 'rgba(31,31,31,.12)' }
            }}
            tooltip={(c) => {
              const r = LIVES.byCounty.find((x) => x.c.id === c.id)!
              return r.found > 0 ? `${r1(r.lo)}–${r1(r.hi)} a year` : 'already early'
            }} />
          <div className="min-w-0">
            <p className="font-serif italic text-3xl leading-tight">{row.c.name}</p>
            {row.found > 0
              ? <p className="mt-3 font-serif text-5xl tabular-nums leading-none">{r1(row.lo)}–{r1(row.hi)}<span className="block mt-2 font-type text-xs uppercase tracking-widest opacity-60">a year</span></p>
              : <p className="mt-3 font-type text-xs uppercase tracking-widest opacity-60">Already early</p>}
            <div className="mt-6 flex items-center gap-2 font-type text-[11px] uppercase tracking-widest opacity-60">
              <span>Fewer</span><span className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${scaleColor(0.15)}, ${scaleColor(0.575)}, ${scaleColor(1)})` }} /><span>More</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── 3 · one system, three views ───────────── */
function PhoneMock() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const msgs: [boolean, string][] = [
    [true, 'Coughing three weeks. Smoked 30 years.'],
    [false, 'Saved. Next step: see a doctor within two weeks.'],
    [true, 'Referral sent. Still no scan date.'],
    [false, 'Draft to the clinic is ready →'],
  ]
  return (
    <div ref={ref} className="relative w-[290px] h-[560px] rounded-[2.75rem] bg-ink p-3 shadow-2xl rotate-[-4deg] hover:rotate-0 transition-transform duration-700">
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-ink z-10" />
      <div className="relative h-full w-full rounded-[2.2rem] bg-paper paper-texture p-5 pt-12 flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <div className="label">Referral</div>
            <div className="font-serif text-6xl leading-none tabular-nums lining-nums">21<span className="text-xl italic"> d</span></div>
          </div>
          <div className={cx('rv rv-stamp', on && 'in')} style={{ transitionDelay: '400ms' }}><Stamp tone="terra">+7 d</Stamp></div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-stone overflow-hidden"><div className="h-full bg-terra transition-all duration-[1600ms] ease-out" style={{ width: on ? '100%' : '0%' }} /></div>
        <div className="mt-auto space-y-2.5">
          {msgs.map(([me, t], i) => (
            <div key={i} className={cx('rv rv-up flex', on && 'in', me ? 'justify-end' : 'justify-start')} style={{ transitionDelay: `${700 + i * 450}ms` }}>
              <span className={cx('max-w-[80%] px-3.5 py-2 rounded-2xl text-[13px] font-sans leading-snug', me ? 'bg-ink text-paper rounded-br-sm' : 'bg-mustard rounded-bl-sm')}>{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-ink/10 pt-3">
          <span className="flex-1 font-serif italic opacity-40">Tell me…</span>
          <span className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-sm">↑</span>
        </div>
      </div>
    </div>
  )
}

function HospitalMock() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const rows = [
    { id: 'P-0412', c: 'Lung', s: 'Scan', d: 19, esc: true },
    { id: 'P-0388', c: 'Bowel', s: 'Diagnosis', d: 11 },
    { id: 'P-0451', c: 'Lung', s: 'Referral', d: 8 },
    { id: 'P-0297', c: 'Pancreas', s: 'Team mtg', d: 4 },
    { id: 'P-0503', c: 'Liver', s: 'Scan', d: 2 },
  ]
  const bars = [0.35, 0.9, 0.55, 0.3, 0.45]
  return (
    <div ref={ref} className="relative w-full max-w-[520px]">
      <Card tone="paper" tilt={2} className="p-6 pl-10 border border-ink/10 hover:!rotate-0">
        <EdgeText>Off track</EdgeText>
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-5xl leading-none">14<span className="italic text-2xl"> off track</span></span>
          <span className="label">Pirkanmaa</span>
        </div>
        <div className="mt-5 space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.id} className={cx('rv rv-right flex items-center gap-3 rounded-md px-3 py-2 font-type text-[13px]', on && 'in', r.esc ? 'bg-terra text-paper' : 'bg-ink/[0.04]')}
              style={{ transitionDelay: `${200 + i * 120}ms` }}>
              <span className={cx('w-2 h-2 rounded-full', r.esc ? 'bg-mustard animate-ping' : r.d > 7 ? 'bg-terra' : 'bg-mustard')} />
              <span className="w-14">{r.id}</span><span className="w-16 opacity-70">{r.c}</span><span className="flex-1 opacity-70">{r.s}</span>
              <span className="font-serif text-base tabular-nums lining-nums">+{r.d}d</span>
              {r.esc && <span className="uppercase tracking-widest text-[11px] border border-paper/60 rounded-full px-2 py-0.5">Escalated</span>}
            </div>
          ))}
        </div>
        <div className="mt-6 tear pt-4 flex items-end gap-2 h-24">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className={cx('w-full rounded-t-sm origin-bottom transition-transform duration-1000 ease-out', i === 1 ? 'bg-terra' : 'bg-ink/80')}
                style={{ height: `${b * 100}%`, transform: `scaleY(${on ? 1 : 0})`, transitionDelay: `${800 + i * 100}ms` }} />
              <span className="font-type text-[10px] uppercase opacity-50">{['Ref', 'Scan', 'Dx', 'MDT', 'Tx'][i]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CountyMock() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const vals = COUNTIES.map((c) => c.cancers.lung.lateShare)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const worst = COUNTIES[vals.indexOf(hi)]
  const cols = Math.max(...COUNTIES.map((c) => c.col)) + 1
  const rows = Math.max(...COUNTIES.map((c) => c.row)) + 1
  return (
    <div ref={ref} className="relative">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 64px)`, gridTemplateRows: `repeat(${rows}, 64px)` }}>
        {COUNTIES.map((c) => {
          const t = (c.cancers.lung.lateShare - lo) / (hi - lo || 1)
          const isW = c.id === worst.id
          return (
            <div key={c.id} title={c.name}
              className={cx('rv rv-scale rounded-md relative flex items-end p-1.5', on && 'in', isW && 'ring-2 ring-mustard ring-offset-2 ring-offset-paper')}
              style={{ gridColumn: c.col + 1, gridRow: c.row + 1, background: `color-mix(in srgb, #C65D3B ${Math.round(15 + t * 85)}%, #F4F1EA)`, transitionDelay: `${c.row * 90 + c.col * 50}ms` }}>
              <span className={cx('font-type text-[10px] uppercase leading-none', t > 0.55 ? 'text-paper' : 'text-ink/70')}>{c.name.slice(0, 4)}</span>
              {isW && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-mustard animate-ping" />}
            </div>
          )
        })}
      </div>
      <div className={cx('rv rv-stamp absolute -right-6 lg:-right-16 top-6', on && 'in')} style={{ transitionDelay: '1500ms' }}>
        <Card tone="mustard" tilt={-6} className="px-4 py-3">
          <div className="label !opacity-80">Radar · weakest step</div>
          <div className="font-serif italic text-2xl leading-tight">{worst.name}</div>
          <div className="font-type text-xs uppercase tracking-widest mt-0.5">found late</div>
        </Card>
      </div>
    </div>
  )
}

const VIEWS = [
  { k: '01', who: 'Patient', a: 'Notice it.', b: 'Say it. Chase it.', p: 'Write down symptoms in your own words and find out whether a screening or a doctor visit is worth it: you get a clear next step. See how long each step of your care has taken, and if one runs late, Ajoissa drafts a message to the clinic for you. If you want, it checks in on you between visits. In Finnish, Swedish or English.', chips: ['Symptom diary', 'Screening check', 'Pathway clock', 'Check-ins', '3 languages'], mock: <PhoneMock />, to: '/patient' },
  { k: '02', who: 'Hospital', a: 'See who is', b: 'falling behind.', p: 'A live list of patients whose next step is overdue, most delayed first. The worst cases are flagged for escalation, and the bars show which step causes the most delay.', chips: ['Off-track list', 'Auto-escalation', 'Shared records', 'Delay map'], mock: <HospitalMock />, to: '/hospital' },
  { k: '03', who: 'County', a: 'Find where', b: 'people are lost.', p: 'The detection radar follows each county from people at risk, to screening, to stage at diagnosis, to survival, and marks the step where it loses the most people. Darker tiles mean more late diagnoses.', chips: ['Detection radar', 'Who misses screening', 'Overload warning', 'Action brief'], mock: <CountyMock />, to: '/county' },
]

export function Views() {
  return (
    <section className="relative px-5 lg:px-24 py-24 lg:py-32 space-y-32 lg:space-y-48">
      <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95] text-center">
        <WordsUp text="One record." /><br /><WordsUp text="Three views." className="italic" delay={200} />
      </h2>
      <Lede className="mx-auto !mt-8 text-center">
        Each patient has one timeline. The patient, their hospital and their county each see it from their own side.
      </Lede>
      {VIEWS.map((v, i) => (
        <div key={v.k} className={cx('grid lg:grid-cols-2 gap-14 lg:gap-24 items-center', i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
          <div className="relative">
            <Reveal fx="left" className="flex items-center gap-4">
              <span className="font-type text-xs tracking-widest">{v.k}</span><span className="h-px w-16 bg-ink" /><span className="label !opacity-90">{v.who}</span>
            </Reveal>
            <h3 className="mt-6 font-serif font-light text-5xl lg:text-7xl leading-[0.95]">
              <WordsUp text={v.a} /><br /><WordsUp text={v.b} className="italic text-terra" delay={150} />
            </h3>
            <Lede className="mt-6" delay={200}>{v.p}</Lede>
            <div className="mt-8 flex flex-wrap gap-2">
              {v.chips.map((c, j) => (
                <Reveal key={c} fx="scale" delay={300 + j * 80} as="span"
                  className="inline-block font-type text-[13px] uppercase tracking-widest border border-ink/25 rounded-full px-4 py-2 hover:bg-ink hover:text-paper transition-colors">{c}</Reveal>
              ))}
            </div>
            <Reveal fx="up" delay={700} className="mt-10">
              <a href={`#${v.to}`} className="group inline-flex items-center gap-3 font-type uppercase text-xs tracking-widest">
                Open <span className="w-10 h-10 rounded-full border border-ink flex items-center justify-center group-hover:bg-mustard group-hover:border-mustard group-hover:translate-x-1 transition">→</span>
              </a>
            </Reveal>
          </div>
          <Reveal fx={i % 2 ? 'left' : 'right'} className="flex justify-center overflow-visible">
            <Tilt max={10} className="max-w-full overflow-x-auto lg:overflow-visible py-6 px-2"><div className="float-y">{v.mock}</div></Tilt>
          </Reveal>
        </div>
      ))}
    </section>
  )
}

/* ───────────── 4 · privacy ───────────── */
export function Privacy() {
  const [ref, on] = useInView<HTMLDivElement>(0.4)
  const [manual, setManual] = useState<boolean | null>(null)
  const shared = manual ?? on
  return (
    <section className="relative bg-ink text-paper overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none privacy-grid" />
      <div ref={ref} className="relative px-5 lg:px-24 py-28 lg:py-40 grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
        <div>
          <Label className="!opacity-50">Privacy by design</Label>
          <h2 className="mt-6 font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
            <WordsUp text="Nothing moves" /><br /><WordsUp text="until you say so." className="italic text-mustard" delay={200} />
          </h2>
          <Lede className="mt-8">
            Your health data stays with you. A hospital sees your timeline only after you choose to share it, and the county only ever sees anonymous totals. Tap the switch to try it.
          </Lede>
          <div className="mt-12 grid sm:grid-cols-3 gap-6 max-w-2xl">
            {[['Hospital', 'only if you share'], ['County', 'counts, never names'], ['You', 'withdraw any time']].map(([a, b], i) => (
              <Reveal key={a} delay={400 + i * 120} className="border-t border-paper/20 pt-4">
                <div className="font-serif text-3xl italic">{a}</div>
                <div className="font-type text-[13px] uppercase tracking-widest opacity-60 mt-1">{b}</div>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="relative flex justify-center">
          <button onClick={() => setManual(!shared)} aria-pressed={shared} aria-label="Share with hospital"
            className="relative w-[300px] h-[150px] lg:w-[360px] lg:h-[180px] rounded-full border-2 border-paper/30 transition-colors duration-700"
            style={{ background: shared ? '#FFC233' : 'transparent' }}>
            <span className="absolute top-1/2 -translate-y-1/2 w-[120px] h-[120px] lg:w-[150px] lg:h-[150px] rounded-full bg-paper shadow-2xl flex items-center justify-center transition-all duration-700"
              style={{ left: shared ? 'calc(100% - 15px - var(--k))' : '15px', ['--k' as string]: 'clamp(120px, 10vw, 150px)', transitionTimingFunction: 'cubic-bezier(.5,1.6,.4,1)' }}>
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d={shared ? 'M8 11V8a4 4 0 0 1 7.5-2' : 'M8 11V8a4 4 0 0 1 8 0v3'} style={{ transition: 'd .5s' }} />
              </svg>
            </span>
          </button>
          <div className={cx('absolute -top-10 -right-2 lg:right-4 rv rv-stamp', shared && 'in')} style={{ transitionDelay: shared ? '500ms' : '0ms' }}>
            <span className="inline-block border-2 border-mustard text-mustard font-type uppercase tracking-widest text-sm px-4 py-2 rounded-sm">Shared by you</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── 5 · three dates ───────────── */
export function ThreeDates() {
  const [ref, on] = useInView<HTMLDivElement>(0.35)
  const dates = [['Referral', '03.11.'], ['Diagnosis', '17.11.'], ['Treatment', '01.12.']]
  const n = useCount(28, on, 1400)
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="Three dates." /><br /><WordsUp text="Enough to count." className="italic text-terra" delay={180} />
        </h2>
        <Reveal fx="blur" delay={300} className="flex items-center gap-2"><Label>Starter dataset</Label><SourceBadge id="illustration" kind="example" how="Example dates for one patient: 3 Nov → 1 Dec = 28 days." /></Reveal>
      </div>
      <Lede className="mt-8">
        No new IT system is needed to start. Three dates per patient — referral, diagnosis and start of treatment — already show where time is lost.
      </Lede>
      <div ref={ref} className="relative mt-20 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-10 items-center">
        <svg className="absolute left-0 right-24 top-1/2 h-4 -translate-y-1/2 hidden sm:block w-full" preserveAspectRatio="none" viewBox="0 0 100 4" aria-hidden>
          <path d="M2 2 H98" stroke="#1F1F1F" strokeOpacity=".35" strokeWidth=".4" strokeDasharray="1.5 1.5" fill="none"
            pathLength={100} style={{ strokeDashoffset: on ? 0 : 100, transition: 'stroke-dashoffset 1.6s ease-out' }} />
        </svg>
        {dates.map(([a, b], i) => (
          <div key={a} className={cx('relative rv rv-stamp', on && 'in')} style={{ transitionDelay: `${i * 350}ms` }}>
            <Tilt max={14}><Card tone={i === 1 ? 'mustard' : 'paper'} tilt={[-4, 3, -2][i]} className="p-6 pl-10 border border-ink/10">
              <EdgeText>{String(i + 1).padStart(2, '0')}</EdgeText>
              <div className="label">{a}</div>
              <div className="mt-2 font-type text-4xl lg:text-5xl tracking-tight">{b}</div>
            </Card></Tilt>
          </div>
        ))}
        <div className={cx('rv rv-scale text-center sm:text-left', on && 'in')} style={{ transitionDelay: '1200ms' }}>
          <div className="font-serif text-8xl lg:text-9xl leading-none tabular-nums lining-nums">{Math.round(n)}</div>
          <div className="label mt-1">days to treatment</div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── 3b · caring check-ins (spec 1.6) ───────────── */
const CI_DAYS = 21
const CI_ROWS = [
  { who: 'Worrying symptom', every: 7, hot: true },
  { who: 'Everyone else', every: 14, hot: false },
]

/** Scroll-scrubbed: the days tick by after a cough is logged; the app reaches out on schedule, the reply lands in the diary. */
/** Plays itself while on screen: 21 days tick by in ~7 s, it holds on the result, then starts again. */
const CI_PLAY_MS = 7000, CI_HOLD_MS = 3000
function useLoopDay(on: boolean) {
  const [day, setDay] = useState(0)
  useEffect(() => {
    if (!on) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const t = (now - t0) % (CI_PLAY_MS + CI_HOLD_MS)
      setDay(Math.min(CI_DAYS, (t / CI_PLAY_MS) * CI_DAYS))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return day
}

export function CheckIns() {
  const [ref, on] = useInView<HTMLElement>(0.4, false)
  const day = useLoopDay(on)
  const ping = day >= 7, two = day >= 14, reply = day >= 16, saved = day >= 18
  return (
    <section ref={ref} className="relative">
      <div className="min-h-[100svh] px-5 lg:px-24 py-16 lg:py-10 flex flex-col justify-center overflow-hidden">
        <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-20 lg:items-end">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="We don't wait." /><br /><WordsUp text="We ask." className="italic text-terra" delay={180} />
        </h2>
        <Lede className="mt-8 lg:mt-0">
          Log a symptom and Ajoissa checks in: every week if it is worrying, every two weeks otherwise. Still there? It tells you to see a doctor.
        </Lede>
        </div>
        <div className="mt-12 lg:mt-10 grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-center">
          <div>
            <div className="flex items-baseline gap-4">
              <span className="font-serif text-7xl lg:text-8xl leading-none tabular-nums lining-nums w-[2.2ch]">{Math.floor(day)}</span>
              <span className="label">days since<br />“cough”</span>
            </div>
            <div className="mt-8 space-y-6">
              {CI_ROWS.map((r) => (
                <div key={r.who}>
                  <div className={cx('font-type text-sm uppercase tracking-widest mb-3', r.hot && 'text-terra')}>{r.who}</div>
                  <div className="relative flex justify-between items-center">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-ink/15" />
                    <div className="absolute left-0 top-1/2 h-px bg-ink" style={{ width: `${(day / CI_DAYS) * 100}%` }} />
                    {Array.from({ length: CI_DAYS + 1 }, (_, d) => {
                      const due = d > 0 && d % r.every === 0
                      const past = day >= d
                      return due
                        ? <span key={d} className={cx('relative w-5 h-5 rounded-full border-2 transition-all duration-300',
                            past ? (r.hot ? 'bg-terra border-terra scale-110' : 'bg-ink border-ink scale-110') : 'bg-paper border-ink/30')} />
                        : <span key={d} className={cx('relative w-1 h-1 rounded-full', past ? 'bg-ink' : 'bg-ink/20')} />
                    })}
                  </div>
                </div>
              ))}
              <div className="relative h-5 font-type text-sm opacity-60">
                {['Day 0', '1 wk', '2 wk', '3 wk'].map((l, i) => (
                  <span key={l} className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full" style={{ left: `${(i / 3) * 100}%` }}>{l}</span>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 font-type text-sm uppercase tracking-widest">
              <span className="flex items-center gap-2"><span className="w-7 h-4 rounded-full bg-mustard relative"><span className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-paper" /></span>You switch it on</span>
              <span className="opacity-70">Only what you told us</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative w-[280px] h-[480px] lg:w-[270px] lg:h-[470px] rounded-[2.75rem] bg-ink p-3 shadow-2xl rotate-[3deg]">
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-ink z-10" />
              <div className="relative h-full w-full rounded-[2.2rem] bg-paper paper-texture p-5 pt-12 flex flex-col gap-3">
                <div className="text-center font-serif text-5xl lining-nums tabular-nums opacity-80">9:41</div>
                <div className={cx('transition-all duration-500 rounded-2xl bg-ink text-paper p-4 shadow-lg', ping ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4')}>
                  <div className="font-type text-sm uppercase tracking-widest text-mustard">Ajoissa</div>
                  <p key={two ? 2 : 1} className="mt-1 font-sans text-[15px] leading-snug">{two ? 'Hi, two weeks ago you mentioned a cough. Is it still there? Has anything changed?' : 'Hi, last week you mentioned a cough. How is it now?'}</p>
                </div>
                <div className={cx('self-end max-w-[85%] transition-all duration-500 rounded-2xl rounded-br-sm bg-mustard px-4 py-2.5 font-sans text-[15px] leading-snug', reply ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
                  Still there. Worse at night.
                </div>
                <div className={cx('mt-auto border-t border-ink/15 pt-3 transition-opacity duration-500', saved ? 'opacity-100' : 'opacity-0')}>
                  <div className="label">Diary · day 16</div>
                  <p className="mt-1 font-serif text-xl leading-tight">Cough, worse at night</p>
                  <div className="mt-3 inline-block font-type text-sm uppercase tracking-widest text-terra border border-terra rounded-full px-3 py-1">→ See a doctor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── 6 · what is real, what is not ───────────── */
const REAL_SRC: [string, string][] = [
  ['cancerRegistry', 'Cases, deaths, stage'],
  ['statfinProjection', 'Population by age'],
  ['statfinIncome', 'Income by town'],
  ['sotkanetScreening', 'Screening turnout'],
  ['sotkanetRisk', 'Smoking, drinking, obesity'],
  ['sotkanetQueue', 'Specialist waiting lists'],
  ['strategy', 'Targets for 2035'],
  ['plco', 'Lung risk model'],
]
const unk = Object.values(REGISTRY_FI).map((r) => r.unknownStage)
const OURS = [
  'Survival: deaths ÷ new cases.',
  'Higher risk: residents × risk-factor rates. Not validated.',
  'Bowel, breast, cervical check: Registry rates × published risks.',
  'Step targets: the 6-week rule, split by us.',
]
/** Stage reporting is itself a finding: how many counties miss it for most bowel cancers. */
const STAGE_FINDING = `Stage is missing for most bowel cancers in ${unknownMajority('bowel')} of ${COUNTIES.length} counties.`
const LIMITS = [
  'No cancer waiting times are published.',
  `Stage is unknown for ${pct(Math.min(...unk))}–${pct(Math.max(...unk))} of cases.`,
  'Small counties have wide ranges.',
  'Lung model: US data, not validated here.',
  'Hospital patients are synthetic.',
]

export function Transparency() {
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40" aria-label="Data and limitations">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="What is measured." /><br /><WordsUp text="What is not." className="italic text-terra" delay={180} />
        </h2>
        <Reveal fx="blur" delay={300}><KindLegend /></Reveal>
      </div>
      <Lede className="mt-8">Every number has a badge. Hover it for the source.</Lede>
      <div className="mt-16 lg:mt-24 grid md:grid-cols-3 gap-8 lg:gap-10 items-start">
        <Reveal delay={0}>
          <Tilt><Card tone="paper" tilt={-1.5} className="relative p-6 pl-10 border border-ink/10">
            <EdgeText>Published</EdgeText>
            <div className="flex items-center gap-2"><KindDot kind="direct" /><Label>Official data</Label></div>
            <ul className="mt-4 space-y-2.5">
              {REAL_SRC.map(([id, what]) => (
                <li key={id} className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink/15 pb-2">
                  <span className="font-serif text-lg leading-tight">{what}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <SourceBadge id={id} kind="direct" demo={false} />
                  </span>
                </li>
              ))}
            </ul>
          </Card></Tilt>
        </Reveal>
        <Reveal delay={150}>
          <Tilt><Card tone="mustard" tilt={1} className="relative p-6 pl-10">
            <EdgeText>Worked out</EdgeText>
            <div className="flex items-center gap-2"><KindDot kind="estimate" /><Label className="!opacity-80">Our calculations</Label></div>
            <ul className="mt-4 space-y-3 font-sans text-[15px] leading-snug">
              {OURS.map((t) => <li key={t} className="border-b border-dashed border-ink/20 pb-3">{t}</li>)}
            </ul>
          </Card></Tilt>
        </Reveal>
        <Reveal delay={300}>
          <Tilt><Card tone="ink" tilt={-1} className="relative p-6 pl-10">
            <EdgeText>Limits</EdgeText>
            <div className="flex items-center gap-2"><KindDot kind="gap" /><Label className="!opacity-70">What we cannot say</Label></div>
            <p className="mt-4 pb-3 border-b border-dashed border-paper/20 font-serif text-2xl leading-tight">
              {STAGE_FINDING}{' '}
              <SourceBadge id="cancerRegistry" kind="direct" demo={false} className="[&>button]:ring-1 [&>button]:ring-paper/60" how="Counties where the Cancer Registry has no stage for more than half of bowel cancers, 2021–25 preliminary statistics. Stage comes from clinical notifications; where they are missing, it stays unknown. The radar counts those counties half." />
            </p>
            <ul className="mt-3 space-y-3 font-sans text-[15px] leading-snug">
              {LIMITS.map((t) => <li key={t} className="border-b border-dashed border-paper/20 pb-3">{t}</li>)}
            </ul>
          </Card></Tilt>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────── 7 · from finding to action ───────────── */
type Effort = 1 | 2 | 3
type Icon = 'risk' | 'mail' | 'scan' | 'clock' | 'calendar'
/** Ordered along the care pathway, left to right. `goal`: a share the target ring fills to, or a glyph. */
const PLAYBOOK: { step: string; icon: Icon; finding: string; action: string; who: string; effort: Effort; goal: number | string; target: string; badge: React.ReactNode }[] = [
  {
    step: 'Risk', icon: 'risk', finding: 'Many at higher risk', action: 'Self-check in the app, then a doctor',
    who: 'Health centre nurse', effort: 2, goal: '↑', target: 'More people at risk reached',
    badge: <SourceBadge id="plco" kind="estimate" demo={false} how="Lung: PLCOm2012 six-year risk ≥ 1.51% (Tammemägi et al. 2014). Built on US data; not validated in Finland. Lung CT screening is only piloted in Finland. Other cancers: our rough county heuristic. Uses a published lung-risk cut-off." />,
  },
  {
    step: 'Screening', icon: 'mail', finding: 'Few get screened', action: 'Reminder and a second kit, lowest towns first',
    who: 'Screening unit', effort: 1, goal: 0.8, target: 'Turnout in every county',
    badge: <SourceBadge id="strategy" kind="direct" demo={false} how="Strategy target by 2035: 80% screening turnout in every county. Builds on the existing screening invitations. Tracked with THL Sotkanet 6103 / 3621 / 3620, already on the radar." />,
  },
  {
    step: 'Doctor visit', icon: 'scan', finding: 'Found after spread', action: 'Scan straight away for warning signs',
    who: 'Health centre doctor', effort: 2, goal: 0.7, target: 'Found early',
    badge: <SourceBadge id="strategy" kind="direct" demo={false} how="Strategy target by 2035: 70% of cancers found at stage I–II. Uses the urgent referral in the regional care pathway. Warning signs, for example: weight loss with new diabetes, or jaundice (pancreas and liver). Tracked on the radar as the Registry's spread share (Found late)." />,
  },
  {
    step: 'Treatment', icon: 'clock', finding: 'Waiting time unknown', action: 'Record three dates; call anyone running late',
    who: 'Nurse coordinator', effort: 1, goal: '6 wk', target: 'Referral to treatment',
    badge: <SourceBadge id="thlTargets" kind="direct" demo={false} how="Referral arriving → first treatment within 6 weeks, tests included (STM report 2010:6). Tracked by the hospital off-track list." />,
  },
  {
    step: 'Capacity', icon: 'calendar', finding: 'More cases by 2035', action: 'Book scan and specialist time early',
    who: 'County', effort: 3, goal: '↓', target: 'Fewer waiting over 6 months',
    badge: <SourceBadge id="sotkanetQueue" kind="direct" demo={false} how="THL Sotkanet 3336: waited over 6 months for specialist care, per 10 000 residents. Planned in the yearly budget and service plan, using the 2035 projection on the Overload tab." />,
  },
]
const EFFORT = ['', 'Low effort', 'Medium effort', 'High effort']

function EffortBars({ n }: { n: Effort }) {
  return (
    <span className="inline-flex items-end gap-1" aria-label={EFFORT[n]} title={EFFORT[n]}>
      {[1, 2, 3].map((i) => <i key={i} className={cx('w-2 rounded-sm', i <= n ? 'bg-ink' : 'bg-ink/15')} style={{ height: 6 + i * 5 }} />)}
    </span>
  )
}

const ICON_PATHS: Record<Icon, React.ReactNode> = {
  risk: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" /><path d="M18.5 4.5v4M16.5 6.5h4" /></>,
  mail: <><rect x="3.5" y="6" width="17" height="12" rx="1.5" /><path d="m4 7 8 6 8-6" /></>,
  scan: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /><path d="M8 10.5h5M10.5 8v5" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="1.5" /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" /><path d="m9.5 15 2 2 3.5-4" /></>,
}
function PlayIcon({ k }: { k: Icon }) {
  return <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON_PATHS[k]}</svg>
}

/** Target as a ring: fills to the share for percentage targets, otherwise shows the glyph. */
function GoalRing({ goal, on, delay }: { goal: number | string; on: boolean; delay: number }) {
  const r = 26, c = 2 * Math.PI * r
  const share = typeof goal === 'number' ? goal : 1
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#C65D3B" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={on ? c * (1 - share) : c}
          style={{ transition: `stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1) ${delay}ms`, strokeOpacity: typeof goal === 'number' ? 1 : 0.35 }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-serif text-2xl tabular-nums">
        {typeof goal === 'number' ? `${Math.round(goal * 100)}%` : goal}
      </span>
    </div>
  )
}

function Playbook() {
  const [ref, on] = useInView<HTMLDivElement>(0.25)
  return (
    <div ref={ref} className="mt-16 lg:mt-20">
      {/* the care pathway the actions sit on */}
      <div className="relative hidden lg:grid grid-cols-5 gap-6 mb-6">
        <div className="absolute left-[10%] right-[10%] top-[7px] h-px bg-ink origin-left transition-transform duration-[1400ms] ease-out" style={{ transform: `scaleX(${on ? 1 : 0})` }} />
        {PLAYBOOK.map((r, i) => (
          <div key={r.step} className="relative flex flex-col items-center gap-3">
            <span className={cx('w-[15px] h-[15px] rounded-full border-2 border-ink bg-paper transition-colors duration-300', on && 'bg-terra border-terra')} style={{ transitionDelay: `${300 + i * 250}ms` }} />
            <span className="font-type text-xs uppercase tracking-widest">{r.step}</span>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-6">
        {PLAYBOOK.map((r, i) => (
          <div key={r.step} className={cx('rv rv-up', on && 'in')} style={{ transitionDelay: `${300 + i * 250}ms` }}>
            <Tilt max={8} className="h-full">
              <div className="h-full rounded-xl border border-ink/12 bg-paper shadow-[0_10px_30px_-18px_rgba(0,0,0,.35)] p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-full bg-terra/10 text-terra flex items-center justify-center"><PlayIcon k={r.icon} /></span>
                  <span className="lg:hidden font-type text-xs uppercase tracking-widest opacity-60">{r.step}</span>
                </div>
                <div className="mt-4 font-serif italic text-xl leading-tight text-terra lg:min-h-[2.5em]">{r.finding}</div>
                <div className="my-3 text-2xl leading-none opacity-30" aria-hidden>↓</div>
                <div className="font-serif text-2xl leading-tight lg:min-h-[5em]">{r.action}</div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-ink/20 pt-3">
                  <span className="flex items-center gap-2 font-sans text-sm leading-tight min-w-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" /></svg>
                    {r.who}
                  </span>
                  <EffortBars n={r.effort} />
                </div>
                <div className="mt-auto pt-5 flex items-center gap-3">
                  <GoalRing goal={r.goal} on={on} delay={600 + i * 250} />
                  <span className="font-sans text-sm leading-snug flex flex-wrap items-center gap-1.5">{r.target} {r.badge}</span>
                </div>
              </div>
            </Tilt>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-type text-xs uppercase tracking-widest opacity-60">
        <span className="flex items-center gap-2"><EffortBars n={1} /> Effort</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-terra" /> Target</span>
      </div>
    </div>
  )
}

const EASY: [string, string, React.ReactNode][] = [
  ['Open data', 'Cancer Registry, Statistics Finland, THL', <SourceBadge key="r" id="cancerRegistry" kind="direct" demo={false} />],
  ['No record linking', 'The radar uses public totals only', null],
  ['A browser', 'Nothing to install', null],
  ['A yearly refresh', 'Scripts and open data feeds', null],
  ['Diary first', 'Works without records; AI optional', null],
]

export function Actions() {
  const [cid, setCid] = useState('pohjois-karjala')
  const [k, setK] = useState<RadarCancerId>('lung')
  const county = COUNTIES.find((c) => c.id === cid)!
  const brief = buildBrief(county, k)
  return (
    <section id="act" className="relative px-5 lg:px-24 py-28 lg:py-40 overflow-hidden" aria-label="Actions">
      <div className="absolute -right-48 -top-24 opacity-[0.07] pointer-events-none hidden lg:block" aria-hidden><TextRing size={640} text="finding • action • who • target • " /></div>
      <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
        <WordsUp text="A gap found." /><br /><WordsUp text="A step to take." className="italic text-terra" delay={180} />
      </h2>
      <Lede className="mt-8">One action for each step of the pathway: what to do, who does it, and the target it moves.</Lede>

      <Playbook />

      <div className="mt-20 lg:mt-24 grid lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-20 items-start">
        {/* real-data hook: any county → its weakest step → its three actions (same engine as the county brief) */}
        <Reveal fx="up">
          <Tilt max={4}><Card tone="mustard" tilt={-1} className="relative p-6 pl-10 lg:p-8 lg:pl-12">
            <EdgeText>Try it</EdgeText>
            <div className="grid grid-cols-[120px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] sm:grid-rows-[auto_1fr] gap-x-5 sm:gap-x-8 items-start">
              <FinlandMap selected={cid} onSelect={setCid} label="Pick a county" className="sm:row-span-2"
                style={(c) => ({ fill: c.id === cid ? '#C65D3B' : 'rgba(31,31,31,.2)' })}
                tooltip={(c) => stepInfo(buildBrief(c, k).gap.step).label} />
              <div className="min-w-0 self-center sm:self-start">
                <Label className="!opacity-80">Pick a county on the map</Label>
                <p className="mt-1 font-serif italic text-3xl lg:text-4xl leading-tight">{county.name}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {RADAR_CANCERS.map((c) => (
                    <button key={c.id} type="button" onClick={() => setK(c.id)} aria-pressed={k === c.id}
                      className={cx('font-type text-xs uppercase tracking-widest rounded-full px-3 py-1 border transition-colors', k === c.id ? 'bg-ink text-paper border-ink' : 'border-ink/30 hover:border-ink')}>{c.label}</button>
                  ))}
                </div>
                <div className="mt-6 tear pt-4">
                  <Label className="!opacity-80">Weakest step · {stepInfo(brief.gap.step).label}</Label>
                  <p className="mt-1 font-serif text-2xl leading-tight flex flex-wrap items-center gap-2">{brief.gap.why} {brief.gap.badge}</p>
                </div>
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {brief.actions.map((a, i) => (
                <li key={a.id} className="flex gap-3 items-start">
                  <span className={cx('w-8 h-8 rounded-full flex items-center justify-center font-serif shrink-0', i === 0 ? 'bg-ink text-mustard' : 'border border-ink')}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-serif text-xl leading-tight flex items-center gap-2">{a.title} {a.badge}</p>
                    <p className="font-sans text-[15px] leading-snug opacity-75 mt-1">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a href={`#/county?c=${cid}&rc=${k}`} className="group mt-6 inline-flex items-center gap-3 font-type uppercase text-xs tracking-widest">
              Full brief, printable <span className="w-9 h-9 rounded-full border border-ink flex items-center justify-center group-hover:bg-ink group-hover:text-mustard transition">→</span>
            </a>
          </Card></Tilt>
        </Reveal>

        {/* what it takes to start */}
        <div>
          <Label>What it takes to start</Label>
          <div className="mt-6 space-y-5">
            {EASY.map(([a, b, badge], i) => (
              <Reveal key={a} delay={200 + i * 100} className="border-t border-ink/20 pt-3">
                <div className="font-serif text-3xl italic flex items-center gap-2">{a}{badge}</div>
                <div className="font-sans text-base opacity-70 mt-1">{b}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
