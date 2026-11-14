import { useMemo, type ReactNode } from 'react'
import { Card, EdgeText, Label, SourceBadge, cx } from '../../components/ui'
import { useScrollProgress } from './reveal'
import { tr } from '../patient/i18n'

/* ───────────── detection radar (sticky, scroll-driven) ─────────────
   01 a person answers a few questions → 02 the sweep picks out high risk →
   03 they get a clear next step → 04 zoom out to the county funnel. */

const PHASES: { a: string; b: string; lede: ReactNode }[] = [
  {
    a: 'A few questions.', b: 'Typed in by you.',
    lede: <>It starts with the patient: a short self-check in the app. Age, smoking, alcohol, weight, family history and any symptoms from the diary. The person types these in; nothing is pulled from a register.</>,
  },
  {
    a: 'The radar', b: 'picks out risk.',
    lede: <>The answers are weighed against published risk data. Lung risk comes from a published lung-risk model <SourceBadge id="plco" kind="estimate" demo={false} how="PLCOm2012 (Tammemägi et al. 2013), applied to the answers the person typed in. Built on US trial data; not validated in Finland." />. Bowel, breast and cervical combine Cancer Registry rates with published risk ratios <SourceBadge id="ourModel" kind="estimate" demo={false} how={tr('en', 'how.estimate')} />.</>,
  },
  {
    a: 'A clear', b: 'next step.',
    lede: <>The person sees what to do next: a screening, or a talk with a doctor. A clinician sees the details only if the person chooses to share them.</>,
  },
  {
    a: 'Then zoom out', b: 'to the county.',
    lede: <>The same engine follows each county from people at risk, to screening, to stage at diagnosis, to survival, and marks the step where it loses the most people.</>,
  },
]

/* deterministic crowd of people on the radar */
function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
type Dot = { x: number; y: number; a: number; hi: boolean }
function buildDots(): { dots: Dot[]; you: number } {
  const r = seeded(7)
  const n = 128
  const dots: Dot[] = Array.from({ length: n }, (_, i) => {
    const rad = 84 * Math.sqrt((i + 0.6) / n) + (r() - 0.5) * 4
    const th = i * 2.39996 + (r() - 0.5) * 0.25
    const x = 100 + rad * Math.cos(th), y = 100 + rad * Math.sin(th)
    const a = ((Math.atan2(x - 100, -(y - 100)) * 180) / Math.PI + 360) % 360
    return { x, y, a, hi: r() < 0.11 }
  })
  let you = dots.findIndex((d, i) => i > 40 && d.hi && Math.hypot(d.x - 100, d.y - 100) > 35 && d.a > 60 && d.a < 160)
  if (you < 0) { you = 60; dots[60].hi = true }
  return { dots, you }
}

const pt = (deg: number, R: number) => {
  const t = (deg * Math.PI) / 180
  return `${(100 + R * Math.sin(t)).toFixed(2)} ${(100 - R * Math.cos(t)).toFixed(2)}`
}
const wedge = (a1: number, a2: number, R = 92) => `M100 100 L${pt(a1, R)} A${R} ${R} 0 0 1 ${pt(a2, R)} Z`

const QUESTIONS: [string, string][] = [
  ['Age', '63'], ['Smoked', '30 years'], ['A day', '20 cigarettes'], ['Family history', 'no'], ['Diary', 'cough, 3 weeks'],
]

/* illustrative shape only; the county tab computes each step from Sotkanet, Statistics Finland and Cancer Registry data */
const FUNNEL = [
  { k: 'At risk', v: 100, drop: '' },
  { k: 'Screened', v: 71, drop: '−29 not screened' },
  { k: 'Found late', v: 38, drop: '−33 found too late', leak: true },
  { k: 'Survival', v: 31, drop: '−7 deaths' },
]


export function Radar() {
  const [ref, p] = useScrollProgress<HTMLElement>()
  const { dots, you } = useMemo(buildDots, [])
  const seg = Math.min(3.999, p * 4)
  const phase = Math.floor(seg)
  const t = seg - phase
  const sweep = phase < 1 ? 0 : phase === 1 ? Math.min(360, t * 1.15 * 360) : 360
  const asked = phase === 0 ? Math.min(QUESTIONS.length, Math.floor(t * 1.4 * (QUESTIONS.length + 1))) : QUESTIONS.length
  const zoom = phase === 2
  const radarOn = phase <= 2
  const Y = dots[you]
  const lit = dots.filter((d) => d.hi && d.a <= sweep).length

  return (
    <section ref={ref} className="relative h-[370vh]" aria-label="Detection radar">
      <div className="sticky top-0 h-[100svh] overflow-hidden px-5 lg:px-24 flex flex-col justify-center gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 pt-6 pb-14 lg:py-0">
        {/* copy */}
        <div className="relative min-w-0">
          <div className="flex items-center gap-4">
            <Label>The detection radar</Label>
            <span className="h-px w-10 bg-ink/40" />
            <span className="font-type text-[13px] tracking-widest tabular-nums">{String(phase + 1).padStart(2, '0')} / 04</span>
          </div>
          <div className="mt-4 grid text-[10.5vw] sm:text-6xl xl:text-7xl font-serif font-light leading-[0.95]">
            {PHASES.map((ph, i) => (
              <h2 key={i} aria-hidden={i !== phase}
                className={cx('[grid-area:1/1] transition-all duration-700', i === phase ? 'opacity-100 translate-y-0' : i < phase ? 'opacity-0 -translate-y-8 blur-sm' : 'opacity-0 translate-y-8 blur-sm')}>
                {ph.a}<br /><span className={cx('italic pl-[0.6em]', i === 2 ? 'text-terra' : undefined)}>{ph.b}</span>
              </h2>
            ))}
          </div>
          <div className="mt-5 lg:mt-6 grid max-w-xl font-sans text-[15px] lg:text-lg leading-relaxed">
            {PHASES.map((ph, i) => (
              <p key={i} aria-hidden={i !== phase}
                className={cx('[grid-area:1/1] transition-opacity duration-700', i === phase ? 'opacity-75' : 'opacity-0 pointer-events-none')}>
                {ph.lede}
              </p>
            ))}
          </div>
          <div className="hidden lg:flex mt-10 gap-2">
            {PHASES.map((_, i) => (
              <span key={i} className={cx('h-1 rounded-full transition-all duration-500', i === phase ? 'w-10 bg-terra' : i < phase ? 'w-4 bg-ink/60' : 'w-4 bg-ink/15')} />
            ))}
          </div>
        </div>

        {/* stage */}
        <div className="relative mx-auto shrink-0 aspect-square w-[min(88vw,46svh)] lg:w-[min(40vw,74svh)]">
          {/* radar */}
          <div className={cx('absolute inset-0 transition-all duration-700', radarOn ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.35] pointer-events-none')}>
            <div className="absolute inset-0 rounded-full overflow-hidden">
            <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
              <g style={{ transform: zoom ? `translate(100px,100px) scale(2.2) translate(${-Y.x}px,${-Y.y}px)` : 'none', transformOrigin: '0 0', transition: 'transform 1.1s cubic-bezier(.6,0,.2,1)' }}>
                {[30, 60, 90].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1F1F1F" strokeOpacity=".14" strokeDasharray={r === 90 ? undefined : '1 3'} />)}
                <line x1="100" y1="6" x2="100" y2="194" stroke="#1F1F1F" strokeOpacity=".08" />
                <line x1="6" y1="100" x2="194" y2="100" stroke="#1F1F1F" strokeOpacity=".08" />
                {/* sweep */}
                <g style={{ opacity: phase === 1 ? 1 : 0, transition: 'opacity .5s' }}>
                  {Array.from({ length: 8 }, (_, k) => (
                    <path key={k} d={wedge(sweep - (k + 1) * 6, sweep - k * 6)} fill="#C65D3B" fillOpacity={0.2 * (1 - k / 8)} />
                  ))}
                  <line x1="100" y1="100" x2={pt(sweep, 92).split(' ')[0]} y2={pt(sweep, 92).split(' ')[1]} stroke="#C65D3B" strokeWidth="1.2" />
                </g>
                {/* people */}
                {dots.map((d, i) => {
                  const on = d.hi && d.a <= sweep
                  const isYou = i === you
                  const fade = zoom && !isYou ? 0.12 : 1
                  return (
                    <g key={i} style={{ opacity: fade, transition: 'opacity .7s' }}>
                      {on && <circle cx={d.x} cy={d.y} r={isYou ? 7 : 5} fill="none" stroke="#C65D3B" strokeOpacity=".5" strokeWidth=".6" />}
                      <circle cx={d.x} cy={d.y} r={on ? 2.6 : 1.9}
                        fill={on ? '#C65D3B' : '#1F1F1F'} fillOpacity={on ? 1 : phase === 0 ? 0.28 : 0.2}
                        style={{ transition: 'r .3s, fill .3s' }} />
                      {isYou && (
                        <circle cx={d.x} cy={d.y} r="4.4" fill="none" stroke="#FFC233" strokeWidth="1.4" />
                      )}
                    </g>
                  )
                })}
                <circle cx="100" cy="100" r="2.5" fill="#FFC233" stroke="#1F1F1F" strokeWidth=".6" style={{ opacity: zoom ? 0 : 1 }} />
              </g>
            </svg>
            </div>
            <div className={cx('absolute inset-0 rounded-full border border-ink/25 pointer-events-none transition-opacity duration-700', zoom ? 'opacity-100' : 'opacity-0')} />

            {/* readout while sweeping */}
            <div className={cx('absolute -top-10 right-0 lg:-top-2 lg:-right-4 text-right transition-all duration-500', phase === 1 ? 'opacity-100' : 'opacity-0 -translate-y-2')}>
              <div className="font-type text-xs uppercase tracking-widest opacity-60">high risk</div>
              <div className="font-serif text-5xl lg:text-6xl leading-none tabular-nums lining-nums text-terra">{lit}</div>
              <div className="font-type text-xs uppercase tracking-widest opacity-60">of {dots.length} people</div>
            </div>

            {/* the questions */}
            <div className={cx('absolute left-0 bottom-0 lg:-left-10 lg:bottom-6 transition-all duration-700', phase === 0 ? 'opacity-100' : 'opacity-0 -translate-x-10 pointer-events-none')}>
              <Card tone="paper" tilt={-3} className="p-4 pl-9 w-[min(240px,64vw)] lg:w-64 border border-ink/10 bg-paper/95">
                <EdgeText>Your answers</EdgeText>
                <div className="space-y-1.5">
                  {QUESTIONS.map(([q, a], i) => (
                    <div key={q} className={cx('flex items-baseline justify-between gap-3 border-b border-dashed border-ink/15 pb-1 transition-all duration-500', i < asked ? 'opacity-100' : 'opacity-0 translate-y-1')}>
                      <span className="font-type text-xs uppercase tracking-widest opacity-60">{q}</span>
                      <span className="font-serif text-lg italic leading-none">{a}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* the next step */}
            <div className={cx('absolute inset-x-0 bottom-0 flex justify-center transition-all duration-700', zoom ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none')}
              style={{ transitionDelay: zoom ? '450ms' : '0ms' }}>
              <Card tone="mustard" tilt={-2} className="p-4 pl-9 lg:p-5 lg:pl-10 w-[min(300px,84vw)] lg:w-80">
                <EdgeText>Next step</EdgeText>
                <div className="font-type text-xs uppercase tracking-widest opacity-70">What you see</div>
                <p className="mt-1.5 font-serif text-[22px] lg:text-2xl leading-[1.1]">Lung screening would be worth <span className="italic">discussing with a doctor.</span></p>
              </Card>
            </div>
          </div>

          {/* county funnel */}
          <div className={cx('absolute inset-0 flex items-center transition-all duration-700', phase === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.6] pointer-events-none')}>
            <Card tone="paper" tilt={1.5} className="w-full p-5 pl-10 lg:p-7 lg:pl-12 border border-ink/10">
              <EdgeText>County</EdgeText>
              <div className="flex items-center justify-between gap-2">
                <span className="font-type text-xs uppercase tracking-widest opacity-70">Out of 100 at risk · example county</span>
                <SourceBadge id="illustration" kind="example" how="Made-up numbers that show the shape of the funnel. The county tab computes each step from real data." />
              </div>
              <div className="mt-4 space-y-3 lg:space-y-4">
                {FUNNEL.map((f, i) => (
                  <div key={f.k}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cx('font-serif text-xl lg:text-2xl leading-none', f.leak && 'italic text-terra')}>{f.k}</span>
                      <span className="flex items-center gap-2">
                        {f.drop && <span className={cx('font-type text-xs uppercase tracking-wider', f.leak ? 'text-terra' : 'opacity-60')}>{f.drop}</span>}
                      </span>
                    </div>
                    <div className="mt-1.5 h-5 lg:h-6 rounded-sm bg-ink/[0.06] overflow-hidden flex">
                      <div className={cx('h-full origin-left transition-transform duration-1000 ease-out', f.leak ? 'bg-terra' : 'bg-ink/85')}
                        style={{ width: `${f.v}%`, transform: `scaleX(${phase >= 3 ? 1 : 0})`, transitionDelay: `${300 + i * 180}ms` }} />
                      {i > 0 && (
                        <div className={'h-full transition-opacity duration-700'}
                          style={{ width: `${FUNNEL[i - 1].v - f.v}%`, opacity: phase >= 3 ? 1 : 0, transitionDelay: `${700 + i * 180}ms`,
                            background: f.leak ? 'repeating-linear-gradient(135deg, rgba(198,93,59,.35) 0 4px, transparent 4px 8px)' : 'repeating-linear-gradient(135deg, rgba(31,31,31,.12) 0 4px, transparent 4px 8px)' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className={cx('mt-4 flex items-center gap-2 rv rv-up', phase === 3 && 'in')} style={{ transitionDelay: '1300ms' }}>
                <span className="w-2 h-2 rounded-full bg-terra motion-safe:animate-ping" />
                <span className="font-type text-xs uppercase tracking-widest">Most people lost here → action brief</span>
              </div>
            </Card>
          </div>

        </div>

        {/* progress */}
        <div className="absolute bottom-6 lg:bottom-8 left-5 lg:left-24 right-5 lg:right-24 h-px bg-ink/10">
          <div className="h-full bg-terra" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    </section>
  )
}
