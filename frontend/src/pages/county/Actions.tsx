// Actions tab: the county's concrete next steps for bowel cancer screening.
// Where the chain leaks, the one action to start with, and what it takes. The header's Print button prints the one-page plan.
import { useMemo } from 'react'
import { countyById } from '../../data/counties'
import { Programme } from './Programme'
import { programmeView, type ProgrammeId } from './programmes'
import { Label, SourceBadge } from '../../components/ui'
import { screeningById } from '../monitor/data'
import { evaluate, type Plan } from '../monitor/model'
import { startHere } from '../monitor/plain'
import { Recommend, SimpleChain, Verdict, WhatItTakes } from '../monitor/Simple'

export function Actions({ countyId, plan, setPlan, programme }: { countyId: string; plan: Plan; setPlan: (p: Plan) => void; programme: ProgrammeId }) {
  const r = screeningById(countyId)!
  const res = useMemo(() => evaluate(r, plan), [r, plan])
  const other = programme === 'bowel' ? null : programmeView(programme, countyId)
  if (other) return <div className="max-w-6xl pt-2 lg:pt-4"><Programme v={other} name={countyById(countyId)!.name} /></div>
  return (
    <div className="max-w-6xl pt-2 lg:pt-4">
      <Label className="mb-4">Bowel cancer screening · 2024 round</Label>
      <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.15] max-w-4xl"><Verdict r={r} /></p>

      <div className="mt-14 mb-5 flex items-center gap-3"><Label>Where people are lost</Label>
        <SourceBadge id="bowelScreening" kind="direct" demo={false} how={`${r.name}, 2024 round. Finland = whole-country figure.`} /></div>
      <SimpleChain r={r} />

      <div className="mt-16 mb-5 flex items-center gap-3"><Label>Do next</Label>
        {startHere(r).step === 'capacity'
          ? <SourceBadge id="ourModel" kind="estimate" demo={false} how={`Queue to clear = colonoscopies a week × (today's wait − national wait), from ${r.name}'s 2024 colonoscopies and wait (Cancer Registry).`} />
          : <SourceBadge id="screeningTrials" kind="estimate" demo={false} how={`Expected result = the effect found in these studies, applied to ${r.name}'s 2024 screening numbers.`} />}</div>
      <Recommend r={r} plan={plan} setPlan={setPlan} res={res} />

      <div className="mt-16 tear pt-8">
        <div className="mb-6 flex items-center gap-3"><Label>What it will take</Label>
          <SourceBadge id="ourModel" kind="estimate" demo={false} how="Colonoscopies in 2031 = today's colonoscopies (Cancer Registry, 2024 round) × people aged 56–74 invited in 2031 (Statistics Finland population 2025) ÷ people invited in 2024, at today's rates. Shown as extra on top of what the county does today." /></div>
        <WhatItTakes r={r} plan={plan} setPlan={setPlan} res={res} />
      </div>

    </div>
  )
}
