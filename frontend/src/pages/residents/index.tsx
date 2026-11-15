// For residents: the same Cancer Registry figures as the monitor, told plainly to the people who are invited.
// No personal data, no AI, no symptoms or medical advice: only who is invited, how the county is doing,
// what you can do, and national places to ask. Contact links are national only (county pages are not checked).
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Label, Picker, cx } from '../../components/ui'
import { SCREENING, SCREENING_FI, screeningById } from '../monitor/data'
import { BREAST, BREAST_FI } from '../monitor/breastData'
import { CERVICAL, CERVICAL_FI } from '../monitor/cervicalData'
import { GOAL_ATTENDANCE } from '../monitor/programmes'

const OPTIONS = SCREENING.map((r) => ({ id: r.id, name: r.name }))
const DEFAULT = 'pohjois-savo'

// out of 100, so the sentence reads naturally ("74 of every 100")
const of100 = (pct: number) => Math.round(pct)

/** A small, plain comparison with Finland; within 1 point counts as about the same. */
function Compare({ county, finland }: { county: number; finland: number }) {
  const d = county - finland
  const same = Math.abs(d) < 1
  return (
    <span className={cx('inline-block font-type text-[12px] uppercase tracking-wider px-2 py-0.5 rounded-full align-middle',
      same ? 'bg-black/[.06]' : d > 0 ? 'bg-[#7FA88F]/25 text-[#2f5a40]' : 'bg-terra/15 text-terra')}>
      {same ? 'About the same as Finland' : d > 0 ? 'Above Finland' : 'Below Finland'}
    </span>
  )
}

function Programme({ title, who, how, after, doThis, children }: {
  title: string; who: ReactNode; how: ReactNode; after: ReactNode; doThis: string[]; children?: ReactNode
}) {
  return (
    <section className="rounded-lg border border-black/15 bg-paper p-6 sm:p-8 min-w-0">
      <h2 className="font-serif text-3xl sm:text-4xl leading-tight">{title}</h2>
      <dl className="mt-5 grid gap-4 font-sans text-[17px] leading-relaxed">
        <div><dt className="font-type text-[12px] uppercase tracking-widest opacity-60">Who is invited</dt><dd className="mt-1">{who}</dd></div>
        <div><dt className="font-type text-[12px] uppercase tracking-widest opacity-60">How your county is doing</dt><dd className="mt-1">{how}</dd></div>
        <div><dt className="font-type text-[12px] uppercase tracking-widest opacity-60">After an abnormal result</dt><dd className="mt-1">{after}</dd></div>
        <div>
          <dt className="font-type text-[12px] uppercase tracking-widest opacity-60">What you can do</dt>
          <dd className="mt-1"><ul className="list-disc pl-5 space-y-1">{doThis.map((d) => <li key={d}>{d}</li>)}</ul></dd>
        </div>
      </dl>
      {children}
    </section>
  )
}

const CONTACTS = [
  { name: 'Cancer Society of Finland (Syöpäjärjestöt)', what: 'Advice and support about cancer and screening, for anyone.', url: 'https://www.syopajarjestot.fi/' },
  { name: 'Finnish Cancer Registry: bowel cancer screening', what: 'Who is invited, how the test works, what happens next.', url: 'https://syoparekisteri.fi/seulonta/suolistosyovan-seulonta/' },
  { name: 'Finnish Cancer Registry: breast cancer screening', what: 'Who is invited and how often.', url: 'https://syoparekisteri.fi/seulonta/rintasyovanseulonta/' },
  { name: 'Finnish Cancer Registry: cervical cancer screening', what: 'Who is invited and how often.', url: 'https://syoparekisteri.fi/seulonta/kohdunkaulansyovanseulonta/' },
]

export default function ResidentsPage() {
  const [params, setParams] = useSearchParams()
  const id = screeningById(params.get('c') ?? '') ? params.get('c')! : DEFAULT
  const bowel = screeningById(id)!
  const breast = BREAST.find((x) => x.id === id)
  const cervical = CERVICAL.find((x) => x.id === id)
  const select = (c: string) => setParams((p) => { p.set('c', c); return p }, { replace: true })

  return (
    <div className="px-4 sm:px-6 lg:px-10 pb-20 max-w-[2000px] mx-auto overflow-x-clip">
      <header className="pt-10 sm:pt-14 max-w-4xl">
        <Label>For residents · screening in your county</Label>
        <h1 className="mt-4 font-serif font-light text-5xl sm:text-6xl leading-[0.95]">
          Screening is for everyone, <span className="italic text-terra">wherever you live.</span>
        </h1>
        <p className="mt-6 font-sans text-lg leading-snug opacity-80 max-w-2xl">
          The same public figures our county monitor uses, in plain words: who is invited, how your county is doing, and what you can do.
        </p>
        <div className="mt-6 flex items-baseline gap-3 flex-wrap">
          <span className="font-sans text-lg">Your county:</span>
          <Picker label="County" value={id} onChange={select} options={OPTIONS} className="font-serif text-2xl italic py-0.5" />
        </div>
      </header>

      <div className="mt-10 grid lg:grid-cols-3 gap-5">
        <Programme
          title="Bowel cancer"
          who={<>Everyone aged 60–72 (widening step by step to 56–74 by 2031), every two years. The test kit comes by post and is done at home.</>}
          how={<>In {bowel.name}, {of100(bowel.participationPct)} of every 100 invited people sent the kit back in 2024 (Finland {of100(SCREENING_FI.participationPct)}, goal {GOAL_ATTENDANCE}). <Compare county={bowel.participationPct} finland={SCREENING_FI.participationPct} /></>}
          after={<>A positive test means a follow-up colonoscopy, arranged with your area&apos;s screening nurse. In {bowel.name}, {of100(bowel.colonoscopyOfPositivesPct)} of every 100 people with a positive test had one on record (Finland {of100(SCREENING_FI.colonoscopyOfPositivesPct)}). <Compare county={bowel.colonoscopyOfPositivesPct} finland={SCREENING_FI.colonoscopyOfPositivesPct} /></>}
          doThis={[
            'Do the test and send it back, even if you feel well.',
            'If your test is positive and no one has contacted you within a few weeks, call the screening unit named in your letter or your health centre.',
          ]}
        />
        {breast && (
          <Programme
            title="Breast cancer"
            who={<>Women aged 50–69, about every two years. You get an invitation letter.</>}
            how={<>In {breast.name}, {of100(breast.attendedPct)} of every 100 invited women came for the mammogram in 2024 (Finland {of100(BREAST_FI.attendedPct)}, goal {GOAL_ATTENDANCE}). <Compare county={breast.attendedPct} finland={BREAST_FI.attendedPct} /></>}
            after={<>Some women are called back for further tests. Being called back usually does not mean cancer.</>}
            doThis={[
              'Go when invited, even if you feel well.',
              'If you missed your appointment, ask the screening unit in your letter for a new time.',
            ]}
          />
        )}
        {cervical && (
          <Programme
            title="Cervical cancer"
            who={<>Women aged 30–65, every five years. Some counties also invite women aged 25.</>}
            how={<>In {cervical.name}, {of100(cervical.participationPct)} of every 100 invited women were tested in 2024 (Finland {of100(CERVICAL_FI.participationPct)}, goal {GOAL_ATTENDANCE}). <Compare county={cervical.participationPct} finland={CERVICAL_FI.participationPct} /></>}
            after={<>About 1 in 100 women tested is referred for a closer look (colposcopy). Others are asked to come back for a repeat test before the next invitation.</>}
            doThis={[
              'Book and go when invited, even if you feel well.',
              'If you missed it, ask the screening unit in your letter for a new time.',
            ]}
          />
        )}
      </div>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="font-serif text-3xl">Where to ask</h2>
        <p className="mt-2 font-sans text-[16px] opacity-75 max-w-3xl">Your invitation letter names the screening unit for your area. For anything about symptoms, contact your health centre: screening is for people without symptoms.</p>
        <ul className="mt-5 grid sm:grid-cols-2 gap-4">
          {CONTACTS.map((c) => (
            <li key={c.url} className="rounded-lg border border-black/15 p-5 min-w-0">
              <a href={c.url} target="_blank" rel="noreferrer" className="font-sans text-[17px] font-medium underline decoration-black/30 hover:text-terra break-words">{c.name}</a>
              <p className="mt-1 font-sans text-[15px] opacity-75">{c.what}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-type text-[12px] uppercase tracking-wider opacity-60">
          Figures: Finnish Cancer Registry screening statistics, 2024 round. Who is invited: Cancer Registry programme pages. General information, not medical advice.
        </p>
      </section>
    </div>
  )
}
