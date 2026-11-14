import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Card, Chip, Display, Label, RoundBtn, Tabs, cx, toast } from '../../components/ui'
import { PATHWAY, daysBetween, pathwayStatus, today } from '../../data/pathway'
import { useStore } from '../../lib/store'
import { aiActive, checkAi, msgText, send, useAi, useChat, type Msg } from './chat'
import { assess, firstSeen, nextSteps, packYears, parseKg } from './logic'
import { split2, useT, type Key } from './i18n'
import { ArrowIcon, Tag, copyText } from './bits'
import { CheckinCard, CheckinPrompt } from './checkins'

type Sub = 'chat' | 'timeline' | 'summary'

export default function Diary() {
  const { t } = useT()
  const [sub, setSub] = useState<Sub>('chat')
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-8 xl:gap-10 items-start">
      <div className="min-w-0">
        <Tabs className="mb-5" value={sub} onChange={setSub}
          tabs={[{ id: 'chat', label: t('d.chat') }, { id: 'timeline', label: t('d.timeline') }, { id: 'summary', label: t('d.summary') }]} />
        <CheckinPrompt className="mb-6 !max-w-none" />
        {sub === 'chat' && <ChatView />}
        {sub === 'timeline' && <Timeline />}
        {sub === 'summary' && <Summary />}
      </div>
      <div className="space-y-6 xl:pt-10">
        <FlagCard />
        <CheckinCard onSimulate={() => setSub('chat')} />
      </div>
    </div>
  )
}

// ---------------- chat ----------------
export function useMsgText() {
  const { lang } = useT()
  return (m: Msg) => msgText(lang, m)
}

function ChatView() {
  const { t } = useT()
  const msgs = useChat((s) => s.msgs)
  const text = useMsgText()
  const [txt, setTxt] = useState('')
  const [date, setDate] = useState(today())
  const box = useRef<HTMLDivElement>(null)
  const server = useAi((s) => s.server)
  const busy = useAi((s) => s.busy)
  const aiOn = aiActive(server, useStore((s) => s.aiChat))
  useEffect(() => { void checkAi() }, [])
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [msgs.length, busy])
  const last = msgs[msgs.length - 1]
  const submit = () => { const v = txt.trim(); if (!v || busy) return; send(v); setTxt('') }

  return (
    <Card tone="paper" className="flex flex-col h-[560px] sm:h-[600px]">
      <div ref={box} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={cx('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[85%] rise',
              m.from === 'me' ? 'bg-ink text-paper rounded-2xl rounded-br-sm px-4 py-2.5 font-sans text-[15px]' : 'font-serif text-xl leading-snug pr-4')}>
              {m.from === 'bot' && m.key === 'bot.checkin' && <span className="label block !opacity-80 text-terra mb-1">{t('d.checkin')}</span>}
              {m.ai && <span className="label block !opacity-60 mb-0.5">✦ {t('ai.label')}</span>}
              {text(m)}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" role="status">
            <div className="font-serif italic text-xl leading-snug opacity-60 animate-pulse">
              <span className="label block !opacity-80 not-italic mb-0.5">✦ {t('ai.label')}</span>
              {t('ai.typing')}
            </div>
          </div>
        )}
        {!busy && last?.from === 'bot' && (last.chips?.length || last.datePicker) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {last.chips?.map((c) => <Chip key={c.value} onClick={() => send(t(c.key as Key), c.value)}>{t(c.key as Key)}</Chip>)}
            {last.datePicker && (
              <span className="inline-flex items-center gap-1 border border-black/20 rounded-full pl-3 pr-1 py-0.5">
                <label className="sr-only" htmlFor="chat-date">{t('d.pickDate')}</label>
                <input id="chat-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="font-type text-sm outline-none" />
                <button onClick={() => date && send(date, date)} className="font-type text-sm bg-ink text-paper rounded-full px-2.5 py-1">OK</button>
              </span>
            )}
          </div>
        )}
      </div>
      {aiOn && <p className="px-4 sm:px-6 pt-2 font-type text-sm leading-snug opacity-70">✦ {t('ai.note')}</p>}
      <form className="tear flex items-end gap-3 p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label htmlFor="chat-input" className="sr-only">{t('d.placeholder')}</label>
        <textarea id="chat-input" rows={1} value={txt} onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={t('d.placeholder')}
          className="flex-1 min-w-0 resize-none border-b border-black/20 py-2 font-serif text-xl outline-none focus:border-terra placeholder:text-black/30 placeholder:italic" />
        <RoundBtn type="submit" title={t('d.send')} disabled={busy} className="!w-12 !h-12 shrink-0 disabled:opacity-40"><ArrowIcon /></RoundBtn>
      </form>
    </Card>
  )
}

// ---------------- flag + check-ins ----------------
function FlagCard() {
  const { t } = useT()
  const diary = useStore((s) => s.diary)
  const { flag, reasons } = useMemo(() => assess(diary), [diary])
  return (
    <Card tone={flag ? 'terra' : 'stone'} tilt={flag ? -1.5 : 0} className="p-6">
      <p className="font-serif text-3xl leading-tight">{flag ? t('d.flag') : diary.length ? t('d.noflag') : t('d.empty')}</p>
      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {reasons.map((r) => (
            <span key={r.tag} className={cx('font-type text-sm uppercase tracking-wider px-2 py-0.5 rounded-full', r.red ? 'bg-paper text-terra' : 'border border-paper/50')}>
              {t(`sym.${r.tag}`)}{!r.red && ` · ${r.days} d`}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export { CheckinCard } from './checkins'

// ---------------- timeline ----------------
function Timeline() {
  const { t, d } = useT()
  const diary = useStore((s) => s.diary)
  const set = useStore((s) => s.set)
  const now = today()
  const sorted = [...diary].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  if (!diary.length) return <Card tone="stone" className="p-10 text-center font-serif italic text-2xl">{t('d.empty')}</Card>
  const first = firstSeen(diary)
  const start = [...Object.values(first), now].sort()[0]
  const span = Math.max(14, daysBetween(start, now))
  const x = (iso: string) => `${(daysBetween(start, iso) / span) * 100}%`
  const rows = Object.keys(first).sort((a, b) => first[a].localeCompare(first[b]))
  const ticks = Array.from({ length: 5 }, (_, i) => new Date(new Date(start).getTime() + (span * i / 4) * 86_400_000).toISOString().slice(0, 10))

  return (
    <div className="space-y-6">
      <Card tone="paper" className="p-5 sm:p-6">
        <div className="space-y-3">
          {rows.map((tag) => {
            const dates = diary.filter((e) => e.tags.includes(tag)).map((e) => e.date).sort()
            const red = ['blood-cough', 'blood-stool', 'blood', 'jaundice', 'weight-loss'].includes(tag)
            return (
              <div key={tag} className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
                <span className="font-type text-sm sm:text-[15px] uppercase tracking-wider truncate" title={t(`sym.${tag}`)}>{t(`sym.${tag}`)}</span>
                <div className="relative h-5">
                  <div className="absolute inset-y-[9px] left-0 right-0 bg-black/5 rounded" />
                  <div className={cx('absolute inset-y-[7px] rounded', red ? 'bg-terra/40' : 'bg-mustard/70')} style={{ left: x(dates[0]), right: 0 }} />
                  {dates.map((dt, i) => (
                    <span key={i} title={d(dt)} className={cx('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-paper', red ? 'bg-terra' : 'bg-ink')} style={{ left: x(dt) }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)] gap-3 mt-3">
          <span />
          <div className="relative h-4 border-t border-black/15">
            {ticks.map((tk, i) => (
              <span key={i} className={cx('absolute top-1 font-type text-sm opacity-60 whitespace-nowrap', i === 0 ? '' : i === 4 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${i * 25}%` }}>{d(tk)}</span>
            ))}
          </div>
        </div>
      </Card>

      <ol className="relative border-l-2 border-dashed border-black/15 ml-2 space-y-4">
        {sorted.map((e) => (
          <li key={e.id} className="pl-5 relative group">
            <span className={cx('absolute -left-[7px] top-2 w-3 h-3 rounded-full', e.source === 'checkin' ? 'bg-mustard border border-ink' : 'bg-ink')} />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-type text-sm uppercase tracking-widest">{d(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="font-type text-sm opacity-70">{daysBetween(e.date, now)} d</span>
              {e.source === 'checkin' && <Tag tone="mustard">{t('d.checkin')}</Tag>}
              {e.tags.map((g) => <Tag key={g}>{t(`sym.${g}`)}</Tag>)}
              <button onClick={() => set((s) => ({ diary: s.diary.filter((x) => x.id !== e.id) }))}
                aria-label={t('d.delete')} title={t('d.delete')}
                className="ml-auto font-type text-sm opacity-30 hover:opacity-100 hover:text-terra px-2">✕</button>
            </div>
            <p className="font-serif text-lg leading-snug mt-1">{e.text}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------- printable summary ----------------
const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  body * { visibility: hidden !important; }
  #patient-summary, #patient-summary * { visibility: visible !important; }
  html, body { background: #fff !important; height: 100% !important; overflow: hidden !important; }
  body *::before, body *::after { visibility: hidden !important; box-shadow: none !important; }
  body * { box-shadow: none !important; background-image: none !important; }
  .rise { animation: none !important; transform: none !important; }
  #patient-summary { position: fixed !important; left: 0; top: 0; width: 100% !important; background: #fff; padding: 0 !important; }
  #patient-summary * { color: #1F1F1F !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #patient-summary .no-print { display: none !important; }
}`

function Summary() {
  const { t, d, lang } = useT()
  const diary = useStore((s) => s.diary)
  const risk = useStore((s) => s.risk)
  const pathway = useStore((s) => s.pathway)
  const profile = useStore((s) => s.profile)
  const check = useStore((s) => s.check)
  const steps = nextSteps({ profile, check, diary }).filter((x) => x.applies && x.level !== 'unknown')
  const now = today()
  const first = firstSeen(diary)
  const { flag, reasons } = assess(diary)
  const kg = diary.filter((e) => e.tags.includes('weight-loss')).map((e) => parseKg(e.text)).find((x) => x !== null)
  const smoke = useChat((s) => s.smoke)
  const py = risk ? packYears(risk.inputs.cigsPerDay, risk.inputs.yearsSmoked) : packYears(smoke.cpd, smoke.years)
  const h = split2(t('h.summary'))
  const symptoms = Object.keys(first).filter((k) => k !== 'smoking').sort((a, b) => first[a].localeCompare(first[b]))
  const maxDays = Math.max(1, ...symptoms.map((k) => daysBetween(first[k], now)))
  const sharing = useStore((s) => s.sharing)
  const set = useStore((s) => s.set)
  const ps = pathwayStatus(pathway.dates, now)
  const waitingFor = ps.lastDone >= 0 && ps.next ? ps.next : null
  const pathLines = PATHWAY.filter((s) => pathway.dates[s.id])
  const sentAt = sharing.hospital ? (sharing.summaryAt ?? sharing.at) : undefined

  // one tap = explicit, timestamped opt-in (spec: sharing is opt-in, each time)
  const sendToCentre = () => {
    const at = new Date().toISOString()
    set((s) => ({ sharing: { ...s.sharing, hospital: true, at: s.sharing.hospital && s.sharing.at ? s.sharing.at : at, summaryAt: at } }))
    toast(t('d.sent'))
  }
  const stopSharing = () => { set((s) => ({ sharing: { ...s.sharing, hospital: false, at: new Date().toISOString(), summaryAt: undefined } })); toast(t('pr.off')) }

  const asText = () => {
    const L: string[] = []
    const long = { day: 'numeric', month: 'long', year: 'numeric' } as const
    L.push(`${h.a} ${h.b}`.toUpperCase(), `${t('d.prepared')} ${d(now, long)}${profile.age ? ` · ${t('r.age')} ${profile.age}` : ''}`, '')
    L.push(`>> ${flag ? t('d.flag') : t('d.noflag')}`, '')
    L.push(`${t('d.symptoms')}:`)
    if (symptoms.length) for (const s of symptoms) L.push(`- ${t(`sym.${s}`)}${s === 'weight-loss' && kg ? ` (−${kg} kg)` : ''} · ${t('d.since')} ${d(first[s], long)} · ${daysBetween(first[s], now)} d`)
    else L.push(`- ${t('d.empty')}`)
    if (py) L.push('', `${t('r.packYears')}: ${py}`)
    if (steps.length) { L.push('', `${t('tab.check')}:`); for (const st of steps) L.push(`- ${t(`prog.${st.id}`)}: ${t(st.short)}`) }
    if (pathLines.length) {
      L.push('', `${t('tab.pathway')}:`)
      for (const s of pathLines) L.push(`- ${t(`step.${s.id}`)}: ${d(pathway.dates[s.id], long)}`)
      if (waitingFor) L.push(`- ${t('d.pathwayNow')}: ${t(`step.${waitingFor.id}`)} (${ps.overdueBy > 0 ? t('p.overdue', { n: ps.overdueBy }) : t('p.ontime')})`)
    }
    if (diary.length) { L.push('', `${t('d.notes')}:`); for (const e of [...diary].sort((a, b) => a.date.localeCompare(b.date))) L.push(`${d(e.date)}  ${e.text}`) }
    L.push('', t('d.notDiagnosis'))
    return L.join('\n')
  }

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>
      <Card tone="paper" className="p-6 sm:p-10">
        <div id="patient-summary" lang={lang}>
          <Label>{t('d.prepared')} · {d(now, { day: 'numeric', month: 'long', year: 'numeric' })}{profile.age ? ` · ${t('r.age')} ${profile.age}` : ''}</Label>
          <Display a={h.a} b={h.b} className="mt-3 !text-4xl sm:!text-5xl" />

          {/* the verdict first, with the symptoms behind it */}
          <div className={cx('mt-6 rounded-xl border-l-4 px-5 py-4', flag ? 'border-terra bg-terra/10' : 'border-ink/40 bg-black/[0.04]')}>
            <p className={cx('font-serif text-2xl sm:text-3xl leading-tight', flag && 'text-terra')}>{flag ? t('d.flag') : symptoms.length ? t('d.noflag') : t('d.empty')}</p>
            {reasons.length > 0 && (
              <p className="mt-1.5 font-sans text-base opacity-80">{reasons.map((r) => t(`sym.${r.tag}`)).join(' · ')}</p>
            )}
          </div>

          <div className="mt-8">
            <Label className="mb-3">{t('d.symptoms')}</Label>
            {symptoms.length ? (
              <ul className="space-y-4">
                {symptoms.map((s) => {
                  const days = daysBetween(first[s], now)
                  const hot = reasons.some((r) => r.tag === s)
                  return (
                    <li key={s}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-xl">{t(`sym.${s}`)}{s === 'weight-loss' && kg ? <span className="opacity-70"> · −{kg} kg</span> : null}</span>
                        <span className="font-sans text-base tabular-nums whitespace-nowrap"><b className="font-semibold">{t('d.daysN', { n: days })}</b></span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-black/10 overflow-hidden">
                        <div className={cx('h-full rounded-full', hot ? 'bg-terra' : 'bg-ink/50')} style={{ width: `${Math.max(4, (days / maxDays) * 100)}%` }} />
                      </div>
                      <p className="mt-1 font-sans text-sm opacity-60">{t('d.since')} {d(first[s], { day: 'numeric', month: 'long' })}</p>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="font-serif italic opacity-60">{t('d.empty')}</p>}
          </div>

          {/* facts: one row each, label left, so nothing wraps into a narrow column */}
          <dl className="mt-8 border-t border-black/10">
            <div className="py-4 border-b border-black/10 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:items-baseline">
              <dt><Label>{t('r.smoke')}</Label></dt>
              <dd className="mt-1 sm:mt-0">
                {py ? <span className="font-serif text-2xl leading-none">{py} <span className="font-sans text-base opacity-70">{t('d.packYearsUnit')}</span></span> : <span className="opacity-60">—</span>}
              </dd>
            </div>
            <div className="py-4 border-b border-black/10 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:items-baseline">
              <dt><Label>{t('tab.check')}</Label></dt>
              <dd className="mt-1 sm:mt-0 space-y-1">
                {steps.map((st) => (
                  <p key={st.id} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-serif text-lg w-20">{t(`prog.${st.id}`)}</span>
                    <span className={cx('font-sans text-base', st.level === 'doctor' ? 'text-terra font-semibold' : 'opacity-75')}>{t(st.short)}</span>
                  </p>
                ))}
                {!steps.length && <span className="opacity-60">—</span>}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:items-baseline">
              <dt><Label>{t('tab.pathway')}</Label></dt>
              <dd className="mt-2 sm:mt-0">
                <ol className="relative space-y-1.5 pl-5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-black/20">
                  {pathLines.map((s) => (
                    <li key={s.id} className="relative flex flex-wrap items-baseline gap-x-3">
                      <span className="absolute -left-5 top-[0.55em] w-[11px] h-[11px] rounded-full bg-ink" />
                      <span className="font-serif text-lg">{t(`step.${s.id}`)}</span>
                      <span className="font-sans text-sm opacity-70">{d(pathway.dates[s.id], { day: 'numeric', month: 'long' })}</span>
                    </li>
                  ))}
                  {waitingFor && (
                    <li className="relative flex flex-wrap items-baseline gap-x-3">
                      <span className={cx('absolute -left-5 top-[0.55em] w-[11px] h-[11px] rounded-full border-2 bg-paper', ps.overdueBy > 0 ? 'border-terra' : 'border-ink')} />
                      <span className="font-serif text-lg">{t(`step.${waitingFor.id}`)}</span>
                      <span className={cx('font-sans text-sm', ps.overdueBy > 0 ? 'text-terra font-semibold' : 'opacity-70')}>{ps.overdueBy > 0 ? t('p.overdue', { n: ps.overdueBy }) : t('p.ontime')}</span>
                    </li>
                  )}
                </ol>
                {!Object.values(pathway.dates).some(Boolean) && <span className="opacity-60">—</span>}
              </dd>
            </div>
          </dl>

          {diary.length > 0 && (
            <div className="mt-4 border-t border-black/10 pt-6">
              <Label className="mb-3">{t('d.notes')}</Label>
              <ul className="space-y-2">
                {[...diary].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
                  <li key={e.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 items-baseline">
                    <span className="font-sans text-sm opacity-60 tabular-nums">{d(e.date)}</span>
                    <span className="font-serif text-lg leading-snug">{e.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-8 font-type text-xs uppercase tracking-widest opacity-60">{t('d.notDiagnosis')}</p>
        </div>
      </Card>
      <div className="no-print grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-5 items-start">
        <Card tone={sentAt ? 'ink' : 'mustard'} tilt={-0.5} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant={sentAt ? 'mustard' : 'ink'} onClick={sendToCentre}>{sentAt ? t('d.sendAgain') : t('d.send2')}</Btn>
            {sentAt && (
              <span className="font-type text-sm uppercase tracking-widest opacity-80">
                ✓ {t('d.sentAt', { t: d(sentAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
              </span>
            )}
          </div>
          <p className="font-serif italic text-lg leading-snug mt-3 opacity-85">{t('d.sendWhat')}</p>
          {sentAt && <button onClick={stopSharing} className="mt-2 font-type text-sm uppercase tracking-widest opacity-70 hover:opacity-100 hover:text-mustard underline underline-offset-4 decoration-dashed">{t('d.stop')}</button>}
        </Card>
        <div className="flex flex-wrap md:flex-col gap-3">
          <Btn variant="ghost" onClick={() => window.print()}>{t('d.print')}</Btn>
          <Btn variant="ghost" onClick={async () => { if (await copyText(asText())) toast(t('p.copied')) }}>{t('d.copyText')}</Btn>
        </div>
      </div>
    </div>
  )
}
