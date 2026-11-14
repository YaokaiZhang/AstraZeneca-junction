// Page 3: County — where people are lost. Tabs share the selected county + cancer through the URL query.
// Actions (the landing tab) · Brief · Radar.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Btn, Drawer, Label, Picker, Tabs } from '../../components/ui'
import { COUNTIES, countyById, type CancerId, type RadarCancerId } from '../../data/counties'
import { CountyStyles, Seg } from './bits'
import { RADAR_CANCERS, isCoreCancer } from './model'
import { Radar } from './Radar'
import { Brief, buildBrief } from './Brief'
import { Actions } from './Actions'
import { PROGRAMMES, type ProgrammeId } from './programmes'
import { screeningById } from '../monitor/data'
import { EMPTY_PLAN, evaluate, type Plan } from '../monitor/model'
import { ActionSheet } from '../monitor/ActionSheet'
import { useAiBriefing } from '../monitor/useAiBriefing'

type Tab = 'actions' | 'brief' | 'radar'
const TABS: { id: Tab; label: string }[] = [
  { id: 'actions', label: 'Actions' },
  { id: 'brief', label: 'Brief' },
  { id: 'radar', label: 'Radar' },
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
  const tab = (TABS.some((t) => t.id === q.get('tab')) ? q.get('tab') : 'actions') as Tab
  const countyId = countyById(q.get('c') ?? '') ? q.get('c')! : 'pohjois-karjala'
  const cancer = (CANCER_IDS.includes(q.get('cancer') as CancerId) ? q.get('cancer') : 'lung') as CancerId
  const programme = (PROGRAMMES.some((x) => x.id === q.get('sc')) ? q.get('sc') : 'bowel') as ProgrammeId
  const radarCancer = (RADAR_CANCERS.some((x) => x.id === q.get('rc')) ? q.get('rc') : cancer) as RadarCancerId

  const setParam = useCallback((patch: Record<string, string>) => {
    setQ((prev) => {
      const n = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) n.set(k, v)
      return n
    }, { replace: true })
  }, [setQ])

  // old links to /county/brief now land on /county, where the brief is the first tab
  const legacyBrief = useLocation().pathname.replace(/\/$/, '') !== '/county'
  const openBrief = (id: string) => {
    setParam({ c: id, tab: 'brief' })
    window.scrollTo(0, 0)
  }
  const county = countyById(countyId)!
  const brief = useMemo(() => buildBrief(county, radarCancer), [county, radarCancer])

  // the actions plan is sized for one county's volumes: start fresh when the county changes
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN)
  useEffect(() => { setPlan(EMPTY_PLAN) }, [countyId])
  const sr = screeningById(countyId)!
  const res = useMemo(() => evaluate(sr, plan), [sr, plan])
  const { briefing, write, busy, aiOn } = useAiBriefing(sr, plan, res)
  const [sheet, setSheet] = useState(false)

  const tp: TabProps = {
    countyId,
    cancer,
    setCancer: (c) => setParam({ cancer: c, rc: c }),
    radarCancer,
    setRadarCancer: (c) => setParam(isCoreCancer(c) ? { rc: c, cancer: c } : { rc: c }),
    select: (id) => setParam({ c: id }),
    openBrief,
  }

  if (legacyBrief) return <Navigate to={`/county?${q}`} replace />

  return (
    <div className="county-root px-4 sm:px-6 lg:px-10 pb-16 max-w-[1400px] overflow-x-clip">
      <CountyStyles />

      {/* sticky picker + tabs */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 pb-3 bg-paper/95 backdrop-blur-sm border-b border-stone/60">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <Picker label="County" value={countyId} onChange={(v) => tp.select(v)} options={COUNTIES}
              className="font-serif text-2xl sm:text-3xl italic py-0.5 max-w-[78vw] sm:max-w-none" />
          </div>
          {!(tab === 'actions' && programme !== 'bowel') && <button onClick={() => (tab === 'actions' ? setSheet(true) : window.print())}
            className="font-type text-[15px] uppercase tracking-widest flex items-center gap-2 rounded-full bg-ink text-paper pl-4 pr-1.5 py-1.5 hover:bg-terra transition-colors">
            {tab === 'actions' ? 'One-page plan' : 'Print brief'} <span className="w-6 h-6 rounded-full bg-mustard text-ink flex items-center justify-center">↓</span>
          </button>}
        </div>
        <Tabs className="mt-3" tabs={TABS} value={tab} onChange={(t) => setParam({ tab: t })} />
        {tab === 'actions' && <div className="mt-3"><Seg items={PROGRAMMES} value={programme} onChange={(p) => setParam({ sc: p })} /></div>}
        {tab === 'brief' && <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto"><Seg className="!flex-nowrap whitespace-nowrap" items={RADAR_CANCERS} value={radarCancer} onChange={tp.setRadarCancer} /></div>}
      </div>

      <div className="mt-8 min-w-0 relative z-10" key={tab}>
        <div className="rise" key={tab === 'radar' ? tab : tab + countyId + radarCancer + programme}>
          {tab === 'actions' && <Actions countyId={countyId} plan={plan} setPlan={setPlan} programme={programme} />}
          {tab === 'brief' && <Brief brief={brief} county={county} page />}
          {tab === 'radar' && <Radar {...tp} />}
        </div>
      </div>

      <Drawer open={sheet && tab === 'actions' && programme === 'bowel'} onClose={() => setSheet(false)} label="One-page plan">
        <div className="p-6 pt-16">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
            <Label>Preview · one printable page</Label>
            <div className="flex items-center gap-2">
              <Btn type="button" variant="ghost" disabled={busy || aiOn === false} aria-busy={busy}
                onClick={() => void write()}
                title={aiOn === false ? 'Start the server with LLM_KEY to use AI' : undefined}
                className="whitespace-nowrap min-w-[13.5rem] justify-center">
                {busy ? <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" />Writing briefing…</span>
                  : briefing.source === 'ai' ? 'Rewrite with AI' : 'Write briefing with AI'}
              </Btn>
              <Btn onClick={() => window.print()}>Print</Btn>
            </div>
          </div>
          {aiOn === false && <p className="font-sans text-[13px] opacity-60 mb-3">AI is off on this server, so the briefing comes from a template. The numbers are the same either way.</p>}
          <div className="border border-black/15 rounded-lg p-4 bg-paper shadow-inner">
            <ActionSheet r={sr} plan={plan} res={res} briefing={briefing} />
          </div>
        </div>
      </Drawer>

      {createPortal(
        <div id="county-print">{tab === 'actions' ? <ActionSheet r={sr} plan={plan} res={res} briefing={briefing} /> : <Brief brief={brief} county={county} print />}</div>,
        document.body,
      )}
    </div>
  )
}
