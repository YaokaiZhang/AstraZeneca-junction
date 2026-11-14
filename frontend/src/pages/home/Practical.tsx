// Pitch sections that show the tool is practical: lung risk in a real visit.
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
