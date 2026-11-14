// What the screening nurse's daily follow-up list would look like. A DEMO: the people are made up (seeded, so the
// list is the same on every reload); only the header's averages come from the county's real 2024 figures.
// No names, no language, origin or education columns: the list is about who needs a call today, nothing else.
import { useMemo, useState } from 'react'
import { cx } from '../../components/ui'
import { mulberry32 } from '../../lib/random'
import { type ScreeningRow } from './data'
import type { ListWording } from './programmes'
import { n0, n1 } from './model'

/** Working days in a year, for the "per working day" averages. */
const WORKING_DAYS = 250
type Booked = 'no' | 'offered' | 'declined'
type Next = 'Call today' | 'Second call' | 'Send a letter' | 'Confirm the booking' | 'Refer to GP'

interface Person { id: string; age: number; positive: Date; days: number; booked: Booked; lastContact: string; next: Next }

const seedOf = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)
const dayFmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** Twelve made-up people with a positive test and no colonoscopy booked, oldest first. */
function demoPeople(countyId: string, today: Date, w: ListWording): Person[] {
  const rnd = mulberry32(seedOf(w.followup === 'colonoscopy' ? countyId : countyId + w.followup))
  const people = Array.from({ length: 12 }, () => {
    const days = 2 + Math.floor(rnd() ** 1.6 * 60)
    const positive = new Date(today.getTime() - days * 86_400_000)
    const attempts = days < 4 ? 0 : days < 12 ? (rnd() < 0.6 ? 1 : 0) : 1 + Math.floor(rnd() * 3)
    const r = rnd()
    const booked: Booked = attempts === 0 ? 'no' : r < 0.18 ? 'declined' : r < 0.45 ? 'offered' : 'no'
    const last = attempts === 0 ? '' : `${attempts === 1 ? 'Call' : `${attempts} calls`}, ${dayFmt(new Date(today.getTime() - Math.max(1, Math.floor(rnd() * Math.min(days, 10))) * 86_400_000))}${booked === 'no' ? ', no answer' : ''}`
    const next: Next = booked === 'declined' ? 'Refer to GP' : booked === 'offered' ? 'Confirm the booking' : attempts === 0 ? 'Call today' : attempts === 1 ? 'Second call' : 'Send a letter'
    return { age: w.ageMin + w.ageStep * Math.floor(rnd() * ((w.ageMax - w.ageMin) / w.ageStep + 1)), positive, days, booked, lastContact: last || 'Not yet contacted', next }
  })
  return people.sort((a, b) => b.days - a.days).map((p, i) => ({ ...p, id: `${w.personLabel} ${i + 1}` }))
}

const BOOKED_LABEL: Record<Booked, string> = { no: 'No', offered: 'Offered', declined: 'Declined' }

/** Bowel's wording and counts; breast and cervical pass their own. */
const bowelWording = (r: ScreeningRow): ListWording => ({
  personLabel: 'Person', event: 'positive test', bookedColumn: 'Colonoscopy booked?',
  perYear: r.testPositive, perYearLabel: 'positive tests', missedPerYear: r.noColonoscopy, missedLabel: 'end up with no recorded colonoscopy',
  ageMin: 60, ageMax: 70, ageStep: 2, followup: 'colonoscopy',
})

export function FollowUpList({ r, wording }: { r: Pick<ScreeningRow, 'id' | 'name'> & Partial<ScreeningRow>; wording?: ListWording }) {
  const w = wording ?? bowelWording(r as ScreeningRow)
  const today = useMemo(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d }, [])
  const people = useMemo(() => demoPeople(r.id, today, w), [r.id, today, w])
  const [done, setDone] = useState<Record<string, 'called' | 'booked'>>({})
  const positivesPerDay = w.perYear / WORKING_DAYS
  const missedPerDay = w.missedPerYear / WORKING_DAYS
  const over30 = people.filter((p) => p.days > 30 && done[p.id] !== 'booked').length
  const booked = Object.values(done).filter((v) => v === 'booked').length

  return (
    <div className="font-sans">
      <p className="rounded-lg bg-mustard/90 text-ink px-4 py-3 font-serif text-xl leading-snug">
        Demo with made-up people. The real list comes from the screening register.
      </p>

      <h2 className="mt-5 font-serif text-3xl leading-tight">Daily follow-up list, {r.name}</h2>
      <p className="mt-1 text-[15px] opacity-75">Everyone with a {w.event} and no {w.followup} booked, oldest first. For the screening nurse or coordinator, every working day.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="border border-black/15 rounded-lg p-3">
          <p className="font-serif text-3xl leading-none">about {n1(positivesPerDay)}</p>
          <p className="text-[13px] opacity-70 mt-1">{w.perYearLabel} a working day ({n0(w.perYear)} in 2024)</p>
        </div>
        <div className="border border-terra/50 rounded-lg p-3">
          <p className="font-serif text-3xl leading-none text-terra">about {n1(missedPerDay)}</p>
          <p className="text-[13px] opacity-70 mt-1">a working day {w.missedLabel} ({n0(w.missedPerYear)} in 2024)</p>
        </div>
      </div>
      <p className="mt-1 text-[12px] opacity-60">Averages over {WORKING_DAYS} working days, from the Cancer Registry&apos;s 2024 figures for {r.name}. The list below is made up.</p>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px]"><b className="font-medium">{people.length - booked}</b> on today&apos;s list · <span className="text-terra"><b className="font-medium">{over30}</b> waiting more than 30 days</span></p>
        {booked > 0 && <p className="text-[13px] opacity-70">{booked} booked today</p>}
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px] border-collapse">
          <thead>
            <tr className="text-left text-[12px] opacity-60">
              <th className="font-normal py-1.5 pr-2">Person</th>
              <th className="font-normal pr-2">{w.event.charAt(0).toUpperCase() + w.event.slice(1)}</th>
              <th className="font-normal pr-2">Days</th>
              <th className="font-normal pr-2">{w.bookedColumn}</th>
              <th className="font-normal pr-2">Last contact</th>
              <th className="font-normal">Next action</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const state = done[p.id]
              const late = p.days > 30
              return (
                <tr key={p.id} className={cx('border-t border-black/10 align-top', state === 'booked' && 'opacity-40 line-through decoration-black/30', late && !state && 'bg-terra/[.07]')}>
                  <td className="py-2 pr-2 whitespace-nowrap">{p.id}<span className="block text-[12px] opacity-60">age {p.age}</span></td>
                  <td className="pr-2 whitespace-nowrap">{dayFmt(p.positive)}</td>
                  <td className={cx('pr-2 font-serif text-lg leading-none', late && 'text-terra')}>{p.days}</td>
                  <td className="pr-2">{state === 'booked' ? 'Booked' : BOOKED_LABEL[p.booked]}</td>
                  <td className="pr-2 text-[13px]">{state === 'called' ? 'Called today' : p.lastContact}</td>
                  <td className="whitespace-nowrap">
                    {state === 'booked' ? <span className="text-[13px]">Done</span> : (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className={cx('text-[13px] font-medium', p.next === 'Call today' && 'text-terra')}>{p.next}</span>
                        <button onClick={() => setDone({ ...done, [p.id]: 'booked' })} className="print:hidden text-[12px] rounded-full border border-black/20 px-2 py-0.5 hover:bg-ink hover:text-paper">Booked</button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] opacity-60">Rows over 30 days are highlighted. Mark a person as booked to take them off today&apos;s list (this demo forgets it on reload).</p>

      <div className="mt-5 border-t border-black/15 pt-3 text-[14px] leading-snug">
        <p><b className="font-medium">How you know it works:</b> {w.followup === 'colonoscopy'
          ? 'days from positive test to booking; share of positive tests with a recorded colonoscopy; people still on the list after 30 days.'
          : `days from ${w.event} to booking; share with a ${w.followup} on record; people still on the list after 30 days.`}</p>
        <p className="mt-2 opacity-75">Where the real list would come from: the national implementation roadmap plans monthly reporting from the screening programmes to the screening registers (roadmap 2026–2031, measure 2.4.5). That register data, with each person&apos;s positive result and booking, is what would fill this list.</p>
      </div>
    </div>
  )
}
