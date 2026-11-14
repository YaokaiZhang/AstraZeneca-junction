import React, { useEffect, useRef, useState } from 'react'
import { Card, EdgeText, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { CANCERS, COUNTIES } from '../../data/counties'
import { Reveal, WordsUp, useCount, useInView, useScrollProgress } from './reveal'

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
const STEPS = [
  { id: 'GP', d: 0 }, { id: 'Referral', d: 7 }, { id: 'Scan', d: 14 },
  { id: 'Diagnosis', d: 14 }, { id: 'Team meeting', d: 7 }, { id: 'Treatment', d: 14 },
]
const CUM = STEPS.reduce<number[]>((a, s) => [...a, (a[a.length - 1] ?? 0) + s.d], [])
const TOTAL = CUM[CUM.length - 1]

function Scramble({ on }: { on: boolean }) {
  const [v, setV] = useState('??')
  useEffect(() => {
    if (!on) { setV('??'); return }
    const id = setInterval(() => setV(String(40 + Math.floor(Math.random() * 160))), 70)
    const stop = setTimeout(() => { clearInterval(id); setV('?') }, 1500)
    return () => { clearInterval(id); clearTimeout(stop) }
  }, [on])
  return <>{v}</>
}

export function Clock() {
  const [ref, p] = useScrollProgress<HTMLElement>()
  const fill = Math.min(1, Math.max(0, (p - 0.05) / 0.45))
  const real = p > 0.58
  const days = Math.round(TOTAL * fill)
  return (
    <section ref={ref} className="relative h-[300vh]">
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
            <span className="tabular-nums lining-nums">{days}</span> days,<br /><span className="italic pl-[0.6em]">on paper.</span>
          </h2>
          <h2 className={cx('absolute inset-0 transition-all duration-700', real ? 'opacity-100' : 'opacity-0 translate-y-8 blur-sm')}>
            The real number?<br /><span className="italic text-terra pl-[0.6em]">Nobody counts it.</span>
          </h2>
        </div>
        <div className="relative mt-6 max-w-xl h-[5.5em] lg:h-[4.5em] font-sans text-base lg:text-lg leading-relaxed">
          <p className={cx('absolute inset-0 transition-opacity duration-700', real ? 'opacity-0' : 'opacity-75')}>
            Finnish guidance sets a target time for each step, from the first GP visit to the start of treatment. Keep scrolling to add them up.
          </p>
          <p className={cx('absolute inset-0 transition-opacity duration-700', real ? 'opacity-75' : 'opacity-0')}>
            But nobody publishes how long patients actually wait between those steps. Ajoissa records the dates, so the real number can finally be counted.
          </p>
        </div>

        <div className="mt-10 lg:mt-14 relative max-w-6xl lg:w-[calc(100%-46vh-4vw)]">
          {/* target track */}
          <div className="flex items-center gap-3 mb-3"><span className="label">Target</span><SourceBadge id="thlTargets" kind="estimate" /></div>
          <div className="relative h-24">
            <div className="absolute left-0 right-0 top-3 h-px bg-ink/20" />
            <div className="absolute left-0 top-3 h-[3px] -mt-px bg-ink origin-left" style={{ width: `${fill * 100}%` }} />
            {STEPS.map((s, i) => {
              const at = CUM[i] / TOTAL
              const lit = fill >= at - 0.001
              return (
                <div key={s.id} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${at * 100}%` }}>
                  <span className={cx('w-6 h-6 rounded-full border-2 border-ink transition-all duration-300', lit ? 'bg-mustard scale-110' : 'bg-paper')} />
                  <span className={cx('mt-3 font-type text-[11px] lg:text-[13px] uppercase tracking-widest whitespace-nowrap transition-opacity', lit ? 'opacity-90' : 'opacity-30', i % 2 === 1 && "max-sm:mt-10")}>{s.id}</span>
                  {i > 0 && <span className={cx('font-serif italic text-lg lg:text-xl transition-opacity', lit ? 'opacity-100' : 'opacity-20')}>+{s.d}</span>}
                </div>
              )
            })}
          </div>

          {/* reality track */}
          <div className={cx('mt-10 transition-all duration-700', real ? 'opacity-100' : 'opacity-0 translate-y-6')}>
            <div className="flex items-center gap-3 mb-3"><span className="label !opacity-90 text-terra">Reality</span><SourceBadge id="waitGap" kind="gap" /></div>
            <div className="relative h-10">
              <div className="absolute left-0 top-3 h-[3px] reality-line" style={{ width: real ? '125%' : '0%' }} />
              <div className="absolute right-0 -top-8 lg:-top-10 font-serif text-6xl lg:text-8xl text-terra tabular-nums lining-nums leading-none"><Scramble on={real} /></div>
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

/* ───────────── 2 · found too late (rings) ───────────── */
function Ring({ label, value, delay }: { label: string; value: number; delay: number }) {
  const [ref, on] = useInView<HTMLDivElement>(0.4)
  const n = useCount(value * 100, on, 1600 + delay)
  const C = 2 * Math.PI * 54
  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-36 h-36 lg:w-48 lg:h-48">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#D1D1C9" strokeWidth="5" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#C65D3B" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={on ? C * (1 - value) : C}
            style={{ transition: `stroke-dashoffset 1.8s cubic-bezier(.2,.7,.2,1) ${delay}ms` }} />
          <circle cx="60" cy="60" r="44" fill="none" stroke="#1F1F1F" strokeOpacity=".15" strokeDasharray="1 4" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-serif text-5xl lg:text-6xl tabular-nums lining-nums">
          {Math.round(n)}<span className="text-2xl">%</span>
        </div>
      </div>
      <div className="mt-4 font-serif italic text-3xl">{label}</div>
    </div>
  )
}

export function TooLate() {
  return (
    <section className="relative px-5 lg:px-24 py-28 lg:py-40">
      <div className="flex items-end justify-between flex-wrap gap-6">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="Found" /><br /><WordsUp text="too late." className="italic text-terra" delay={140} />
        </h2>
        <Reveal fx="blur" delay={300} className="flex items-center gap-2"><Label>Share at advanced stage</Label><SourceBadge id="cancerRegistry" kind="estimate" /></Reveal>
      </div>
      <Lede className="mt-8">
        The share of cancers found only after they have already spread, when they are far harder to treat. Finding them earlier is what changes these numbers.
      </Lede>
      <div className="mt-16 lg:mt-24 grid grid-cols-2 lg:grid-cols-4 gap-y-14">
        {CANCERS.map((c, i) => <Ring key={c.id} label={c.label} value={c.lateShare} delay={i * 150} />)}
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
  { k: '01', who: 'Patient', a: 'Notice it.', b: 'Say it. Chase it.', p: 'Write down symptoms in your own words and find out whether a screening or a doctor visit is worth it: you get a next step, never a score. See how long each step of your care has taken, and if one runs late, Ajoissa drafts a message to the clinic for you. If you want, it checks in on you between visits. In Finnish, Swedish or English.', chips: ['Symptom diary', 'Screening check', 'Pathway clock', 'Check-ins', '3 languages'], mock: <PhoneMock />, to: '/patient' },
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
            <div className="max-w-full overflow-x-auto lg:overflow-visible py-6 px-2">{v.mock}</div>
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
        <Reveal fx="blur" delay={300} className="flex items-center gap-2"><Label>Starter dataset</Label><SourceBadge id="ourModel" kind="estimate" /></Reveal>
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
            <Card tone={i === 1 ? 'mustard' : 'paper'} tilt={[-4, 3, -2][i]} className="p-6 pl-10 border border-ink/10">
              <EdgeText>{String(i + 1).padStart(2, '0')}</EdgeText>
              <div className="label">{a}</div>
              <div className="mt-2 font-type text-4xl lg:text-5xl tracking-tight">{b}</div>
            </Card>
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
export function CheckIns() {
  const [ref, p] = useScrollProgress<HTMLElement>()
  const day = Math.min(CI_DAYS, Math.max(0, ((p - 0.12) / 0.7) * CI_DAYS))
  const ping = day >= 7, two = day >= 14, reply = day >= 16, saved = day >= 18
  return (
    <section ref={ref} className="relative lg:h-[260svh]">
      <div className="lg:sticky top-0 min-h-[100svh] px-5 lg:px-24 py-16 flex flex-col justify-center overflow-hidden">
        <h2 className="font-serif font-light text-6xl lg:text-8xl leading-[0.95]">
          <WordsUp text="We don't wait." /><br /><WordsUp text="We ask." className="italic text-terra" delay={180} />
        </h2>
        <div className="mt-12 lg:mt-16 grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-center">
          <div>
            <div className="flex items-baseline gap-4">
              <span className="font-serif text-7xl lg:text-8xl leading-none tabular-nums lining-nums w-[2.2ch]">{Math.floor(day)}</span>
              <span className="label">days since<br />“cough”</span>
            </div>
            <div className="mt-10 space-y-8">
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
            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3 font-type text-sm uppercase tracking-widest">
              <span className="flex items-center gap-2"><span className="w-7 h-4 rounded-full bg-mustard relative"><span className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-paper" /></span>You switch it on</span>
              <span className="opacity-70">Only what you told us</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative w-[280px] h-[480px] lg:w-[290px] lg:h-[520px] rounded-[2.75rem] bg-ink p-3 shadow-2xl rotate-[3deg]">
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
