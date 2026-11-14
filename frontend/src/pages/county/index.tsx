// Page 3: County — where people are lost. Tabs share the selected county + cancer through the URL query.
// 3.1 Radar · 3.2 Screening · 3.3 Overload · 3.4 Data gaps · 3.5 Brief (drawer).
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Card, Drawer, EdgeText, Label, RoundBtn, SourceBadge, Stamp, Tabs, cx } from '../../components/ui'
import { COUNTIES, countyById, type CancerId, type RadarCancerId } from '../../data/counties'
import { CountyStyles, Spark, Tear } from './bits'
import { NAT, RADAR_CANCERS, cancerLabel, fmt, isCoreCancer, queueRising, radarFor, stepInfo } from './model'
import { Radar } from './Radar'
import { Screening } from './Screening'
import { Overload } from './Overload'
import { DataGaps } from './DataGaps'
import { Brief, buildBrief } from './Brief'

type Tab = 'radar' | 'screening' | 'overload' | 'gaps'
const TABS: { id: Tab; label: string }[] = [
  { id: 'radar', label: 'Radar' },
  { id: 'screening', label: 'Screening' },
  { id: 'overload', label: 'Overload' },
  { id: 'gaps', label: 'Data gaps' },
]
const CANCER_IDS: CancerId[] = ['lung', 'bowel', 'pancreas', 'liver']

export interface TabProps {
  countyId: string
  cancer: CancerId
  setCancer: (c: CancerId) => void
  /** radar also covers breast + cervical (screening programmes) */
  radarCancer: RadarCancerId
  setRadarCancer: (c: RadarCancerId) => void
  select: (id: string) => void
  openBrief: (id: string) => void
}

export default function CountyPage() {
  const [q, setQ] = useSearchParams()
  const tab = (TABS.some((t) => t.id === q.get('tab')) ? q.get('tab') : 'radar') as Tab
  const countyId = countyById(q.get('c') ?? '') ? q.get('c')! : 'pohjois-karjala'
  const cancer = (CANCER_IDS.includes(q.get('cancer') as CancerId) ? q.get('cancer') : 'lung') as CancerId
  const radarCancer = (RADAR_CANCERS.some((x) => x.id === q.get('rc')) ? q.get('rc') : cancer) as RadarCancerId

  const setParam = useCallback((patch: Record<string, string>) => {
    setQ((prev) => {
      const n = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) n.set(k, v)
      return n
    }, { replace: true })
  }, [setQ])

  const [briefOpen, setBriefOpen] = useState(false)
  const county = countyById(countyId)!
  const brief = useMemo(() => buildBrief(county, radarCancer), [county, radarCancer])
  const rad = radarFor(county, radarCancer)

  const tp: TabProps = {
    countyId,
    cancer,
    setCancer: (c) => setParam({ cancer: c, rc: c }),
    radarCancer,
    setRadarCancer: (c) => setParam(isCoreCancer(c) ? { rc: c, cancer: c } : { rc: c }),
    select: (id) => setParam({ c: id }),
    openBrief: (id) => { setParam({ c: id }); setBriefOpen(true) },
  }

  return (
    <div className="county-root px-4 sm:px-6 lg:px-10 pb-16 max-w-[1400px] overflow-x-clip">
      <CountyStyles />

      {/* sticky picker + tabs */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 pb-3 bg-paper/95 backdrop-blur-sm border-b border-stone/60">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <Label className="hidden sm:block shrink-0">03 · County</Label>
            <div className="relative min-w-0">
              <select aria-label="County" value={countyId} onChange={(e) => tp.select(e.target.value)}
                className="appearance-none font-serif text-2xl sm:text-3xl italic pr-8 py-0.5 border-b border-black/30 focus:border-terra outline-none cursor-pointer max-w-[78vw] sm:max-w-none truncate">
                {COUNTIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-sm">▾</span>
            </div>
          </div>
          <button onClick={() => setBriefOpen(true)}
            className="font-type text-[13px] uppercase tracking-widest flex items-center gap-2 rounded-full bg-ink text-paper pl-4 pr-1.5 py-1.5 hover:bg-terra transition-colors">
            Brief <span className="w-6 h-6 rounded-full bg-mustard text-ink flex items-center justify-center">→</span>
          </button>
        </div>
        <Tabs className="mt-3" tabs={TABS} value={tab} onChange={(t) => setParam({ tab: t })} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_290px] gap-8 lg:gap-10 mt-8">
        <div className="min-w-0 relative z-10" key={tab}>
          <div className="rise">
            {tab === 'radar' && <Radar {...tp} />}
            {tab === 'screening' && <Screening {...tp} />}
            {tab === 'overload' && <Overload {...tp} />}
            {tab === 'gaps' && <DataGaps {...tp} />}
          </div>
        </div>

        <aside className="min-w-0">
          <div className="lg:sticky lg:top-32">
            <Card tone="mustard" tilt={1.2} className="relative p-6 pl-10 pb-24">
              <EdgeText>Selected county · {String(COUNTIES.indexOf(county) + 1).padStart(2, '0')}/22</EdgeText>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <Label>Selected</Label>
                  <p className="font-serif text-3xl leading-[0.95] mt-1 break-words">{county.name}</p>
                </div>
                <Stamp rotate={14} className="!w-20 !h-20 -mr-2 -mt-1 [&>div]:!w-16 [&>div]:!h-16">
                  {brief.stamp}
                </Stamp>
              </div>
              <div className="mt-5 space-y-3">
                <MiniStat label="Residents" value={fmt(county.population)} badge={<SourceBadge id="statfinPop" kind="direct" />} />
                <MiniStat label={`High risk · ${cancerLabel(radarCancer)}`} value={fmt(rad.highRisk)}
                  badge={<SourceBadge id="sotkanetRisk" kind="estimate" how="residents in the age band × risk-factor prevalence (Statistics Finland × THL Sotkanet). See the Radar tab for the recipe." />} />
                <MiniStat label="Weakest step" value={`${stepInfo(rad.weakest).n} · ${stepInfo(rad.weakest).label}`}
                  badge={<SourceBadge id="ourModel" kind="estimate" how="Detection radar (3.1): the step where this county scores worst against the other counties." />} />
                <MiniStat label="Smoking" value={`${county.smoking}%`} sub={`FI ${fmt(NAT.smoking, 1)}%`} badge={<SourceBadge id="sotkanetRisk" kind="direct" />} />
                <MiniStat label="Bowel turnout" value={`${county.bowelTurnout}%`} sub={`FI ${fmt(NAT.bowelTurnout, 1)}%`} badge={<SourceBadge id="sotkanetScreening" kind="direct" />} />
                <div className="flex items-end justify-between gap-2 border-b border-black/10 pb-2">
                  <div>
                    <Label>Queue &gt;90 d</Label>
                    <p className="font-serif text-xl leading-none mt-1 flex items-center gap-1.5">
                      {county.queueTrend[3]}<span className="font-type text-xs opacity-60">/10k</span>
                      <SourceBadge id="sotkanetQueue" kind="direct" />
                    </p>
                  </div>
                  <Spark values={county.queueTrend} w={80} h={26} mark={3}
                    stroke={queueRising(county) ? '#C65D3B' : '#1F1F1F'} fill="rgba(31,31,31,.08)" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-2">
                <Tear left="Tear here for the brief" right="→" />
              </div>
              <RoundBtn title="Open county brief" onClick={() => setBriefOpen(true)} className="absolute bottom-9 right-5 !w-12 !h-12">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><path d="M6 3h9l3 3v15H6z" /><path d="M9 10h6M9 14h6M9 18h4" /></svg>
              </RoundBtn>
            </Card>
          </div>
        </aside>
      </div>

      <Drawer open={briefOpen} onClose={() => setBriefOpen(false)}>
        <Brief brief={brief} county={county} />
      </Drawer>
      {createPortal(
        <div id="county-print"><Brief brief={brief} county={county} print /></div>,
        document.body,
      )}
    </div>
  )
}

function MiniStat({ label, value, sub, badge }: { label: string; value: string; sub?: string; badge?: ReactNode }) {
  return (
    <div className={cx('flex items-end justify-between gap-2 border-b border-black/10 pb-2')}>
      <div>
        <Label>{label}</Label>
        <p className="font-serif text-xl leading-none mt-1 flex items-center gap-1.5">{value}{badge}</p>
      </div>
      {sub && <span className="font-type text-xs opacity-60 pb-0.5">{sub}</span>}
    </div>
  )
}
