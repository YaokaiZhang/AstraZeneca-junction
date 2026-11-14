// Actions tab: the county's concrete next steps for bowel cancer screening.
// Where the chain leaks, the one action to start with, and what it takes. The header's Print button prints the one-page plan.
import { useMemo } from 'react'
import { Label } from '../../components/ui'
import { screeningById } from '../monitor/data'
import { evaluate, type Plan } from '../monitor/model'
import { Recommend, SimpleChain, Verdict, WhatItTakes } from '../monitor/Simple'

const H2 = 'font-serif text-4xl sm:text-5xl'

export function Actions({ countyId, plan, setPlan }: { countyId: string; plan: Plan; setPlan: (p: Plan) => void }) {
  const r = screeningById(countyId)!
  const res = useMemo(() => evaluate(r, plan), [r, plan])
  return (
    <div className="max-w-5xl">
      <Label className="mb-4">Bowel cancer screening · 2024 round</Label>
      <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.15] max-w-4xl"><Verdict r={r} /></p>
      <div className="mt-10"><SimpleChain r={r} /></div>

      <h2 className={'mt-16 ' + H2}>What <span className="italic text-terra">to do</span></h2>
      <div className="mt-6"><Recommend r={r} plan={plan} setPlan={setPlan} res={res} /></div>

      <h2 className={'mt-16 ' + H2}>What it <span className="italic text-terra">will take</span></h2>
      <div className="mt-6"><WhatItTakes r={r} plan={plan} setPlan={setPlan} res={res} /></div>

      <div className="mt-16 pt-5 border-t border-stone/60 max-w-3xl font-sans text-[14px] leading-relaxed opacity-70">
        <p className="font-type text-[12px] uppercase tracking-widest mb-2">Sources</p>
        <ul className="space-y-1">
          <li>Screening figures: Finnish Cancer Registry, bowel cancer screening statistics, 2024 round.</li>
          <li>Effect of the action: studies of real screening programmes (JAMA Internal Medicine 2026 and 2018), applied to {r.name}&apos;s numbers.</li>
          <li>Colonoscopies needed: our estimate from the registry figures and Statistics Finland population 2025, at today&apos;s rates.</li>
        </ul>
      </div>
    </div>
  )
}
