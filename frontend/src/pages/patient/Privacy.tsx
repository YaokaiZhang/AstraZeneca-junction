import { useEffect, useState } from 'react'
import { Btn, Card, cx, toast } from '../../components/ui'
import { useStore } from '../../lib/store'
import { aiActive, checkAi, useAi } from './chat'
import { useT } from './i18n'
import { ShareSwitch, Tag } from './bits'
import { CheckinCard } from './Diary'
import { erasePatient } from './seed'

export default function Privacy({ onErased, onSimulate }: { onErased: () => void; onSimulate: () => void }) {
  const { t } = useT()
  const [ask, setAsk] = useState(false)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
      <div className="space-y-6">
        <Card tone="paper" className="p-6 sm:p-8">
          <p className="font-serif text-3xl sm:text-4xl leading-tight">{t('pr.local')}</p>
          <AiNote />
          <div className="mt-4">
            <AiSwitch />
            <ShareSwitch which="hospital" label={t('pr.hospital')}>
              {(['tab.diary', 'tab.check', 'tab.pathway'] as const).map((k) => <Tag key={k}>{t(k)}</Tag>)}
            </ShareSwitch>
            <ShareSwitch which="stats" label={t('pr.stats')}>
              <Tag>{t('pr.statsWhat')}</Tag>
            </ShareSwitch>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {!ask ? <Btn variant="ghost" onClick={() => setAsk(true)}>{t('pr.erase')}</Btn> : (
            <div className="rise flex flex-wrap items-center gap-3">
              <span className="font-serif italic text-xl">{t('pr.eraseConfirm')}</span>
              <Btn variant="ghost" onClick={() => setAsk(false)}>{t('pr.cancel')}</Btn>
              <Btn variant="terra" onClick={() => { erasePatient(); setAsk(false); toast(t('pr.erased')); onErased() }}>{t('pr.erase')}</Btn>
            </div>
          )}
          <span className="font-type text-sm uppercase tracking-widest opacity-70">{t('pr.gdpr')}</span>
        </div>
      </div>
      <CheckinCard onSimulate={onSimulate} />
    </div>
  )
}

/** Honest line under "Stored on this device" while AI replies are actually in use. */
function AiNote() {
  const { t } = useT()
  const on = aiActive(useAi((s) => s.server), useStore((s) => s.aiChat))
  useEffect(() => { void checkAi() }, [])
  return on ? <p className="font-serif italic text-xl leading-snug mt-2 opacity-85">{t('pr.localAi')}</p> : null
}

/** AI replies in the diary chat: on by default when the server offers them; the person can turn them off. */
function AiSwitch() {
  const { t } = useT()
  const server = useAi((s) => s.server)
  const aiChat = useStore((s) => s.aiChat)
  const set = useStore((s) => s.set)
  const on = aiChat !== false
  const apply = (v: boolean) => { set({ aiChat: v }); toast(v ? t('m.saved') : t('pr.off')) }
  return (
    <div className="py-4 border-b border-black/10">
      <div className="flex items-center justify-between gap-4">
        <p className="font-serif text-xl leading-tight min-w-0">✦ {t('pr.ai')}</p>
        <button role="switch" aria-checked={on} aria-label={t('pr.ai')} onClick={() => apply(!on)}
          className={cx('w-12 h-7 rounded-full relative transition-colors shrink-0', on ? 'bg-terra' : 'bg-black/20')}>
          <span className={cx('absolute top-0.5 w-6 h-6 rounded-full bg-paper shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </div>
      <p className="font-type text-sm leading-snug mt-2 opacity-75">{t('pr.aiWhat')}</p>
      {on && server === 'off' && <p className="font-type text-sm leading-snug mt-1 opacity-75">{t('pr.aiNA')}</p>}
    </div>
  )
}
