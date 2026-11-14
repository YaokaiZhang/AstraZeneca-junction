import { useState } from 'react'
import { Btn, Card, toast } from '../../components/ui'
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
          <div className="mt-4">
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
