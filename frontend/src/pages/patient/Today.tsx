import { useState, type ReactNode } from 'react'
import { Card, Label, RoundBtn, cx } from '../../components/ui'
import { pathwayStatus, today } from '../../data/pathway'
import { useStore } from '../../lib/store'
import { assess, byUrgency, checkinDueAt, checkinIsDue, nextCheckin, nextSteps } from './logic'
import { CheckinPrompt } from './checkins'
import { send } from './chat'
import { useT } from './i18n'
import { ArrowIcon, Clock, Tag } from './bits'
import { LEVEL_TAG } from './Check'

export type TabId = 'today' | 'diary' | 'pathway' | 'check' | 'settings'

/** Whole card opens its tab; the label names it, the corner arrow is the keyboard target. */
function Tile({ tone, tilt, label, onOpen, children, className }: { tone: 'paper' | 'mustard' | 'terra' | 'stone' | 'ink'; tilt: number; label: string; onOpen: () => void; children: ReactNode; className?: string }) {
  return (
    <Card tone={tone} tilt={tilt} onClick={onOpen} className={cx('p-6 sm:p-7 flex flex-col hover:!rotate-0', className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="!opacity-70">{label}</Label>
        <button onClick={(e) => { e.stopPropagation(); onOpen() }} aria-label={label}
          className="w-8 h-8 -mr-2 -mt-1 rounded-full flex items-center justify-center opacity-60 hover:opacity-100">
          <span aria-hidden>→</span>
        </button>
      </div>
      <div className="flex-1 flex flex-col mt-2">{children}</div>
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
  const nextCheck = s.checkins.enabled ? (checkinDueAt(s.checkins) ?? nextCheckin(s.checkins)) : null
  const checkDue = checkinIsDue(s.checkins)
  const steps = byUrgency(nextSteps(s))
  const checked = steps.some((x) => x.level !== 'unknown')
  const urgent = steps[0] && (steps[0].level === 'doctor' || steps[0].level === 'act')
  const shared = s.sharing.hospital || s.sharing.stats

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

      <CheckinPrompt />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-8">
        {/* symptoms: the message is the headline */}
        <Tile tone={flag ? 'terra' : 'paper'} tilt={-1.2} label={t('tab.diary')} onOpen={() => go('diary')} className="lg:col-span-3">
          <p className="font-serif text-4xl sm:text-5xl leading-[1.05]">{flag ? t('d.flag') : s.diary.length ? t('d.noflag') : t('d.empty')}</p>
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto pt-6">
              {reasons.slice(0, 4).map((r) => (
                <span key={r.tag} className={cx('font-type text-sm uppercase tracking-wider px-2 py-0.5 rounded-full', r.red ? 'bg-paper text-terra' : 'border border-paper/50')}>
                  {t(`sym.${r.tag}`)}
                </span>
              ))}
            </div>
          )}
        </Tile>

        {/* pathway: what you wait for, and whether it's late */}
        <Tile tone={overdue ? 'terra' : started && st.next ? 'mustard' : 'paper'} tilt={1} label={t('tab.pathway')} onOpen={() => go('pathway')} className="lg:col-span-3">
          <div className="flex items-center gap-5">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-4xl sm:text-5xl leading-[1.05]">{started ? (st.next ? t(`step.${st.next.id}`) : t('p.done')) : t('m.notStarted')}</p>
              {started && st.next && (
                <p className="font-type text-sm uppercase tracking-widest mt-3">
                  {overdue ? t('p.overdue', { n: st.overdueBy }) : t('p.ontime')}
                </p>
              )}
            </div>
            {started && <Clock dates={s.pathway.dates} size={96} dark={overdue}>
              {st.next && <span className="font-serif text-3xl leading-none">{st.waited}<span className="font-type text-sm ml-0.5">d</span></span>}
            </Clock>}
          </div>
        </Tile>

        {/* screening: one row per programme */}
        <Tile tone={urgent ? 'stone' : 'paper'} tilt={-0.6} label={t('tab.check')} onOpen={() => go('check')} className="lg:col-span-2">
          {checked ? (
            <div className="space-y-2">
              {steps.map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-3 border-b border-black/10 pb-2 last:border-0">
                  <span className="font-serif text-2xl">{t(`prog.${x.id}`)}</span>
                  <Tag tone={LEVEL_TAG[x.level]}>{t(x.short)}</Tag>
                </div>
              ))}
            </div>
          ) : <p className="font-serif italic text-2xl leading-tight">{t('ck.needAge')}</p>}
        </Tile>

        <Tile tone="ink" tilt={1.2} label={t('ci.title')} onOpen={() => go('diary')} className="lg:col-span-2">
          <p className="font-serif text-4xl leading-none">{checkDue ? t('ci.now') : nextCheck ? d(nextCheck, { weekday: 'short', day: 'numeric', month: 'short' }) : t('pr.off')}</p>
          {nextCheck && <p className="font-type text-sm uppercase tracking-widest text-mustard mt-3">{t('ci.every')} {t('ci.days', { n: s.checkins.everyDays })}</p>}
        </Tile>

        <Tile tone="paper" tilt={0.6} label={t('tab.settings')} onOpen={() => go('settings')} className="lg:col-span-2">
          <p className="font-serif text-4xl leading-none">{shared ? t('pr.sharing') : t('pr.private')}</p>
          {shared && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {s.sharing.hospital && <Tag tone="ink">{t('pr.hospital')}</Tag>}
              {s.sharing.stats && <Tag>{t('pr.stats')}</Tag>}
            </div>
          )}
        </Tile>
      </div>
    </div>
  )
}
