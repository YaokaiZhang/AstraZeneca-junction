// Actions tab: the county's concrete next steps, built from the Screening Chain Monitor's pieces.
// Where the chain leaks, the one action to start with, what it takes, and the one-page plan to print.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Label } from '../../components/ui'
import { screeningById } from '../monitor/data'
import { evaluate, type Plan } from '../monitor/model'
import { Recommend, SimpleChain, Verdict, WhatItTakes } from '../monitor/Simple'

export function Actions({ countyId, plan, setPlan }: { countyId: string; plan: Plan; setPlan: (p: Plan) => void }) {
  const r = screeningById(countyId)!
  const res = useMemo(() => evaluate(r, plan), [r, plan])
  const more = `/monitor?c=${countyId}`
  return (
    <div className="max-w-5xl">
      <Label className="mb-4">Bowel cancer screening · {r.name} · 2024</Label>
      <p className="font-serif text-3xl sm:text-[2.6rem] leading-[1.12] max-w-4xl"><Verdict r={r} /></p>
      <div className="mt-8"><SimpleChain r={r} /></div>
      <p className="mt-3 font-sans text-[13px] opacity-60">Source: Finnish Cancer Registry, bowel cancer screening statistics, 2024 round.</p>

      <h2 className="mt-14 font-serif text-4xl sm:text-5xl">What <span className="italic text-terra">to do</span></h2>
      <div className="mt-6">
        <Recommend r={r} plan={plan} setPlan={setPlan} res={res}
          otherOptions={<Link to={more} className="font-sans text-[15px] underline underline-offset-4 opacity-75 hover:opacity-100 hover:text-terra">See other proven options</Link>} />
      </div>
      <p className="mt-3 font-sans text-[13px] opacity-60">Based on studies of real screening programmes (JAMA Internal Medicine 2026 and 2018), applied to {r.name}&apos;s 2024 numbers.</p>

      <h2 className="mt-14 font-serif text-4xl sm:text-5xl">What it <span className="italic text-terra">will take</span></h2>
      <div className="mt-6"><WhatItTakes r={r} plan={plan} setPlan={setPlan} res={res} /></div>
      <p className="mt-3 font-sans text-[13px] opacity-60">Our estimate from the Cancer Registry figures and Statistics Finland population 2025.</p>

      <div className="mt-14 flex flex-wrap items-center gap-4">
        <button onClick={() => window.print()}
          className="group inline-flex items-center gap-3 bg-ink text-paper rounded-full pl-7 pr-2 py-2 font-type uppercase text-sm tracking-widest hover:bg-terra transition-colors">
          Print the one-page plan
          <span className="w-10 h-10 rounded-full bg-mustard text-ink flex items-center justify-center group-hover:translate-y-0.5 transition-transform">↓</span>
        </button>
        <Link to={more} className="font-sans text-[15px] underline underline-offset-4 opacity-75 hover:opacity-100 hover:text-terra">All fixes, the evidence and the AI briefing →</Link>
      </div>
    </div>
  )
}
