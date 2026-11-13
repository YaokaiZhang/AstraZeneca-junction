import { useState, type ReactNode } from 'react'
import { Card, EdgeText, Label, RoundBtn, Stamp, cx } from '../../components/ui'
import { pathwayStatus, daysBetween, today } from '../../data/pathway'
import { useStore } from '../../lib/store'
import { assess, firstSeen, nextCheckin, PLCO_THRESHOLD } from './logic'
import { send } from './chat'
import { useT } from './i18n'
import { ArrowIcon, Clock, Gauge, Tag } from './bits'
import { invitedTo } from './Screening'

export type TabId = 'today' | 'diary' | 'risk' | 'pathway' | 'screening' | 'settings'

function Tile({ tone, tilt, onOpen, children, className, edge }: { tone: 'paper' | 'mustard' | 'terra' | 'stone' | 'ink'; tilt: number; onOpen: () => void; children: ReactNode; className?: string; edge?: string }) {
  const { t } = useT()
  return (
    <Card tone={tone} tilt={tilt} onClick={onOpen} className={cx('p-6 flex flex-col hover:!rotate-0', edge && 'pl-11', className)}>
      {edge && <EdgeText>{edge}</EdgeText>}
      <div className="flex-1 flex flex-col">{children}</div>
      <div className={cx('tear mt-5 pt-3 flex justify-between items-center', (tone === 'ink' || tone === 'terra') && '!border-paper/25')}>
        <button onClick={(e) => { e.stopPropagation(); onOpen() }} className="font-type text-[10px] uppercase tracking-widest hover:underline">{t('m.open')}</button>
        <span aria-hidden>→</span>
      </div>
    </Card>
  )
}

export default function Today({ go }: { go: (t: TabId) => void }) {
  const { t, d } = useT()
  const s = useStore()
  const [txt, setTxt] = useState('')
  const now = today()
  const st = pathwayStatus(s.pathway.dates, now)
  const started = st.lastDone >= 0
  const overdue = started && !!st.next && st.overdueBy > 0
  const { flag, reasons } = assess(s.diary)
  const symCount = Object.keys(firstSeen(s.diary)).filter((k) => k !== 'smoking').length
  const last = [...s.diary].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const high = !!s.risk && s.risk.prob6y >= PLCO_THRESHOLD
  const nextCheck = s.checkins.enabled ? nextCheckin(s.checkins) : null
  const invited = invitedTo(s.profile.age, s.profile.sex)

  return (
    <div className="space-y-10">
      {/* quick log */}
      <form onSubmit={(e) => { e.preventDefault(); if (txt.trim()) { send(txt.trim()); setTxt(''); go('diary') } }}
        className="flex items-end gap-3 max-w-2xl">
        <label htmlFor="quick" className="sr-only">{t('d.placeholder')}</label>
        <input id="quick" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={t('d.placeholder')}
          className="flex-1 min-w-0 border-b-2 border-black/20 py-2 font-serif text-2xl sm:text-3xl italic outline-none focus:border-terra placeholder:text-black/30" />
        <RoundBtn type="submit" title={t('d.send')} className="shrink-0"><ArrowIcon /></RoundBtn>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-8">
        <Tile tone={overdue ? 'terra' : started ? 'mustard' : 'paper'} tilt={-1.5} onOpen={() => go('pathway')} edge={t('tab.pathway')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Label className="!opacity-80">{st.next && started ? t('p.next') : t('tab.pathway')}</Label>
              <p className="font-serif text-3xl leading-tight mt-1">{started ? (st.next ? t(`step.${st.next.id}`) : t('p.done')) : t('m.notStarted')}</p>
            </div>
            {started && st.next && <Stamp tone={overdue ? 'paper' : 'ink'} rotate={-12} className="!w-20 !h-20">{overdue ? t('p.overdue', { n: st.overdueBy }) : t('p.ontime')}</Stamp>}
          </div>
          <div className="mt-4 flex items-center gap-5">
            <Clock dates={s.pathway.dates} size={120} dark={overdue}>
              <span className="font-serif text-4xl leading-none">{started ? daysBetween(s.pathway.dates.gp!, now) : '—'}</span>
            </Clock>
            {started && st.next && (
              <div>
                <p className="font-serif text-5xl leading-none">{st.waited}<span className="font-type text-xs ml-1">d</span></p>
                <p className="font-type text-[10px] uppercase tracking-widest mt-1 opacity-80">{t('p.target', { n: st.next.targetDays ?? 0 })}</p>
              </div>
            )}
          </div>
        </Tile>

        <Tile tone={flag ? 'stone' : 'paper'} tilt={1.2} onOpen={() => go('diary')} edge={t('tab.diary')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Label>{t('d.symptoms')}</Label>
              <p className="font-serif text-6xl leading-none mt-1">{symCount}</p>
            </div>
            <Stamp tone={flag ? 'terra' : 'ink'} rotate={8}>{flag ? t('d.flag') : t('d.noflag')}</Stamp>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {reasons.slice(0, 4).map((r) => <Tag key={r.tag} tone={r.red ? 'terra' : 'line'}>{t(`sym.${r.tag}`)}{!r.red && ` · ${r.days} d`}</Tag>)}
          </div>
          {last && <p className="font-serif italic text-lg leading-snug mt-auto pt-4 line-clamp-2"><span className="font-type not-italic text-[10px] opacity-60 mr-2">{d(last.date)}</span>{last.text}</p>}
        </Tile>

        <Tile tone={high ? 'terra' : 'paper'} tilt={-0.8} onOpen={() => go('risk')} edge={t('tab.risk')}>
          <Label className="!opacity-80">{t('r.sixYear')}</Label>
          {s.risk ? (
            <div className="flex items-end gap-4 mt-2">
              <div className="w-36 shrink-0"><Gauge p={s.risk.prob6y} dark={high} /></div>
              <p className="font-serif text-5xl leading-none">{(s.risk.prob6y * 100).toFixed(2)}<span className="font-type text-sm ml-1">%</span></p>
            </div>
          ) : <p className="font-serif italic text-3xl mt-2 opacity-60">{t('m.notChecked')}</p>}
          {s.risk && <p className="font-type text-[10px] uppercase tracking-widest mt-3">{high ? t('r.stampHigh') : t('r.stampLow')}</p>}
        </Tile>

        <Tile tone="ink" tilt={1.5} onOpen={() => go('diary')} edge={t('ci.title')}>
          <Label className="!opacity-70">{t('ci.next')}</Label>
          <p className="font-serif text-4xl leading-none mt-2">{nextCheck ? d(nextCheck, { weekday: 'short', day: 'numeric', month: 'short' }) : t('pr.off')}</p>
          {s.checkins.enabled && <p className="font-type text-[10px] uppercase tracking-widest text-mustard mt-2">{t('ci.every')} {t('ci.days', { n: s.checkins.everyDays })}</p>}
        </Tile>

        <Tile tone="stone" tilt={-1.2} onOpen={() => go('screening')} edge={t('tab.screening')}>
          <Label>{t('s.invited')}</Label>
          {s.profile.age ? (
            <div className="mt-3 space-y-2">
              {invited.length ? invited.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="font-serif text-2xl">{t(`prog.${p.id}`)}</span>
                  {s.screening[p.id] ? <Tag tone={s.screening[p.id] === 'yes' ? 'ink' : 'terra'}>{t(s.screening[p.id] === 'yes' ? 'c.yes' : s.screening[p.id] === 'kit' ? 's.a.kit' : s.screening[p.id] === 'no' ? 'c.no' : 's.a.unsure')}</Tag> : <span className="w-2.5 h-2.5 rounded-full bg-terra" />}
                </div>
              )) : <p className="font-serif italic text-2xl opacity-60">—</p>}
            </div>
          ) : <p className="font-serif italic text-2xl mt-2 opacity-60">{t('s.ageFirst')}</p>}
        </Tile>

        <Tile tone="paper" tilt={0.8} onOpen={() => go('settings')} edge={t('tab.settings')}>
          <Label>{t('pr.hospital')}</Label>
          <p className="font-serif text-4xl mt-1">{s.sharing.hospital ? t('pr.on') : t('pr.off')}</p>
          <Label className="mt-3">{t('pr.stats')}</Label>
          <p className="font-serif text-4xl mt-1">{s.sharing.stats ? t('pr.on') : t('pr.off')}</p>
        </Tile>
      </div>
    </div>
  )
}
