// Screening check (spec 1.2, 1.7, 3.1 person side): one form, four cancers, and only the next step.
// Lung uses PLCOm2012; bowel/breast/cervical use our labelled Estimate plus the public programme ages.
// Scores are kept in the store (a clinician may see them if the person shares) but never rendered here.
import { useEffect, useMemo, useState } from 'react'
import { Card, Chip, Label, SourceBadge, cx } from '../../components/ui'
import { useStore, type CheckInputs, type RiskInputs } from '../../lib/store'
import { useChat } from './chat'
import {
  bmiOf, DEFAULT_CHECK, estimates, ESTIMATE_HOW, nextSteps, plco, PLCO_HOW, toRiskInputs,
  type CheckCancer, type NextStep, type StepLevel,
} from './logic'
import { useT } from './i18n'
import { Field } from './bits'

const num = 'w-full border-b border-black/20 py-1.5 font-serif text-2xl outline-none focus:border-terra bg-transparent'
const sel = 'w-full border-b border-black/20 py-2 font-serif text-xl outline-none focus:border-terra bg-transparent'

export const LEVEL_TONE: Record<StepLevel, 'terra' | 'mustard' | 'stone' | 'paper'> = { doctor: 'terra', act: 'mustard', done: 'stone', none: 'paper', unknown: 'paper' }
export const LEVEL_TAG: Record<StepLevel, 'terra' | 'mustard' | 'ink' | 'line'> = { doctor: 'terra', act: 'mustard', done: 'ink', none: 'line', unknown: 'line' }
const TILTS: Record<CheckCancer, number> = { lung: -1.5, bowel: 1.2, breast: -0.8, cervical: 1.5 }

/** Starting answers: what was saved, else what the diary chat learned, else neutral defaults. */
function initialInputs(): CheckInputs {
  const { check, risk } = useStore.getState()
  if (check) return check.inputs
  const smoke = useChat.getState().smoke
  const r = risk?.inputs
  return {
    ...DEFAULT_CHECK,
    smoker: r?.smoker ?? smoke.status ?? DEFAULT_CHECK.smoker,
    cigsPerDay: r?.cigsPerDay ?? smoke.cpd ?? DEFAULT_CHECK.cigsPerDay,
    yearsSmoked: r?.yearsSmoked ?? smoke.years ?? DEFAULT_CHECK.yearsSmoked,
    yearsQuit: r?.yearsQuit ?? smoke.quit ?? DEFAULT_CHECK.yearsQuit,
    ...(r && { education: r.education, copd: r.copd, personalCancer: r.personalCancer, familyLung: r.familyLung, ethnicity: r.ethnicity }),
  }
}

export default function Check() {
  const { t } = useT()
  const profile = useStore((s) => s.profile)
  const diary = useStore((s) => s.diary)
  const set = useStore((s) => s.set)
  const [f, setF] = useState<CheckInputs>(initialInputs)
  const [more, setMore] = useState(false)
  const up = <K extends keyof CheckInputs>(k: K, v: CheckInputs[K]) => setF((x) => ({ ...x, [k]: v }))
  const setProfile = (p: Partial<typeof profile>) => set((s) => ({ profile: { ...s.profile, ...p } }))
  const age = profile.age && profile.age >= 18 && profile.age <= 100 ? profile.age : undefined
  const bmi = bmiOf(f.heightCm, f.weightKg)
  const valid = f.heightCm >= 120 && f.heightCm <= 230 && f.weightKg >= 30 && f.weightKg <= 300

  // keep the store in sync (scores stay internal: hospital page, check-in frequency)
  useEffect(() => {
    if (!valid) return
    const t0 = setTimeout(() => {
      const ri: RiskInputs | null = age ? toRiskInputs(age, f) : null
      const est = age
        ? estimates({ age, sex: profile.sex ?? 'x', smoker: f.smoker, drinksPerWeek: f.drinksPerWeek, bmi, familyBowel: f.familyBowel, familyBreast: f.familyBreast })
        : { bowel: null, breast: null, cervical: null }
      const at = new Date().toISOString()
      set({ check: { inputs: f, est, at }, risk: ri ? { inputs: ri, prob6y: plco(ri), at } : null })
    }, 250)
    return () => clearTimeout(t0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(f), age, profile.sex, valid])

  const steps = useMemo(() => nextSteps({ profile: { ...profile, age }, check: null, diary }, f), [profile, age, diary, f])
  const smoker = f.smoker !== 'never'

  return (
    <div className="space-y-8">
      <p className="font-serif italic text-2xl sm:text-3xl leading-tight">{t('ck.intro')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-10 items-start">
        {/* ---------- questions ---------- */}
        <Card tone="paper" tilt={-0.6} className="p-6 sm:p-8 relative z-10">
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <Field label={t('r.age')} htmlFor="ck-age" className="w-24">
                <input id="ck-age" type="number" min={18} max={100} value={profile.age ?? ''} placeholder="—"
                  onChange={(e) => setProfile({ age: e.target.value ? +e.target.value : undefined })}
                  className="w-full border-b border-black/20 py-1 font-serif text-4xl outline-none focus:border-terra bg-transparent placeholder:text-black/30" />
              </Field>
              <div role="radiogroup" aria-label={t('s.sex')}>
                <span className="label block mb-2">{t('s.sex')}</span>
                <div className="flex flex-wrap gap-2">
                  {(['f', 'm', 'x'] as const).map((s) => <Chip key={s} active={profile.sex === s} onClick={() => setProfile({ sex: s })}>{t(`sex.${s}`)}</Chip>)}
                </div>
              </div>
            </div>

            <div role="radiogroup" aria-label={t('r.smoke')}>
              <Label className="mb-2">{t('r.smoke')}</Label>
              <div className="flex flex-wrap gap-2">
                {(['current', 'former', 'never'] as const).map((s) => <Chip key={s} active={f.smoker === s} onClick={() => up('smoker', s)}>{t(`c.${s}`)}</Chip>)}
              </div>
            </div>

            {smoker && (
              <div className="rise grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-5 items-end">
                <Field label={t('r.cpd')} htmlFor="ck-cpd"><input id="ck-cpd" type="number" min={1} max={80} value={f.cigsPerDay} onChange={(e) => up('cigsPerDay', +e.target.value)} className={num} /></Field>
                <Field label={t('r.years')} htmlFor="ck-yrs"><input id="ck-yrs" type="number" min={0} max={80} value={f.yearsSmoked} onChange={(e) => up('yearsSmoked', +e.target.value)} className={num} /></Field>
                {f.smoker === 'former' && (
                  <Field label={t('r.quit')} htmlFor="ck-quit"><input id="ck-quit" type="number" min={0} max={70} value={f.yearsQuit} onChange={(e) => up('yearsQuit', +e.target.value)} className={num} /></Field>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-5 items-end">
              <Field label={t('r.height')} htmlFor="ck-h"><input id="ck-h" type="number" min={120} max={230} value={f.heightCm} onChange={(e) => up('heightCm', +e.target.value)} className={num} /></Field>
              <Field label={t('r.weight')} htmlFor="ck-w"><input id="ck-w" type="number" min={30} max={300} value={f.weightKg} onChange={(e) => up('weightKg', +e.target.value)} className={num} /></Field>
              <Field label={t('ck.drinks')} htmlFor="ck-alc" className="col-span-2 sm:col-span-1"><input id="ck-alc" type="number" min={0} max={100} value={f.drinksPerWeek} onChange={(e) => up('drinksPerWeek', Math.max(0, +e.target.value))} className={num} /></Field>
            </div>

            <div>
              <Label className="mb-2">{t('ck.family')}</Label>
              <div className="flex flex-wrap gap-2">
                {(['familyLung', 'familyBowel', 'familyBreast'] as const).map((k) => (
                  <Chip key={k} active={f[k]} onClick={() => up(k, !f[k])}>
                    <span aria-hidden className="mr-1">{f[k] ? '✓' : '+'}</span>{t(`ck.fam.${k.slice(6).toLowerCase()}`)}
                  </Chip>
                ))}
              </div>
            </div>

            {smoker && (
              <div className="tear pt-4">
                <button onClick={() => setMore((m) => !m)} aria-expanded={more}
                  className="font-type text-sm uppercase tracking-widest opacity-60 hover:opacity-100 hover:text-terra">
                  {more ? '−' : '+'} {t('ck.more')}
                </button>
                {more && (
                  <div className="rise mt-4 space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {(['copd', 'personalCancer'] as const).map((k) => (
                        <Chip key={k} active={f[k]} onClick={() => up(k, !f[k])}>
                          <span aria-hidden className="mr-1">{f[k] ? '✓' : '+'}</span>{t(k === 'copd' ? 'r.copd' : 'r.pcancer')}
                        </Chip>
                      ))}
                    </div>
                    <Field label={t('r.edu')} htmlFor="ck-edu">
                      <select id="ck-edu" value={f.education} onChange={(e) => up('education', +e.target.value as CheckInputs['education'])} className={sel}>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{t(`r.edu${n}`)}</option>)}
                      </select>
                    </Field>
                    <Field label={t('r.eth')} htmlFor="ck-eth">
                      <select id="ck-eth" value={f.ethnicity} onChange={(e) => up('ethnicity', e.target.value as CheckInputs['ethnicity'])} className={sel}>
                        {(['white', 'black', 'hispanic', 'asian', 'other'] as const).map((n) => <option key={n} value={n}>{t(`eth.${n}`)}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ---------- next steps ---------- */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {steps.map((st) => (
              <StepCard key={st.id} st={st} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ st }: { st: NextStep }) {
  const { t } = useT()
  const tone = st.applies ? LEVEL_TONE[st.level] : 'paper'
  const onDark = tone === 'terra'
  const model = st.id === 'lung' ? t('ck.model.lung') : t('ck.model.est')

  // programmes that don't apply to this person: a small, quiet slip instead of a full card
  if (!st.applies) return (
    <Card tone="paper" tilt={TILTS[st.id] / 2} className="px-6 py-4 opacity-60 self-start">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl leading-none">{t(`prog.${st.id}`)}</p>
      </div>
      <p className="font-serif italic text-lg leading-tight mt-2">{t(st.say)}</p>
    </Card>
  )
  return (
    <Card tone={tone} tilt={TILTS[st.id]} className="p-6 flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-3xl leading-none">{t(`prog.${st.id}`)}</p>
      </div>
      {st.level !== 'unknown' && <p className="font-serif text-4xl leading-[1.05] mt-5">{t(st.short)}</p>}
      <p className={cx('font-serif italic leading-snug', st.level === 'unknown' ? 'text-2xl mt-5' : 'text-lg mt-2 opacity-85')}>{t(st.say)}</p>

      {(
        <div className="mt-auto pt-5">
          <div className={cx('tear pt-3 flex items-center gap-2', onDark && '!border-paper/25')}>
            <span className="font-type text-[13px] uppercase tracking-widest opacity-60">{model}</span>
            {st.id === 'lung'
              ? <SourceBadge id="plco" kind="estimate" how={PLCO_HOW} demo={false} />
              : <><SourceBadge id="ourModel" kind="estimate" how={ESTIMATE_HOW} /><SourceBadge id="cancerRegistry" kind="direct" /></>}
          </div>
        </div>
      )}
    </Card>
  )
}
