// Is it who lives here, or the service? Actual 2024 kit return against what the county's population mix
// would predict at national group rates (language mix; education mix). Statistics Finland 2025 + Cancer Registry 2024.
import type { ReactNode } from 'react'
import { Card, Label, SourceBadge, cx } from '../../components/ui'
import { DEMOGRAPHICS, DEMOGRAPHICS_FI, GROUPS, demographicsById, type ScreeningRow } from './data'
import { n1 } from './model'

const rate = (dimension: string, group: string) => GROUPS.find((g) => g.dimension === dimension && g.group === group)!.participationPct
const R = {
  other: rate('mother_tongue', 'Other or missing'),
  native: rate('mother_tongue', 'Finnish/Swedish/Sami'),
  basic: rate('education', 'Basic or unknown'),
  upper: rate('education', 'Upper secondary'),
  higher: rate('education', 'Higher'),
}

/** How far actual kit return sits below what the mix predicts (mean of the two expectations), points. */
const unexplained = (d: { expectedByLanguage: number; expectedByEducation: number; actual2024: number }) =>
  (d.expectedByLanguage + d.expectedByEducation) / 2 - d.actual2024

/** Margin (points) beyond which a gap counts as not explained. */
const MARGIN = 1.5

function takeaway(r: ScreeningRow): { kind: 'service' | 'language' | 'education' | 'above' | 'part'; text: string; detail?: string } | null {
  const d = demographicsById(r.id)
  if (!d) return null
  const actual = r.participationPct
  const fi = DEMOGRAPHICS_FI.actual2024
  const { expectedByLanguage: lang, expectedByEducation: edu } = d
  if (actual < Math.min(lang, edu) - MARGIN) {
    return {
      kind: 'service',
      text: 'The population mix doesn’t explain this gap.',
      detail: 'Even with its language and education mix, more people should be returning the kit. The cause is more likely in how the service works, for example people using private or occupational healthcare instead, or tests and colonoscopies done privately and never recorded.',
    }
  }
  const gap = fi - actual
  const explains = (exp: number) => gap > 0.3 && fi - exp >= gap / 2 && Math.abs(actual - exp) <= MARGIN
  if (explains(lang)) return { kind: 'language', text: 'Language explains most of this gap.', detail: 'A multilingual reminder fits here: the shortfall sits where the population mix says it should.' }
  if (explains(edu)) return { kind: 'education', text: 'Education explains most of this gap.', detail: 'Reminders aimed at people with basic education fit here.' }
  if (actual >= Math.max(lang, edu) - 0.5) return { kind: 'above', text: 'Kit return is at or above what the population mix predicts.' }
  return { kind: 'part', text: 'The population mix explains part of this gap.', detail: 'Actual kit return is below what the mix predicts, but within 1.5 points of at least one expectation.' }
}

const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

function Bar({ label, v, badge, strong }: { label: ReactNode; v: number; badge: ReactNode; strong?: boolean }) {
  const lo = 60, hi = 80
  const pc = (x: number) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-[15px] leading-tight">{label}</span>
        <span className={cx('font-serif text-xl flex items-center gap-1.5 shrink-0', strong && 'text-terra')}>{n1(v)}%{badge}</span>
      </div>
      <span className="block relative h-3 mt-1.5 rounded-full bg-black/[.07]">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', strong ? 'bg-terra' : 'bg-ink/70')} style={{ width: pc(v) }} />
      </span>
    </div>
  )
}

export function MixGap({ r }: { r: ScreeningRow }) {
  const d = demographicsById(r.id)
  if (!d) return null
  const t = takeaway(r)!
  const ranked = [...DEMOGRAPHICS].sort((a, b) => unexplained(b) - unexplained(a))
  const rank = ranked.findIndex((x) => x.id === d.id) + 1
  const gap = unexplained(d)
  const f = d.foreignLangPct
  const langHow = <>National 2024 kit return by mother tongue, weighted by {r.name}&apos;s residents aged 56–74:<br />
    {n1(f)}% × {n1(R.other)}% + {n1(100 - f)}% × {n1(R.native)}% = {n1((f * R.other + (100 - f) * R.native) / 100)}%<br />
    Language mix: Statistics Finland 2025 (vaerak/11rz).</>
  const eduSum = d.basicEduPct + d.upperSecPct + d.higherEduPct
  const eduHow = <>National 2024 kit return by education, weighted by {r.name}&apos;s education mix:<br />
    ({n1(d.basicEduPct)}% × {n1(R.basic)}% + {n1(d.upperSecPct)}% × {n1(R.upper)}% + {n1(d.higherEduPct)}% × {n1(R.higher)}%) ÷ {n1(eduSum)}% = {n1((d.basicEduPct * R.basic + d.upperSecPct * R.upper + d.higherEduPct * R.higher) / eduSum)}%<br />
    Education mix: Statistics Finland 2025 (vkour/12bq).</>
  return (
    <div className="mt-10 grid lg:grid-cols-[minmax(0,360px)_1fr] gap-6 lg:gap-10 items-start">
      <div>
        <Label className="mb-3">Is it who lives here, or the service?</Label>
        <p className="font-serif text-3xl sm:text-4xl leading-tight">
          {t.kind === 'service'
            ? <>In {r.name}, <span className="italic text-terra">the population mix doesn&apos;t explain this gap.</span></>
            : <>In {r.name}, <span className="italic">{t.text.charAt(0).toLowerCase() + t.text.slice(1)}</span></>}
        </p>
        {t.detail && <p className="mt-4 font-sans text-[16px] leading-relaxed opacity-80">{t.detail}</p>}
        {gap > 0.5 && rank <= 3 && (
          <p className="mt-3 font-type text-sm uppercase tracking-wider opacity-80">
            {rank === 1 ? 'The largest gap in Finland' : `The ${ord(rank)} largest gap of ${ranked.length} counties`} between expected and actual kit return
          </p>
        )}
      </div>
      <Card className="p-5 sm:p-6">
        <div className="flex justify-between items-baseline mb-1 gap-3 flex-wrap">
          <Label>Kit returned, 2024: actual vs expected</Label>
          <span className="font-type text-[13px] uppercase tracking-wider opacity-60">scale 60–80%</span>
        </div>
        <Bar label={<>Actual, {r.name}</>} v={r.participationPct} strong={t.kind === 'service'}
          badge={<SourceBadge id="bowelScreening2024" kind="direct" demo={false} />} />
        <Bar label="Expected from its language mix" v={d.expectedByLanguage}
          badge={<SourceBadge id="statfinLang" kind="estimate" demo={false} how={langHow} />} />
        <Bar label="Expected from its education mix" v={d.expectedByEducation}
          badge={<SourceBadge id="statfinEdu" kind="estimate" demo={false} how={eduHow} />} />
        <p className="mt-3 pt-3 border-t border-black/10 font-sans text-[13px] leading-snug opacity-65">
          Expected = what {r.name} would return if each group returned the kit at the national 2024 rate
          (other mother tongue {n1(R.other)}% vs {n1(R.native)}%; basic education {n1(R.basic)}%, upper secondary {n1(R.upper)}%, higher {n1(R.higher)}%).
          {' '}{n1(f)}% of residents aged 56–74 have another mother tongue (Finland {n1(DEMOGRAPHICS_FI.foreignLangPct)}%).
          {' '}A gap counts as unexplained when actual is more than {MARGIN} points below both.
        </p>
      </Card>
    </div>
  )
}
