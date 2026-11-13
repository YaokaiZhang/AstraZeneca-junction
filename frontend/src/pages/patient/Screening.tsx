import { Card, Chip, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { useStore } from '../../lib/store'
import { PROGRAMMES } from './logic'
import { useT } from './i18n'
import { Field } from './bits'

type Ans = 'yes' | 'no' | 'kit' | 'unsure'
const TONES = ['mustard', 'terra', 'stone'] as const
const TILTS = [-2, 1.5, -1]

export function invitedTo(age?: number, sex?: 'f' | 'm' | 'x') {
  if (!age) return []
  return PROGRAMMES.filter((p) => age >= p.from && age <= p.to && (!sex || p.sex.includes(sex)))
}

export default function Screening() {
  const { t } = useT()
  const profile = useStore((s) => s.profile)
  const screening = useStore((s) => s.screening)
  const set = useStore((s) => s.set)
  const age = profile.age
  const setProfile = (p: Partial<typeof profile>) => set((s) => ({ profile: { ...s.profile, ...p } }))
  const answer = (id: 'bowel' | 'breast' | 'cervical', v: Ans) => set((s) => ({ screening: { ...s.screening, [id]: v } }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Field label={t('r.age')} htmlFor="s-age" className="w-28">
          <input id="s-age" type="number" min={18} max={100} value={age ?? ''} placeholder="—"
            onChange={(e) => setProfile({ age: e.target.value ? +e.target.value : undefined })}
            className="w-full border-b border-black/20 py-1 font-serif text-4xl outline-none focus:border-terra placeholder:text-black/30" />
        </Field>
        <div role="radiogroup" aria-label={t('s.sex')}>
          <span className="label block mb-2">{t('s.sex')}</span>
          <div className="flex gap-2">
            {(['f', 'm', 'x'] as const).map((s) => <Chip key={s} active={profile.sex === s} onClick={() => setProfile({ sex: s })}>{t(`sex.${s}`)}</Chip>)}
          </div>
        </div>
        <SourceBadge id="screeningRules" kind="direct" demo={false} className="mb-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
        {PROGRAMMES.map((p, i) => {
          const sexOk = !profile.sex || p.sex.includes(profile.sex)
          const inAge = !!age && age >= p.from && age <= p.to
          const invited = inAge && sexOk
          const a = screening[p.id] as Ans | undefined
          const opts: { v: Ans; k: string }[] = p.id === 'bowel'
            ? [{ v: 'yes', k: 's.a.sent' }, { v: 'kit', k: 's.a.kit' }, { v: 'no', k: 'c.no' }, { v: 'unsure', k: 's.a.unsure' }]
            : [{ v: 'yes', k: 'c.yes' }, { v: 'no', k: 'c.no' }, { v: 'unsure', k: 's.a.unsure' }]
          const lo = 20, hi = 85
          const pos = (x: number) => `${((Math.min(hi, Math.max(lo, x)) - lo) / (hi - lo)) * 100}%`
          return (
            <Card key={p.id} tone={invited ? TONES[i] : 'paper'} tilt={TILTS[i]} className={cx('p-6 flex flex-col min-h-[340px]', !invited && 'opacity-70')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Label className="!opacity-80">{p.from}–{p.to}{p.sex.length < 3 ? ` · ${t('sex.f')}` : ''}</Label>
                  <p className="font-serif text-4xl leading-none mt-2">{t(`prog.${p.id}`)}</p>
                </div>
                {age ? <Stamp tone={invited && TONES[i] === 'terra' ? 'paper' : invited ? 'ink' : 'ink'} rotate={-10} className={cx('!w-20 !h-20', !invited && 'opacity-40')}>{invited ? t('s.invited') : t('s.notInvited')}</Stamp> : null}
              </div>
              {/* age band */}
              <div className="mt-6 relative h-6" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-px bg-current opacity-30" />
                <div className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-current opacity-40" style={{ left: pos(p.from), width: `calc(${pos(p.to)} - ${pos(p.from)})` }} />
                {age && <div className="absolute top-0 bottom-0 w-0.5 bg-current" style={{ left: pos(age) }}><span className="absolute -top-4 -translate-x-1/2 font-type text-[10px]">{age}</span></div>}
              </div>
              <div className="mt-auto pt-6">
                {!age ? <p className="font-serif italic text-xl opacity-70">{t('s.ageFirst')}</p> : invited ? (
                  <>
                    <p className="font-serif italic text-xl leading-tight">{t(p.id === 'bowel' ? 's.q.bowel' : 's.q.other')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {opts.map((o) => (
                        <Chip key={o.v} active={a === o.v} onClick={() => answer(p.id, o.v)} className={cx(TONES[i] === 'terra' && a !== o.v && 'border-paper/40')}>{t(o.k)}</Chip>
                      ))}
                    </div>
                    {a && (
                      <p className="rise font-type text-[10px] uppercase tracking-widest mt-3">
                        → {a === 'kit' ? t('s.nudge.kit') : a === 'no' || a === 'unsure' ? t('s.nudge.no') : t('s.nudge.yes')}
                      </p>
                    )}
                  </>
                ) : <p className="font-type text-[10px] uppercase tracking-widest opacity-60">{t('s.notInvited')}</p>}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
