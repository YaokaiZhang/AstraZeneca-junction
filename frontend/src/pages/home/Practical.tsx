// Pitch sections that show the tool is practical: the missing-stage model, lung risk in a real visit, and how it plugs in.
import { useState } from 'react'
import { Card, Label, SourceBadge, cx } from '../../components/ui'
import { STAGE_MODEL_CANCERS, cancerLabel, fmt, pct, stageModel, type StageModelCancer } from '../county/model'
import { H2, Lede, PAGE } from './Pitch'
import { Reveal, WordsUp, useInView } from './reveal'

/* ───────────── the data gap, modelled ───────────── */
const W = 560, HGT = 390, PAD = { l: 44, r: 16, t: 34, b: 40 }

function Scatter({ k, on }: { k: StageModelCancer; on: boolean }) {
  const m = stageModel(k)
  const xs = m.points.map((p) => p.missing), ys = m.points.map((p) => p.late)
  const x0 = Math.floor(Math.min(...xs) * 10) / 10, x1 = Math.ceil(Math.max(...xs) * 10) / 10
  const y0 = Math.floor(Math.min(...ys) * 10) / 10, y1 = Math.min(1, Math.ceil(Math.max(...ys) * 10) / 10)
  const X = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r)
  const Y = (v: number) => HGT - PAD.b - ((v - y0) / (y1 - y0)) * (HGT - PAD.t - PAD.b)
  const top = [...m.points].sort((a, b) => b.resid - a.resid).slice(0, 2).map((p) => p.c.id)
  const ticks = (a: number, b: number) => Array.from({ length: Math.round((b - a) * 10) + 1 }, (_, i) => a + i / 10)
  const yt = ticks(y0, y1).filter((_, i, all) => all.length <= 6 || i % 2 === 0)
  return (
    <svg viewBox={`0 0 ${W} ${HGT}`} className="w-full h-auto" role="img"
      aria-label={`${cancerLabel(k)} cancer: share found after spread against share with stage missing, 22 counties`}>
      {yt.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={Y(v)} y2={Y(v)} stroke="#1F1F1F" strokeOpacity=".08" />
          <text x={PAD.l - 8} y={Y(v) + 4} textAnchor="end" className="font-type" fontSize="12" fill="#1F1F1F" fillOpacity=".55">{Math.round(v * 100)}%</text>
        </g>
      ))}
      {ticks(x0, x1).map((v) => (
        <text key={v} x={X(v)} y={HGT - PAD.b + 18} textAnchor="middle" className="font-type" fontSize="12" fill="#1F1F1F" fillOpacity=".55">{Math.round(v * 100)}%</text>
      ))}
      <text x={W - PAD.r} y={HGT - 4} textAnchor="end" className="font-type" fontSize="11" letterSpacing="1.5" fill="#1F1F1F" fillOpacity=".7">STAGE MISSING →</text>
      <text x={4} y={12} className="font-type" fontSize="11" letterSpacing="1.5" fill="#1F1F1F" fillOpacity=".7">↑ FOUND AFTER SPREAD</text>
      {/* fitted line */}
      <line x1={X(x0)} y1={Y(m.a + m.b * x0)} x2={X(x1)} y2={Y(m.a + m.b * x1)} stroke="#1F1F1F" strokeWidth="2" strokeDasharray="6 5"
        pathLength={100} style={{ strokeDashoffset: on ? 0 : 100, transition: 'stroke-dashoffset 1.2s ease-out 600ms' }} />
      {m.points.map((p, i) => {
        const hot = p.resid > 0.03
        const r = Math.min(13, 4 + Math.sqrt(p.w) / 4)
        return (
          <g key={p.c.id} style={{ opacity: on ? 1 : 0, transition: `opacity .5s ease-out ${200 + i * 35}ms` }}>
            {hot && <line x1={X(p.missing)} x2={X(p.missing)} y1={Y(p.fit)} y2={Y(p.late)} stroke="#C65D3B" strokeWidth="2" />}
            <circle cx={X(p.missing)} cy={Y(p.late)} r={r} fill={hot ? '#C65D3B' : '#1F1F1F'} fillOpacity={hot ? 0.95 : 0.55} stroke="#F4F1EA" strokeWidth="1.5">
              <title>{`${p.c.name}: ${pct(p.late)} found after spread, stage missing for ${pct(p.missing)}`}</title>
            </circle>
            {top.includes(p.c.id) && (
              <text x={X(p.missing) + (p.missing > (x0 + x1) / 2 ? -r - 6 : r + 6)} y={Y(p.late) + 4} textAnchor={p.missing > (x0 + x1) / 2 ? 'end' : 'start'}
                className="font-serif italic" fontSize="17" fill="#C65D3B">{p.c.name}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const STAGE_HOW = (k: StageModelCancer) => {
  const m = stageModel(k)
  return `Weighted least squares over the 22 counties: recorded share found after spread (of cases with known stage) = ${fmt(m.a * 100, 1)}% + ${fmt(m.b, 2)} × share with stage missing. Weights: cases with known stage, 2021–25. Explains ${pct(m.r2)} of the weighted variance. Tested by predicting each county from the other 21: average error ${fmt(m.maeModel * 100, 1)} points vs ${fmt(m.maeBase * 100, 1)} for the national average. Red = more than 3 points above the line: found late beyond what missing records explain. A model of county totals, so it cannot say which cases are late; the Registry could run the same idea on individual records.`
}

export function StageGap() {
  const [ref, on] = useInView<HTMLDivElement>(0.3)
  const [k, setK] = useState<StageModelCancer>('breast')
  const m = stageModel(k)
  const top = [...m.points].sort((a, b) => b.resid - a.resid)[0]
  return (
    <section className={PAGE + ' overflow-hidden'} aria-label="Missing data, modelled">
      <div ref={ref} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-16 items-center">
        <div className="min-w-0">
          <Label>The data gap</Label>
          <h2 className={'mt-4 ' + H2}>
            <WordsUp text="Missing data," /><br /><WordsUp text="modelled." className="italic text-terra" delay={180} />
          </h2>
          <Lede className="mt-6 lg:mt-[3svh]">
            Where stage goes unrecorded, more cancers look late. Our model learns that pattern across all 22 counties, then separates poor records from truly late diagnosis.
          </Lede>
          <div className="mt-8 lg:mt-[4svh] grid grid-cols-3 gap-4 lg:gap-6 border-t border-ink/15 pt-6">
            <div>
              <p className="font-serif text-4xl sm:text-5xl lg:text-[min(3.75rem,7svh)] leading-none tabular-nums lining-nums">{pct(m.r2)}</p>
              <p className="mt-2 font-sans text-sm leading-snug opacity-75">of the difference between counties tracks missing records</p>
            </div>
            <div>
              <p className="font-serif text-4xl sm:text-5xl lg:text-[min(3.75rem,7svh)] leading-none tabular-nums lining-nums whitespace-nowrap">
                {fmt(m.maeBase * 100)}<span className="text-ink/40">→</span>{fmt(m.maeModel * 100)}
              </p>
              <p className="mt-2 font-sans text-sm leading-snug opacity-75">points of error, each county predicted from the other 21</p>
            </div>
            <div>
              <p className="font-serif text-4xl sm:text-5xl lg:text-[min(3.75rem,7svh)] leading-none tabular-nums lining-nums text-terra">+{fmt(top.resid * 100)}</p>
              <p className="mt-2 font-sans text-sm leading-snug opacity-75">points late beyond the records in <span className="italic">{top.c.name}</span></p>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 font-type text-sm uppercase tracking-wider opacity-70">
            Tested, not assumed <SourceBadge id="ourModel" kind="estimate" demo={false} how={STAGE_HOW(k)} />
            <SourceBadge id="cancerRegistry" kind="direct" demo={false} />
          </p>
        </div>

        <Reveal fx="up" delay={200} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex gap-2" role="tablist" aria-label="Cancer">
              {STAGE_MODEL_CANCERS.map((c) => (
                <button key={c} type="button" role="tab" aria-selected={c === k} onClick={() => setK(c)}
                  className={cx('font-type text-xs uppercase tracking-widest rounded-full px-4 py-2 border transition-colors', c === k ? 'bg-ink text-paper border-ink' : 'border-ink/30 hover:border-ink')}>
                  {cancerLabel(c)}
                </button>
              ))}
            </div>
            <span className="font-type text-xs uppercase tracking-widest opacity-60">one dot = one county</span>
          </div>
          <div className="lg:max-h-[58svh] lg:aspect-[56/38] lg:mx-auto"><Scatter key={k} k={k} on={on} /></div>
          <p className="mt-2 font-type text-xs uppercase tracking-widest opacity-60 flex flex-wrap gap-x-6 gap-y-1">
            <span><span className="inline-block w-6 border-t-2 border-dashed border-ink align-middle mr-2" />what missing records predict</span>
            <span className="text-terra"><span className="inline-block w-2.5 h-2.5 rounded-full bg-terra align-middle mr-2" />late beyond the records</span>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────── lung risk, in a real visit ───────────── */
const IN_RECORD = ['Age', 'Height and weight', 'COPD diagnosis', 'Earlier cancer', 'Smoker or not']
const ASKED = ['Cigarettes a day', 'Years smoked', 'Years since quitting', 'Lung cancer in family', 'Education']

export function RiskInPractice() {
  return (
    <section className={PAGE + ' overflow-hidden'} aria-label="Risk in practice">
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-20 items-center">
        <div className="min-w-0">
          <Label>Lung risk · PLCOm2012</Label>
          <h2 className={'mt-4 ' + H2}>
            <WordsUp text="Five questions." /><br /><WordsUp text="One next step." className="italic text-terra" delay={180} />
          </h2>
          <Lede className="mt-6 lg:mt-[3svh]">
            A published, validated model. Half of what it needs is already in the health record, so a visit adds about two minutes.
          </Lede>
          <Reveal fx="up" delay={300} className="mt-8 lg:mt-[4svh] grid grid-cols-2 gap-4">
            <Card tone="stone" className="p-5">
              <p className="font-type text-xs uppercase tracking-widest opacity-70">Usually in the record</p>
              <ul className="mt-3 space-y-1.5">
                {IN_RECORD.map((t) => <li key={t} className="font-serif text-lg lg:text-xl leading-tight flex gap-2"><span className="text-moss">✓</span>{t}</li>)}
              </ul>
            </Card>
            <Card tone="mustard" className="p-5">
              <p className="font-type text-xs uppercase tracking-widest opacity-80">Asked once</p>
              <ul className="mt-3 space-y-1.5">
                {ASKED.map((t) => <li key={t} className="font-serif text-lg lg:text-xl leading-tight flex gap-2"><span>?</span>{t}</li>)}
              </ul>
            </Card>
          </Reveal>
        </div>

        <div className="min-w-0">
          <Reveal fx="up" delay={150}>
            <div className="flex items-end gap-4">
              <p className="font-serif text-7xl lg:text-[min(7rem,12svh)] leading-none tabular-nums lining-nums text-terra">83%</p>
              <p className="font-serif text-4xl lg:text-[min(3rem,5.5svh)] leading-none tabular-nums lining-nums opacity-40 pb-1">vs 71%</p>
            </div>
            <p className="mt-2 font-sans text-base leading-snug opacity-75 flex items-baseline gap-2 max-w-md">
              of later lung cancers caught, against the usual age-and-pack-years rule, screening the same number of people
              <SourceBadge id="plcoValidation" kind="direct" demo={false} />
            </p>
          </Reveal>
          <Reveal fx="up" delay={300} className="mt-8 lg:mt-[5svh] border-t border-ink/15 pt-6 flex items-baseline gap-5">
            <p className="font-serif text-5xl lg:text-6xl leading-none italic">NHS</p>
            <p className="font-sans text-base leading-snug opacity-75 max-w-xs">England already uses this model and cut-off to invite people to lung CT</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────── how it plugs in ───────────── */
const PARTS: { part: string; needs: string; from: string; setup: string; badge: React.ReactNode }[] = [
  { part: 'Off-track list', needs: 'Three dates per patient', from: 'Hospital record: referral, diagnosis, first treatment', setup: 'One nightly report', badge: <SourceBadge id="fhir" kind="direct" demo={false} /> },
  { part: 'Lung risk check', needs: 'Ten answers', from: 'Five in the record, five asked', setup: 'Runs in the browser', badge: <SourceBadge id="plcoValidation" kind="direct" demo={false} /> },
  { part: 'Missing-stage model', needs: 'Stage counts by county', from: 'Cancer Registry open statistics', setup: 'Refit once a year', badge: <SourceBadge id="cancerRegistry" kind="direct" demo={false} /> },
  { part: 'County radar', needs: 'Turnout, risk factors, waiting lists', from: 'THL Sotkanet and Statistics Finland open APIs', setup: 'Pulled by a script', badge: <SourceBadge id="sotkanetScreening" kind="direct" demo={false} /> },
]
const PILOT = [['Where', 'One county'], ['What', 'Bowel cancer pathway'], ['How long', '3 months'], ['Success', 'Share treated within 6 weeks, finally counted']]

export function PlugsIn() {
  return (
    <section className={PAGE} aria-label="How it plugs in">
      <h2 className={H2}>
        <WordsUp text="No new system." /><br /><WordsUp text="Just data that exists." className="italic text-terra" delay={180} />
      </h2>
      <Lede className="mt-6 lg:mt-[3svh]">Every part reads something Finland already records. Nothing needs new hardware or a new registry.</Lede>
      <Reveal fx="up" delay={250} className="mt-8 lg:mt-[4svh]">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-6 pb-3 border-b border-ink font-type text-xs uppercase tracking-widest opacity-60">
          <span>Part</span><span>Needs</span><span>Already in</span><span>To switch on</span>
        </div>
        <ul>
          {PARTS.map((p) => (
            <li key={p.part} className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-x-6 gap-y-1 py-4 lg:py-[1.6svh] border-b border-ink/15 items-baseline">
              <span className="font-serif text-2xl lg:text-3xl leading-tight">{p.part}</span>
              <span className="font-sans text-base opacity-80">{p.needs}</span>
              <span className="font-sans text-base opacity-80 flex items-baseline gap-2">{p.from} {p.badge}</span>
              <span className="font-type text-sm uppercase tracking-wider text-moss">✓ {p.setup}</span>
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal fx="up" delay={400} className="mt-8 lg:mt-[4svh]">
        <Card tone="ink" className="p-5 lg:py-[2svh] lg:px-6 grid sm:grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-4 lg:gap-8 items-center">
          <span className="font-serif italic text-3xl text-mustard leading-none">First pilot</span>
          {PILOT.map(([a, b]) => (
            <div key={a}>
              <p className="font-type text-xs uppercase tracking-widest opacity-60">{a}</p>
              <p className="mt-1 font-serif text-xl leading-tight">{b}</p>
            </div>
          ))}
        </Card>
      </Reveal>
    </section>
  )
}
