// Page 1: Patient — notice · track · ask. Sub-sections live at /patient/<tab>.
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Display, Label, Tabs, cx, toast } from '../../components/ui'
import { useStore } from '../../lib/store'
import { LANGS, split2, useT } from './i18n'
import Today, { type TabId } from './Today'
import Diary from './Diary'
import Pathway from './Pathway'
import Check from './Check'
import Privacy from './Privacy'
import { seedDemo } from './seed'

const TABS: TabId[] = ['today', 'diary', 'pathway', 'check', 'settings']
// old links: the lung-risk and screening tabs were merged into the screening check
const ALIAS: Record<string, TabId> = { risk: 'check', screening: 'check' }

export default function PatientPage() {
  const { t, lang } = useT()
  const set = useStore((s) => s.set)
  const params = useParams()
  const navigate = useNavigate()
  const seg = (params['*'] ?? '').split('/')[0]
  const raw = (ALIAS[seg] ?? seg) as TabId
  const tab: TabId = TABS.includes(raw) ? raw : 'today'
  const go = (id: TabId) => { navigate(id === 'today' ? '/patient' : `/patient/${id}`); window.scrollTo({ top: 0 }) }
  const [gen, setGen] = useState(0) // remount forms after seed / erase
  const h = split2(t(`h.${tab}`))

  return (
    <div className="px-4 sm:px-8 lg:px-12 pt-6 lg:pt-10 pb-24 max-w-[1200px]" lang={lang}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Label>01 · {t('m.patient')}</Label>
        <div className="flex items-center gap-3">
          <div role="group" aria-label={t('m.lang')} className="flex rounded-full border border-black/15 p-0.5">
            {LANGS.map((l) => (
              <button key={l} onClick={() => set({ lang: l })} aria-pressed={lang === l} lang={l}
                className={cx('font-type text-[13px] uppercase tracking-wider px-2 py-1 rounded-full transition-colors', lang === l ? 'bg-ink text-paper' : 'hover:text-terra')}>{l}</button>
            ))}
          </div>
          <button onClick={() => { seedDemo(); setGen((g) => g + 1); toast(t('m.seeded')) }}
            className="font-type text-xs uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-terra border border-dashed border-current rounded-full px-2.5 py-1">
            {t('m.seed')}
          </button>
        </div>
      </header>

      <Display a={h.a} b={h.b} className="mt-6 lg:mt-8 break-words !text-[2.75rem] sm:!text-5xl lg:!text-6xl" />

      <nav className="mt-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <Tabs value={tab} onChange={go} className="!flex-nowrap sm:!flex-wrap whitespace-nowrap pb-1"
          tabs={TABS.map((id) => ({ id, label: t(`tab.${id}`) }))} />
      </nav>
      <div className="tear mt-3 mb-8" />

      <div key={`${tab}-${gen}`} className="rise">
        {tab === 'today' && <Today go={go} />}
        {tab === 'diary' && <Diary />}
        {tab === 'pathway' && <Pathway />}
        {tab === 'check' && <Check />}
        {tab === 'settings' && <Privacy onErased={() => setGen((g) => g + 1)} onSimulate={() => go('diary')} />}
      </div>
    </div>
  )
}
