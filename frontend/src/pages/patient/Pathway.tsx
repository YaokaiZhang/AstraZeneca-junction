import { useState } from 'react'
import { Btn, Card, Chip, Label, SourceBadge, cx, toast } from '../../components/ui'
import { BARRIERS, PATHWAY, daysBetween, pathwayStatus, today, type BarrierId, type StepId } from '../../data/pathway'
import { useStore } from '../../lib/store'
import { useT } from './i18n'
import { Clock, copyText } from './bits'

const CANCERS = ['lung', 'bowel', 'pancreas', 'liver', 'other'] as const

export default function Pathway() {
  const { t, d } = useT()
  const pathway = useStore((s) => s.pathway)
  const barriers = useStore((s) => s.barriers)
  const set = useStore((s) => s.set)
  const now = today()
  const dates = pathway.dates
  const st = pathwayStatus(dates, now)
  const overdue = !!st.next && st.lastDone >= 0 && st.overdueBy > 0
  const started = st.lastDone >= 0
  const finished = started && !st.next
  const prev = started ? PATHWAY[st.lastDone] : null
  const after = st.next ? PATHWAY[PATHWAY.indexOf(st.next) + 1] : null
  const dayN = dates.gp ? daysBetween(dates.gp, now) : 0
  const totalTarget = PATHWAY.reduce((a, s) => a + (s.targetDays ?? 0), 0)

  const setDate = (id: StepId, v: string | undefined) =>
    set((s) => {
      const nd = { ...s.pathway.dates }
      if (v) nd[id] = v; else delete nd[id]
      return { pathway: { ...s.pathway, dates: nd } }
    })

  const stepBarrier = st.next ? [...barriers].filter((b) => b.step === st.next!.id).sort((a, b) => b.at.localeCompare(a.at))[0] : undefined
  const chosen = stepBarrier ? BARRIERS.find((b) => b.id === stepBarrier.barrier) : undefined
  const reportBarrier = (id: BarrierId) => {
    if (!st.next) return
    set((s) => ({ barriers: [...s.barriers, { step: st.next!.id, barrier: id, at: new Date().toISOString() }] }))
    toast(t('m.saved'))
  }
  const draft = st.next && prev ? t('p.draft', {
    prev: t(`step.${prev.id}`), date: d(dates[prev.id], { day: 'numeric', month: 'long', year: 'numeric' }),
    step: t(`step.${st.next.id}`).toLowerCase(), target: st.next.targetDays ?? 0, waited: st.waited,
  }) : ''

  return (
    <div className="space-y-8">
      {/* status: clock + what you wait for */}
      {!started ? (
        <Card tone="mustard" tilt={-1} className="p-8 sm:p-10 max-w-2xl">
          <p className="font-serif text-4xl sm:text-5xl leading-tight">{t('p.start')}</p>
          <Btn className="mt-6" onClick={() => setDate('gp', now)}>{t('c.today')}</Btn>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 lg:gap-0 items-start">
        <Card tone={overdue ? 'terra' : finished ? 'ink' : 'mustard'} tilt={-1.5} className="p-6 sm:p-8 relative z-10 lg:mr-[-28px] lg:mt-6">
          <Clock dates={dates} size={260} dark={overdue || finished}>
            <span className="font-type text-sm uppercase tracking-widest opacity-70">{t('p.day')}</span>
            <span className="font-serif text-7xl leading-none">{dayN}</span>
            <span className="font-type text-sm uppercase tracking-widest opacity-70 flex items-center gap-1">{t('p.of', { n: totalTarget })} <SourceBadge id="thlTargets" kind="estimate" demo={false} how={t('how.targets')} /></span>
          </Clock>
        </Card>

        <Card tone="paper" tilt={1} className="p-6 sm:p-8 lg:pl-16">
          {st.next ? (
            <>
              <Label>{t('p.next')}</Label>
              <p className="font-serif text-5xl leading-[1.05] mt-1">{t(`step.${st.next.id}`)}</p>
              <p className="font-serif italic text-xl opacity-80 mt-2">{t(`expect.${st.next.id}`)}</p>
              {prev && (
                <div className="mt-6">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={cx('font-serif text-6xl leading-none', overdue && 'text-terra')}>{st.waited}</span>
                    <span className="font-type text-sm uppercase tracking-widest">/ {t('p.target', { n: st.next.targetDays ?? 0 })}</span>
                    <SourceBadge id="thlTargets" kind="estimate" demo={false} how={t('how.targets')} />
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-black/10 relative overflow-hidden" aria-hidden>
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', overdue ? 'bg-terra' : 'bg-mustard')}
                      style={{ width: `${Math.min(100, (st.waited / Math.max(st.waited, st.next.targetDays ?? 1, 1)) * 100)}%` }} />
                    {overdue && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${((st.next.targetDays ?? 0) / st.waited) * 100}%` }} />}
                  </div>
                  <p className={cx('font-type text-sm uppercase tracking-widest mt-2', overdue ? 'text-terra' : 'opacity-60')}>
                    {overdue ? t('p.overdue', { n: st.overdueBy }) : st.overdueBy === 0 ? t('ago.today') : t('p.dueIn', { n: -st.overdueBy })}
                  </p>
                </div>
              )}
              {after && (
                <div className="tear mt-6 pt-4 opacity-70">
                  <p>
                    <span className="label mr-3">{t('p.then')}</span>
                    <span className="font-serif text-xl">{t(`step.${after.id}`)}</span>
                    {after.targetDays !== null && <span className="font-type text-sm uppercase tracking-widest ml-3 opacity-80">{t('p.target', { n: after.targetDays })}</span>}
                  </p>
                  <p className="font-serif italic text-lg leading-snug mt-1">{t(`expect.${after.id}`)}</p>
                </div>
              )}
            </>
          ) : <p className="font-serif text-5xl leading-tight">{t('p.done')}</p>}
        </Card>
      </div>
      )}

      {/* overdue → barrier + contact */}
      {overdue && st.next && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card tone="stone" className="p-6 sm:p-8">
            <p className="font-serif italic text-3xl leading-tight">{t('b.ask')}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {BARRIERS.map((b) => (
                <Chip key={b.id} active={chosen?.id === b.id} onClick={() => reportBarrier(b.id)}>{t(`barrier.${b.id}`)}</Chip>
              ))}
            </div>
            {chosen && <Support barrier={chosen.id} side={chosen.side} owner={st.next.owner} />}
            {chosen && stepBarrier && <BarrierNote key={stepBarrier.at} at={stepBarrier.at} initial={stepBarrier.note ?? ''} />}
          </Card>
          <Card tone="ink" tilt={-1} className="p-6 sm:p-8">
            <Label className="!opacity-70">{t('p.contact')}</Label>
            <p className="font-serif text-4xl leading-none mt-1">{t(`owner.${st.next.owner}`)}</p>
            <p className="font-type text-sm leading-snug mt-3 opacity-80"><span className="uppercase tracking-widest text-mustard mr-2">{t('p.howWhere')}</span>{t(`how.${st.next.owner}`)}</p>
            <blockquote className="tear !border-paper/20 mt-5 pt-4 font-serif text-lg leading-snug whitespace-pre-wrap" aria-label="draft">{draft}</blockquote>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Btn variant="mustard" onClick={async () => { if (await copyText(draft)) toast(t('p.copied')) }}>{t('p.copy')}</Btn>
              <a href={`mailto:?subject=${encodeURIComponent(t('p.subject', { step: t(`step.${st.next.id}`).toLowerCase() }))}&body=${encodeURIComponent(draft)}`}
                className="font-type text-sm uppercase tracking-widest opacity-80 hover:opacity-100 hover:text-mustard underline underline-offset-4 decoration-dashed">{t('p.email')} ↗</a>
            </div>
          </Card>
        </div>
      )}

      {/* date entry */}
      <Card tone="paper" className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 px-2 sm:px-3 pb-4" role="radiogroup" aria-label={t('p.cancer')}>
          {CANCERS.map((c) => (
            <Chip key={c} active={pathway.cancer === c} onClick={() => set((s) => ({ pathway: { ...s.pathway, cancer: c } }))}>{t(`cancer.${c}`)}</Chip>
          ))}
        </div>
        <ol className="divide-y divide-black/10">
          {PATHWAY.map((s, i) => {
            const v = dates[s.id]
            const prevDate = i > 0 ? dates[PATHWAY[i - 1].id] : undefined
            const gap = v && prevDate ? daysBetween(prevDate, v) : null
            const late = gap !== null && s.targetDays !== null && gap > s.targetDays
            const isNext = st.next?.id === s.id && started
            return (
              <li key={s.id} className={cx('py-3 px-2 sm:px-3 grid grid-cols-[28px_minmax(0,1fr)] sm:grid-cols-[28px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-center rounded', isNext && (overdue ? 'bg-terra/10' : 'bg-mustard/25'))}>
                <span className={cx('w-6 h-6 rounded-full flex items-center justify-center font-type text-sm border',
                  v ? 'bg-ink text-paper border-ink' : isNext ? (overdue ? 'border-terra text-terra border-2' : 'border-ink border-2') : 'border-black/20 opacity-60')}>{v ? '✓' : i + 1}</span>
                <div className="min-w-0">
                  <label htmlFor={`d-${s.id}`} className="font-serif text-xl leading-tight block">{t(`step.${s.id}`)}</label>
                  {s.targetDays !== null && (
                    <span className={cx('font-type text-sm uppercase tracking-widest', late ? 'text-terra font-bold' : 'opacity-60')}>
                      {gap !== null ? t('p.took', { n: gap, target: s.targetDays }) : t('p.target', { n: s.targetDays })}
                    </span>
                  )}
                </div>
                <div className="col-start-2 sm:col-start-3 flex items-center gap-2">
                  <input id={`d-${s.id}`} type="date" value={v ?? ''} max={now} onChange={(e) => setDate(s.id, e.target.value || undefined)}
                    className="font-type text-sm border-b border-black/20 py-1 outline-none focus:border-terra min-w-0" />
                  <button onClick={() => setDate(s.id, now)} className="font-type text-sm uppercase tracking-widest border border-black/20 rounded-full px-2.5 py-1 hover:bg-ink hover:text-paper">{t('c.today')}</button>
                  {v && <button onClick={() => setDate(s.id, undefined)} aria-label={t('p.clear')} title={t('p.clear')} className="font-type text-sm opacity-60 hover:opacity-100 hover:text-terra px-1">✕</button>}
                </div>
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}

/** Optional free-text detail for the latest barrier report (store field `note`). */
function BarrierNote({ at, initial }: { at: string; initial: string }) {
  const { t } = useT()
  const set = useStore((s) => s.set)
  const [v, setV] = useState(initial)
  const save = () => {
    set((s) => ({ barriers: s.barriers.map((b) => (b.at === at ? { ...b, note: v.trim() || undefined } : b)) }))
    toast(t('b.thanks'))
  }
  return (
    <form className="mt-5 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); save() }}>
      <div className="flex-1 min-w-0">
        <label htmlFor="b-note" className="label block mb-1">{t('b.note')}</label>
        <input id="b-note" value={v} onChange={(e) => setV(e.target.value)} maxLength={280}
          className="w-full bg-transparent border-b border-black/25 py-1.5 font-serif text-lg outline-none focus:border-terra" />
      </div>
      <Btn variant="ghost" type="submit" className="!px-4 !py-2">{t('b.save')}</Btn>
    </form>
  )
}

function Support({ barrier, side, owner }: { barrier: BarrierId; side: 'system' | 'personal'; owner: string }) {
  const { t } = useT()
  type Item = { title: string; sub: string; href?: string }
  const kela: Item = { title: t('sup.kela'), sub: 'kela.fi', href: 'https://www.kela.fi/travel-expenses' }
  const social: Item = { title: t('sup.social'), sub: t('sup.socialSub') }
  const cancer: Item = { title: t('sup.cancer'), sub: '0800 19414', href: 'https://www.syopajarjestot.fi/' }
  const crisis: Item = { title: t('sup.crisis'), sub: '09 2525 0111', href: 'https://mieli.fi/' }
  const ceiling: Item = { title: t('sup.ceiling'), sub: t('sup.ceilingSub') }
  const nurse: Item = { title: t('sup.nurse'), sub: t('sup.nurseSub') }
  const items: Item[] = side === 'system'
    ? [{ title: t(`owner.${owner}`), sub: t('b.system') }]
    : ({ transport: [kela, social], cost: [ceiling, kela, social], unwell: [nurse, social], scared: [cancer, crisis], other: [social, cancer], 'no-contact': [] } as Record<BarrierId, Item[]>)[barrier]
  return (
    <div className="rise mt-5">
      {side === 'personal' && <Label className="mb-2">{t('b.personal')}</Label>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => {
          const inner = <>
            <span className="font-serif text-lg leading-tight block">{it.title}</span>
            <span className="font-type text-sm uppercase tracking-widest opacity-70">{it.sub}{it.href && ' ↗'}</span>
          </>
          return it.href
            ? <a key={it.title} href={it.href} target="_blank" rel="noreferrer" className="block bg-paper rounded-lg p-3 border border-black/10 hover:border-ink">{inner}</a>
            : <div key={it.title} className={cx('rounded-lg p-3 border', side === 'system' ? 'bg-ink text-paper border-ink' : 'bg-paper border-black/10')}>{inner}</div>
        })}
      </div>
    </div>
  )
}
