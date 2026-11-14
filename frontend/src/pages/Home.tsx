import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, EdgeText, Label, SourceBadge, TextRing } from '../components/ui'
import { Actions, CheckIns, Clock, Privacy, ThreeDates, TooLate, Transparency, Views } from './home/Pitch'
import { Tilt, WordsUp } from './home/reveal'
import { ChapterRail, Ecg, Impact, Transition } from './home/Story'
import { Radar } from './home/Radar'
import FinlandCanvas, { type Hover } from './home/FinlandCanvas'
import { pct, spreadContrast } from './county/model'

/** Hero stat: breast cancer found after spread, highest vs lowest county (Cancer Registry). */
const BREAST = spreadContrast('breast')

const CARDS = [
  { to: '/patient', tone: 'mustard' as const, a: 'For the', b: 'patient', k: '01', tilt: -2 },
  { to: '/hospital', tone: 'terra' as const, a: 'For the', b: 'hospital', k: '02', tilt: 1.5 },
  { to: '/county', tone: 'stone' as const, a: 'For the', b: 'county', k: '03', tilt: 3 },
]

function useCountUp(target: number, ms = 1800, delay = 600) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now() + delay
    const step = (now: number) => {
      const u = Math.min(1, Math.max(0, (now - t0) / ms))
      setV(Math.round(target * (1 - Math.pow(1 - u, 3))))
      if (u < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, delay])
  return v
}

const WORDS = ['on time.', 'ajoissa.', 'i tid.']

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2600); return () => clearInterval(id) }, [])
  return (
    <span className="relative inline-block align-top py-[0.18em] -my-[0.18em] overflow-hidden whitespace-nowrap">
      <span key={i} className="block italic text-terra hero-word">{WORDS[i]}</span>
    </span>
  )
}

export default function Home() {
  const [hover, setHover] = useState<Hover>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [scroll, setScroll] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const { worst, best } = BREAST
  const hi = useCountUp(Math.round(worst.v * 100))
  const lo = useCountUp(Math.round(best.v * 100), 1800, 900)

  useEffect(() => {
    const on = () => setScroll(Math.min(1, scrollY / innerHeight))
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])

  return (
    <div className="relative overflow-x-clip">
      <section className="relative h-[100svh] overflow-hidden origin-top"
        style={{ transform: `scale(${1 - scroll * 0.05})`, borderRadius: `0 0 ${scroll * 48}px ${scroll * 48}px` }}>
        <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 lg:px-12 py-5 lg:py-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 border border-current rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
            </div>
            <span className="font-serif text-2xl italic">Ajoissa</span>
          </Link>
          <nav className="flex gap-5 lg:gap-10">
            {CARDS.map((c) => (
              <Link key={c.to} to={c.to} className="font-type uppercase text-xs lg:text-xs tracking-widest opacity-60 hover:opacity-100 hover:text-terra transition">{c.b}</Link>
            ))}
          </nav>
        </header>

        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] h-full">
          {/* copy */}
          <div className="relative z-10 flex flex-col justify-center px-5 lg:pl-16 xl:pl-24 pt-20 lg:pt-24 pb-20 lg:pb-20"
            style={{ transform: `translateY(${scroll * -60}px)`, opacity: 1 - scroll * 1.2 }}>
            <h1 className="font-serif font-light leading-[0.9] text-[min(14vw,11svh)] lg:text-[min(6vw,12svh)] tracking-tight">
              <span className="block hero-in" style={{ animationDelay: '.1s' }}>Every</span>
              <span className="block hero-in pl-[0.6em]" style={{ animationDelay: '.2s' }}>cancer,</span>
              <span className="block hero-in" style={{ animationDelay: '.3s' }}>found <RotatingWord /></span>
            </h1>

            <div className="mt-8 lg:mt-[5svh] hero-in" style={{ animationDelay: '.5s' }}>
              <Label>Breast cancers found after spreading</Label>
              <div className="mt-3 flex items-end gap-5 lg:gap-7">
                <div>
                  <div className="font-serif text-5xl lg:text-7xl leading-none lining-nums tabular-nums text-terra">{hi}<span className="text-3xl">%</span></div>
                  <div className="mt-2 font-serif italic text-lg lg:text-xl">{worst.c.name}</div>
                </div>
                <span className="pb-9 lg:pb-10 font-serif italic text-2xl opacity-50">vs</span>
                <div>
                  <div className="font-serif text-5xl lg:text-7xl leading-none lining-nums tabular-nums">{lo}<span className="text-3xl">%</span></div>
                  <div className="mt-2 font-serif italic text-lg lg:text-xl flex items-center gap-2">{best.c.name}
                    <SourceBadge id="cancerRegistry" kind="direct" demo={false}
                      how={`Non-localized share of breast cancers with known stage, 2021–25 preliminary statistics. ${worst.c.name} ${pct(worst.v)} (95% range ${pct(worst.lo)}–${pct(worst.hi)}; stage unknown for ${pct(worst.unknown)}, close to half). ${best.c.name} ${pct(best.v)} (${pct(best.lo)}–${pct(best.hi)}; unknown ${pct(best.unknown)}). Finland ${pct(BREAST.nat)}.`} />
                  </div>
                </div>
              </div>
              <p className="mt-5 max-w-md font-sans text-base lg:text-lg leading-snug opacity-75">Ajoissa shows each county where people are lost, and what to do next.</p>
            </div>

            <div className="mt-8 lg:mt-[4svh] flex flex-wrap gap-3 hero-in" style={{ animationDelay: '.65s' }}>
              <Link to="/patient" className="group inline-flex items-center gap-3 bg-ink text-paper rounded-full pl-6 pr-2 py-2 font-type uppercase text-xs tracking-widest hover:bg-terra transition-colors">
                Start
                <span className="w-9 h-9 rounded-full bg-mustard text-ink flex items-center justify-center group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <a href="#ch-gap" className="inline-flex items-center gap-2 rounded-full border border-ink/30 px-6 py-2 font-type uppercase text-xs tracking-widest hover:border-ink transition">Explore</a>
            </div>
          </div>

          {/* map */}
          {/* on phones the map sits behind the copy as a faint backdrop */}
          <div ref={stage} className="absolute inset-0 opacity-25 pointer-events-none lg:opacity-100 lg:pointer-events-auto lg:relative lg:inset-auto"
            style={{ perspective: '1400px' }}
            onPointerMove={(e) => {
              const r = stage.current!.getBoundingClientRect()
              setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 })
            }}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
            <div className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none hidden lg:block">
              <TextRing size={720} text="ajoissa • on time • i tid • " />
            </div>
            <div className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${1 - scroll * 0.08})`, transformStyle: 'preserve-3d' }}>
              <FinlandCanvas className="absolute inset-0 w-full h-full cursor-none" onHover={setHover} />
            </div>

            {/* lens readout */}
            <div className={`hidden lg:block absolute right-10 top-24 lg:top-28 z-10 pointer-events-none transition-all duration-300 ${hover ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <Card tone="mustard" tilt={2} className="p-4 pl-9 w-56">
                <EdgeText>Lens</EdgeText>
                <div className="font-type text-[13px] tracking-wider">{hover ? `${hover.lat.toFixed(2)}°N  ${hover.lon.toFixed(2)}°E` : '—'}</div>
                <div className="mt-2 font-serif text-3xl leading-none italic">{hover?.hospital ?? '—'}</div>
                <div className="mt-3 tear pt-2 flex justify-between items-baseline">
                  <span className="label !opacity-80">nearest hospital</span>
                  <span className="font-serif text-2xl tabular-nums">{hover?.km ?? 0}<span className="text-sm"> km</span></span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Ecg />
        <a href="#ch-gap" className="absolute left-1/2 -translate-x-1/2 bottom-6 z-10 label hover:!opacity-100 bob" aria-label="Scroll">↓</a>
      </section>

      <ChapterRail />

      {/* 01 · the gap (insight): where it opens, and the wait nobody counts */}
      <Transition chapter="ch-gap" text="Where you live in Finland changes how early your cancer is found." hot={5} />
      <TooLate />
      <Transition text="And between the first symptom and the first treatment, time goes missing." hot={3} />
      <Clock />

      {/* 02 · what we built (execution): one record, three views */}
      <Transition chapter="ch-built" text="So we built one tool that follows a person from first symptom to first treatment." hot={6} />
      <Radar />
      <Views />
      <CheckIns />
      <Privacy />

      {/* 03 · what to do (actionability) */}
      <Transition chapter="ch-do" text="Every gap it finds comes with a step to take on Monday." hot={4} />
      <ThreeDates />
      <Actions />

      {/* 04 · the impact */}
      <Transition chapter="ch-impact" text="What happens if every county catches up with the best?" hot={5} />
      <Impact />

      {/* 05 · how we know (data quality and transparency) */}
      <Transition chapter="ch-know" text="Every number shows where it came from, and what it cannot tell." hot={4} />
      <Transparency />

      <section id="doors" className="relative px-5 lg:px-12 py-24 lg:py-32 flex flex-col items-center">
        <Label>Now try it live</Label>
        <h2 className="mt-5 font-serif font-light text-6xl lg:text-8xl leading-[0.95] text-center">
          <WordsUp text="Choose" /><br /><WordsUp text="your door." className="italic" delay={150} />
        </h2>
        <p className="mt-8 mb-16 lg:mb-20 max-w-xl text-center font-sans text-base lg:text-lg leading-relaxed opacity-75">
          Everything in this story runs in the demo. Pick who you are: log a symptom as a patient, find overdue patients as a hospital, or open a county's brief.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 w-full max-w-5xl">
          {CARDS.map((c) => (
            <Link key={c.to} to={c.to} className="block">
              <Tilt max={10}><Card tone={c.tone} tilt={c.tilt} className="h-[360px] lg:h-[460px] p-8 pl-12 flex flex-col hover:!rotate-0 hover:-translate-y-2">
                <EdgeText>Ajoissa · {c.k}</EdgeText>
                <Label>{c.k}</Label>
                <div className="mt-auto">
                  <span className="font-serif text-5xl leading-none block">{c.a}</span>
                  <span className="font-serif text-5xl leading-none italic block pl-4">{c.b}</span>
                </div>
                <div className="tear mt-8 pt-3 flex justify-between items-center">
                  <span className="font-type text-xs uppercase tracking-widest">Open</span>
                  <span>→</span>
                </div>
              </Card></Tilt>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
