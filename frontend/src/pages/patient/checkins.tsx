// Caring check-ins (spec 1.6): the app reaches out when a check-in is due, the answer becomes a
// diary entry (source 'checkin'). Off until the person switches it on; more often for high risk or a
// worrying symptom; optional browser notification behind its own switch. Uses only the diary, never registers.
import { useEffect, useState } from 'react'
import { Card, Chip, Label, RoundBtn, cx, toast } from '../../components/ui'
import { daysBetween, today, DAY } from '../../data/pathway'
import { useStore, type Checkins } from '../../lib/store'
import { answerCheckin, CHECKIN_CHIPS, checkinQuestion, msgText, simulateCheckin } from './chat'
import { checkinDueAt, checkinIsDue, checkinRecommended, nextCheckin } from './logic'
import { tr, useT, type Key } from './i18n'
import { ArrowIcon } from './bits'

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window

/** Runs once on the patient page: starts the clock, keeps the frequency on the recommendation, fires notifications. */
export function useCheckinEngine() {
  const c = useStore((s) => s.checkins)
  const diary = useStore((s) => s.diary)
  const profile = useStore((s) => s.profile)
  const check = useStore((s) => s.check)
  const lang = useStore((s) => s.lang)
  const set = useStore((s) => s.set)
  const [now, setNow] = useState(() => Date.now())
  const upd = (p: Partial<Checkins>) => set((s) => ({ checkins: { ...s.checkins, ...p } }))

  // re-check every minute while the page is open
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // switched on without a start time (older saved state): start counting from now
  useEffect(() => { if (c.enabled && !c.lastAt) upd({ lastAt: new Date().toISOString() }) }, [c.enabled, c.lastAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // frequency follows the recommendation unless the person picked their own
  const rec = checkinRecommended({ profile, check, diary }).every
  useEffect(() => { if (c.enabled && c.auto !== false && c.everyDays !== rec) upd({ everyDays: rec }) }, [c.enabled, c.auto, c.everyDays, rec]) // eslint-disable-line react-hooks/exhaustive-deps

  // one browser notification per due check-in, only if the person switched it on and the browser allows it
  useEffect(() => {
    const due = checkinDueAt(c)
    if (!c.notify || !due || due > new Date(now).toISOString() || c.notifiedFor === due) return
    if (!canNotify() || Notification.permission !== 'granted') return
    try {
      const n = new Notification(tr(lang, 'ci.notifTitle'), { body: msgText(lang, checkinQuestion(false).msg), tag: 'ajoissa-checkin' })
      n.onclick = () => { window.focus(); window.location.hash = '#/patient'; n.close() }
    } catch { /* some browsers only allow notifications from a service worker */ }
    upd({ notifiedFor: due })
  }, [now, c, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return now
}

/** The check-in itself, shown on Today and Diary when one is due. */
export function CheckinPrompt({ className }: { className?: string }) {
  const { t, lang } = useT()
  const c = useStore((s) => s.checkins)
  const diary = useStore((s) => s.diary)
  const set = useStore((s) => s.set)
  const [done, setDone] = useState(false)
  const [txt, setTxt] = useState('')
  if (done) return (
    <Card tone="stone" className={cx('rise p-6 sm:p-7 max-w-2xl', className)}>
      <Label>{t('d.checkin')}</Label>
      <p className="font-serif text-2xl sm:text-3xl leading-tight mt-2">{t('bot.thanks')}</p>
    </Card>
  )
  if (!checkinIsDue(c)) return null
  void diary // re-render when the diary changes so the question names the latest symptom
  const { msg } = checkinQuestion(false)
  const answer = (value: string | null, label: string) => { answerCheckin(value, label); setDone(true) }
  const snooze = () => {
    set((s) => ({ checkins: { ...s.checkins, snoozedUntil: new Date(Date.now() + DAY).toISOString() } }))
    toast(t('ci.snoozed'))
  }
  const hasSymptom = msg.key === 'bot.checkin'
  return (
    <Card tone="mustard" tilt={-0.8} className={cx('rise p-6 sm:p-8 max-w-2xl', className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-terra inline-block" aria-hidden />{t('d.checkin')} · {t('ci.now')}</Label>
        <button onClick={snooze} className="font-type text-sm uppercase tracking-widest opacity-70 hover:opacity-100 underline underline-offset-4 decoration-dashed">{t('ci.notNow')}</button>
      </div>
      <p className="font-serif text-3xl sm:text-4xl leading-[1.1] mt-3" lang={lang}>{msgText(lang, msg)}</p>
      {hasSymptom && (
        <div className="flex flex-wrap gap-2 mt-5">
          {CHECKIN_CHIPS.map((ch) => (
            <Chip key={ch.value} onClick={() => answer(ch.value, t(ch.key as Key))} className="!border-ink/40 bg-paper/40 hover:bg-ink hover:text-paper">{t(ch.key as Key)}</Chip>
          ))}
        </div>
      )}
      <form className="mt-4 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); const v = txt.trim(); if (v) answer(null, v) }}>
        <label htmlFor="ci-text" className="sr-only">{t('ci.orType')}</label>
        <input id="ci-text" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={t('ci.orType')}
          className="flex-1 min-w-0 bg-transparent border-b-2 border-ink/25 py-2 font-serif text-xl italic outline-none focus:border-ink placeholder:text-ink/45" />
        <RoundBtn type="submit" title={t('d.send')} className="!w-11 !h-11 shrink-0"><ArrowIcon /></RoundBtn>
      </form>
    </Card>
  )
}

function Switch({ on, onClick, label, light }: { on: boolean; onClick: () => void; label: string; light?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={cx('w-11 h-6 rounded-full relative transition-colors shrink-0', on ? 'bg-mustard' : light ? 'bg-paper/25' : 'bg-black/20')}>
      <span className={cx('absolute top-0.5 w-5 h-5 rounded-full bg-paper shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

/** Settings card: on/off, how often (recommended dot), browser notification, demo trigger. */
export function CheckinCard({ onSimulate }: { onSimulate?: () => void }) {
  const { t, d } = useT()
  const checkins = useStore((s) => s.checkins)
  const diary = useStore((s) => s.diary)
  const profile = useStore((s) => s.profile)
  const check = useStore((s) => s.check)
  const set = useStore((s) => s.set)
  const rec = checkinRecommended({ profile, check, diary })
  const due = checkinIsDue(checkins)
  const nextIso = checkins.lastAt ? (checkinDueAt(checkins) ?? nextCheckin(checkins)) : nextCheckin(checkins)
  const nextIn = daysBetween(today(), nextIso.slice(0, 10))
  const upd = (p: Partial<Checkins>) => set((s) => ({ checkins: { ...s.checkins, ...p } }))
  const toggle = () => upd(checkins.enabled
    ? { enabled: false, notify: false }
    : { enabled: true, everyDays: rec.every, auto: true, lastAt: new Date().toISOString(), snoozedUntil: undefined })
  const toggleNotify = async () => {
    if (checkins.notify) return upd({ notify: false })
    if (!canNotify()) return toast(t('ci.notifyNA'))
    let perm: NotificationPermission = Notification.permission
    try { if (perm === 'default') perm = await Notification.requestPermission() } catch { perm = 'denied' }
    if (perm !== 'granted') return toast(t('ci.notifyDenied'))
    upd({ notify: true })
    toast(t('m.saved'))
  }
  return (
    <Card tone="ink" tilt={1} className="p-6">
      <div className="flex items-center justify-between gap-3">
        <Label className="!opacity-70">{t('ci.title')}</Label>
        <Switch on={checkins.enabled} onClick={toggle} label={t('ci.title')} light />
      </div>
      {!checkins.enabled && <p className="font-serif italic text-xl leading-snug mt-3 opacity-80">{t('ci.off')}</p>}
      <div className={cx('transition-opacity', !checkins.enabled && 'opacity-35')}>
        <div className="mt-4">
          <p className="font-serif text-4xl leading-none">{checkins.enabled ? (due ? t('ci.now') : d(nextIso, { weekday: 'short', day: 'numeric', month: 'short' })) : '—'}</p>
          {checkins.enabled && !due && <p className="font-type text-sm uppercase tracking-widest text-mustard mt-1">{nextIn <= 0 ? t('ago.today') : `+${nextIn} d`}</p>}
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={t('ci.every')}>
          <span className="font-type text-sm uppercase tracking-widest opacity-60 mr-1">{t('ci.every')}</span>
          {[3, 7, 14].map((n) => (
            <button key={n} role="radio" aria-checked={checkins.everyDays === n} disabled={!checkins.enabled}
              onClick={() => upd({ everyDays: n, auto: n === rec.every })}
              className={cx('relative font-type text-sm px-3 py-1.5 rounded-full border transition-colors',
                checkins.everyDays === n ? 'bg-mustard text-ink border-mustard' : 'border-paper/30 hover:border-paper')}>
              {t('ci.days', { n })}
              {n === rec.every && <span title={t('ci.rec')} className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-terra border border-ink" />}
            </button>
          ))}
        </div>
        {checkins.enabled && rec.why && (
          <p className="font-type text-sm leading-snug mt-3 opacity-80"><span className="inline-block w-2 h-2 rounded-full bg-terra mr-2 align-middle" aria-hidden />{t(rec.why === 'symptom' ? 'ci.whySymptom' : 'ci.whyRisk')}</p>
        )}
        <div className="mt-5 pt-4 border-t border-paper/15 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">{t('ci.notify')}</p>
            <p className="font-type text-sm opacity-60 leading-snug">{t('ci.notifySub')}</p>
          </div>
          <Switch on={!!checkins.notify} onClick={() => { if (checkins.enabled) void toggleNotify() }} label={t('ci.notify')} light />
        </div>
      </div>
      <p className="font-type text-sm opacity-60 leading-snug mt-4">{t('ci.only')}</p>
      <button onClick={() => { simulateCheckin(); onSimulate?.() }}
        className="mt-4 font-type text-sm uppercase tracking-widest opacity-70 hover:opacity-100 hover:text-mustard underline underline-offset-4 decoration-dashed">{t('ci.simulate')}</button>
    </Card>
  )
}
