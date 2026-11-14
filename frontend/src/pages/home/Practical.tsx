// Pitch sections that show the tool is practical: lung risk in a real visit, and how it plugs in.
import { Card, Label, SourceBadge } from '../../components/ui'
import { H2, Lede, PAGE } from './Pitch'
import { Reveal, WordsUp } from './reveal'

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
