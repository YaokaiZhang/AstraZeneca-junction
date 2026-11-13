// 3.3 Lung screening capacity planner: eligible people → CT scans per year → indicative cost.
import { Card, Display, EdgeText, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { COUNTIES, countyById } from '../../data/counties'
import { Seg, Slider, Tear } from './bits'
import { capacity, eur, fmt, pct, type CapacityInputs } from './model'
import type { TabProps } from './index'

export function Capacity({ countyId, select, cap, setCap }: TabProps & { cap: CapacityInputs; setCap: (c: CapacityInputs) => void }) {
  const county = countyById(countyId)!
  const r = capacity(county, cap)
  const set = (patch: Partial<CapacityInputs>) => setCap({ ...cap, ...patch })
  const all = COUNTIES.map((c) => ({ c, r: capacity(c, cap) })).sort((a, b) => b.r.ct - a.r.ct)
  const maxCt = all[0].r.ct

  const how = (
    <>
      eligible = pop 50–74 × smoking % × eligible fraction<br />
      = {fmt(r.pop5074)} × {county.smoking}% × {pct(cap.eligibleFrac)} = {fmt(r.eligible)}<br />
      CT/yr = eligible × uptake ÷ interval + screened × follow-up<br />
      = {fmt(r.routine)} + {fmt(r.followUps)} = {fmt(r.ct)}<br />
      cost = CT × €{cap.unitCost}
    </>
  )

  const funnel = [
    { label: 'Aged 50–74', v: r.pop5074, badge: <SourceBadge id="statfinPop" kind="direct" /> },
    { label: 'Smoke', v: r.smokers, badge: <SourceBadge id="sotkanetRisk" kind="direct" /> },
    { label: 'Eligible', v: r.eligible, badge: <SourceBadge id="ourModel" kind="estimate" how={how} /> },
    { label: 'Screened', v: r.screened, badge: <SourceBadge id="ourModel" kind="estimate" how={how} /> },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Display a="Scans" b="to budget" />
        <Stamp rotate={8}>Lung CT<br />{county.name.length > 12 ? county.name.slice(0, 11) + '.' : county.name}</Stamp>
      </div>

      <div className="mt-8 grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        {/* inputs */}
        <Card tone="stone" tilt={-0.8} className="p-5 sm:p-7 space-y-6 min-w-0">
          <Slider label="Eligible share of smokers" value={cap.eligibleFrac} min={0.2} max={1} step={0.05}
            onChange={(v) => set({ eligibleFrac: v })} display={pct(cap.eligibleFrac)}
            badge={<SourceBadge id="plco" kind="estimate" how="Share of current smokers 50–74 above a PLCOm2012 6-year risk threshold (≈1.5%). Adjustable assumption." />} />
          <Slider label="Uptake" value={cap.uptake} min={0.2} max={0.9} step={0.05}
            onChange={(v) => set({ uptake: v })} display={pct(cap.uptake)}
            badge={<SourceBadge id="mentor" kind="mentor" how="Pilot programmes abroad report 40–60% uptake; adjustable assumption." />} />
          <Slider label="Follow-up scans" value={cap.followUp} min={0.05} max={0.3} step={0.01}
            onChange={(v) => set({ followUp: v })} display={pct(cap.followUp)}
            badge={<SourceBadge id="ourModel" kind="estimate" how="Extra CT per screened person per year for indeterminate nodules." />} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="label !opacity-70">Interval</span>
            <Seg items={[{ id: '1', label: 'Annual' }, { id: '2', label: 'Every 2 yrs' }]} value={String(cap.intervalYears) as '1' | '2'}
              onChange={(v) => set({ intervalYears: v === '1' ? 1 : 2 })} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="label !opacity-70">Unit cost · € per CT</span>
            <span className="flex items-baseline gap-1 font-serif text-2xl">
              €<input type="number" min={20} max={2000} step={10} value={cap.unitCost}
                onChange={(e) => set({ unitCost: Math.max(0, +e.target.value || 0) })}
                className="w-20 border-b border-black/30 focus:border-terra outline-none text-right" aria-label="Euro per CT scan" />
              <SourceBadge id="ourModel" kind="estimate" how="Indicative low-dose CT incl. reading. Replace with the county's own price list." />
            </span>
          </label>

          <div className="pt-2 space-y-2">
            {funnel.map((f, i) => (
              <div key={f.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3">
                <span className="font-type text-[10px] uppercase tracking-wider opacity-70">{f.label}</span>
                <span className="h-3 rounded-full bg-black/10 overflow-hidden">
                  <span className={cx('block h-full rounded-full transition-all duration-500', i < 2 ? 'bg-ink/60' : i === 2 ? 'bg-terra' : 'bg-mustard border border-ink/40')}
                    style={{ width: `${Math.max(1.5, Math.sqrt(f.v / r.pop5074) * 100)}%` }} />
                </span>
                <span className="font-type text-xs tabular-nums flex items-center gap-1.5">{fmt(f.v)} {f.badge}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* outputs */}
        <div className="relative min-w-0 pt-2">
          <Card tone="mustard" tilt={1.4} className="relative p-6 sm:p-8 pl-10 sm:pl-12 pb-12">
            <EdgeText>Budget line · {county.name}</EdgeText>
            <Label>Indicative cost per year</Label>
            <p className="font-serif text-6xl sm:text-7xl leading-none mt-2 flex items-baseline gap-2 flex-wrap">
              {eur(r.cost)} <SourceBadge id="ourModel" kind="estimate" how={how} />
            </p>
            <div className="grid grid-cols-2 gap-5 mt-8">
              <div>
                <Label>CT scans / yr</Label>
                <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-1.5">{fmt(r.ct)} <SourceBadge id="ourModel" kind="estimate" how={how} /></p>
              </div>
              <div>
                <Label>Per working day</Label>
                <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-1.5">{fmt(r.perDay, 1)} <SourceBadge id="ourModel" kind="estimate" how="CT scans per year ÷ 230 working days" /></p>
              </div>
              <div>
                <Label>Eligible people</Label>
                <p className="font-serif text-4xl leading-none mt-1 flex items-baseline gap-1.5">{fmt(r.eligible)} <SourceBadge id="ourModel" kind="estimate" how={how} /></p>
              </div>
              <div>
                <Label>Baseline + follow-up</Label>
                <p className="font-serif text-2xl leading-none mt-2">{fmt(r.routine)} + {fmt(r.followUps)}</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-2">
              <Tear left="Tear here for the budget" right={`€${cap.unitCost}/CT`} />
            </div>
          </Card>

          <Card tilt={-0.5} className="p-5 mt-6">
            <div className="flex justify-between mb-2">
              <Label>CT / yr · all counties</Label>
              <span className="font-type text-[10px] opacity-60 uppercase">same settings</span>
            </div>
            <ul className="space-y-0.5">
              {all.map(({ c, r: cr }) => (
                <li key={c.id}>
                  <button onClick={() => select(c.id)}
                    className={cx('w-full grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3.5rem] items-center gap-2 py-0.5 px-1.5 rounded text-left', c.id === countyId ? 'bg-mustard' : 'hover:bg-black/5')}>
                    <span className="font-type text-[11px] truncate">{c.name}</span>
                    <span className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <span className={cx('block h-full rounded-full transition-all duration-500', c.id === countyId ? 'bg-ink' : 'bg-terra/70')} style={{ width: `${(cr.ct / maxCt) * 100}%` }} />
                    </span>
                    <span className="font-type text-[11px] text-right tabular-nums">{fmt(cr.ct)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
