// Actions tab: the county's concrete next steps for bowel cancer screening.
// Where the chain leaks, the one action to start with, and what it takes. The header's Print button prints the one-page plan.
import { useMemo } from 'react'
import { Label } from '../../components/ui'
import { screeningById } from '../monitor/data'
import { evaluate, type Plan } from '../monitor/model'
import { Recommend, SimpleChain, Verdict, WhatItTakes } from '../monitor/Simple'

export function Actions({ countyId, plan, setPlan }: { countyId: string; plan: Plan; setPlan: (p: Plan) => void }) {
  const r = screeningById(countyId)!
  const res = useMemo(() => evaluate(r, plan), [r, plan])
  return (
    <div className="max-w-6xl pt-2 lg:pt-4">
      <Label className="mb-4">Bowel cancer screening · 2024 round</Label>
      <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.15] max-w-4xl"><Verdict r={r} /></p>

      <Label className="mt-14 mb-5">Where people are lost</Label>
      <SimpleChain r={r} />

      <Label className="mt-16 mb-5">Do next</Label>
      <Recommend r={r} plan={plan} setPlan={setPlan} res={res} />

      <div className="mt-16 tear pt-8">
        <Label className="mb-6">What it will take</Label>
        <WhatItTakes r={r} plan={plan} setPlan={setPlan} res={res} />
      </div>

      <div className="mt-16 tear pt-6 max-w-3xl font-type text-[13px] leading-relaxed opacity-70">
        <p className="uppercase tracking-widest mb-2">Sources</p>
        <ul className="space-y-1">
          <li>Screening figures: Finnish Cancer Registry, bowel cancer screening statistics, 2024 round.</li>
          <li>Effect of the action: studies of real screening programmes (JAMA Internal Medicine 2026 and 2018), applied to {r.name}&apos;s numbers.</li>
          <li>Colonoscopies needed: our estimate from the registry figures and Statistics Finland population 2025, at today&apos;s rates.</li>
        </ul>
      </div>
    </div>
  )
}
