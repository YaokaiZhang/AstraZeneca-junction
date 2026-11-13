import { useState } from 'react'
import { Btn, Card, EdgeText, Label, Stamp, toast } from '../../components/ui'
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
        <Card tone="paper" className="p-6 sm:p-8 pl-10 sm:pl-14">
          <EdgeText>{t('pr.gdpr')}</EdgeText>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              <Tag tone="ink">{t('pr.local')}</Tag>
              <Tag>{t('pr.self')}</Tag>
            </div>
            <Stamp rotate={-8} className="hidden sm:flex">{t('pr.gdpr')}</Stamp>
          </div>
          <div className="mt-4">
            <ShareSwitch which="hospital" label={t('pr.hospital')}>
              {(['tab.diary', 'tab.risk', 'tab.pathway'] as const).map((k) => <Tag key={k}>{t(k)}</Tag>)}
            </ShareSwitch>
            <ShareSwitch which="stats" label={t('pr.stats')}>
              <Tag>{t('pr.statsWhat')}</Tag>
            </ShareSwitch>
          </div>
          <p className="sm:hidden mt-4 font-type text-[10px] uppercase tracking-widest opacity-60">{t('pr.gdpr')}</p>
        </Card>

        <div className="tear pt-5 flex flex-wrap items-center gap-3">
          {!ask ? <Btn variant="ghost" onClick={() => setAsk(true)}>{t('pr.erase')}</Btn> : (
            <div className="rise flex flex-wrap items-center gap-3">
              <span className="font-serif italic text-xl">{t('pr.eraseConfirm')}</span>
              <Btn variant="ghost" onClick={() => setAsk(false)}>{t('pr.cancel')}</Btn>
              <Btn variant="terra" onClick={() => { erasePatient(); setAsk(false); toast(t('pr.erased')); onErased() }}>{t('pr.erase')}</Btn>
            </div>
          )}
        </div>
      </div>
      <div>
        <Label className="mb-3">{t('ci.title')}</Label>
        <CheckinCard onSimulate={onSimulate} />
      </div>
    </div>
  )
}
