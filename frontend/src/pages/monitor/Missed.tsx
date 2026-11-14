// Section 2: who is being missed. National group data (the Registry publishes no per-county split).
import { Card, Label, SourceBadge, cx } from '../../components/ui'
import { GROUPS, SCREENING_FI } from './data'
import { GROUP_FACTS, n0, n1 } from './model'

const g = (dimension: string, group: string) => GROUPS.find((x) => x.dimension === dimension && x.group === group)!
const { skipped, negative, first } = GROUP_FACTS

const ROWS: { label: string; pct: number; vs?: string; n?: number }[][] = [
  [
    { label: 'Skipped last round', pct: skipped.pct, n: skipped.invited },
    { label: 'First invitation', pct: first.pct, n: first.invited },
    { label: 'Tested negative last round', pct: negative.pct, n: negative.invited },
  ],
  [
    { label: 'Other mother tongue', pct: g('mother_tongue', 'Other or missing').participationPct, n: g('mother_tongue', 'Other or missing').invited },
    { label: 'Born in Africa', pct: g('birth_region', 'Africa').participationPct, n: g('birth_region', 'Africa').invited },
    { label: 'Born in Asia', pct: g('birth_region', 'Asia').participationPct, n: g('birth_region', 'Asia').invited },
    { label: 'Born elsewhere in Europe', pct: g('birth_region', 'Other Europe').participationPct, n: g('birth_region', 'Other Europe').invited },
    { label: 'Finnish / Swedish / Sami', pct: g('mother_tongue', 'Finnish/Swedish/Sami').participationPct },
  ],
  [
    { label: 'Basic education', pct: g('education', 'Basic or unknown').participationPct, n: g('education', 'Basic or unknown').invited },
    { label: 'Higher education', pct: g('education', 'Higher').participationPct },
    { label: 'Men', pct: g('sex', 'Men').participationPct, n: g('sex', 'Men').invited },
    { label: 'Women', pct: g('sex', 'Women').participationPct },
  ],
]

function Row({ label, pct, n }: { label: string; pct: number; n?: number }) {
  const low = pct < 65
  return (
    <div className="grid grid-cols-[minmax(0,10.5rem)_1fr_3.5rem] sm:grid-cols-[minmax(0,13rem)_1fr_3.5rem] items-center gap-3 py-1.5">
      <span className="font-sans text-[15px] leading-tight truncate" title={label}>{label}{n != null && <span className="block font-type text-[13px] opacity-55">{n0(n)} invited</span>}</span>
      <span className="relative h-3 rounded-full bg-black/[.07]">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', low ? 'bg-terra' : 'bg-ink/80')} style={{ width: `${pct}%` }} />
        <span className="absolute -top-1 -bottom-1 w-px bg-ink/50" style={{ left: `${SCREENING_FI.participationPct}%` }} />
      </span>
      <span className={cx('font-serif text-xl text-right', low && 'text-terra')}>{n1(pct)}%</span>
    </div>
  )
}

export function Missed() {
  return (
    <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-6 lg:gap-10 items-start">
      <div>
        <p className="font-serif text-3xl sm:text-4xl leading-tight">
          Skip one round and you rarely come back: <span className="italic text-terra">{n1(skipped.pct)}%</span> did, against {n1(negative.pct)}% of those who tested negative.
        </p>
        <p className="mt-4 font-sans text-[16px] leading-relaxed opacity-80">
          {n0(skipped.invited)} people invited in 2024 had skipped the previous round. Other mother tongues, basic education and men also return the kit less often. These are the groups a reminder should aim at first.
        </p>
        <p className="mt-4 font-type text-sm uppercase tracking-wider opacity-70 flex items-center gap-2">National figures, all counties <SourceBadge id="bowelScreening2024" kind="direct" demo={false} /></p>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="flex justify-between items-baseline mb-2">
          <Label>Kit returned, % of invited</Label>
          <span className="font-type text-[13px] uppercase tracking-wider opacity-60">line = Finland {n1(SCREENING_FI.participationPct)}%</span>
        </div>
        {ROWS.map((block, i) => (
          <div key={i} className={cx(i > 0 && 'mt-3 pt-3 border-t border-black/10')}>
            {block.map((r) => <Row key={r.label} {...r} />)}
          </div>
        ))}
      </Card>
    </div>
  )
}
