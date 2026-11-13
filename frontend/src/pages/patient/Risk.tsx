import { useEffect, useMemo, useState } from 'react'
import { Card, Chip, EdgeText, Label, SourceBadge, Stamp, cx } from '../../components/ui'
import { useStore, type RiskInputs } from '../../lib/store'
import { useChat } from './chat'
import { packYears, plco, PLCO_HOW, PLCO_THRESHOLD } from './logic'
import { useT } from './i18n'
import { Field, Gauge } from './bits'

type SmokeSel = 'never' | 'current' | 'former'

const num = 'w-full border-b border-black/20 py-1.5 font-serif text-2xl outline-none focus:border-terra bg-transparent'

export default function Risk() {
  const { t } = useT()
  const risk = useStore((s) => s.risk)
  const profile = useStore((s) => s.profile)
  const set = useStore((s) => s.set)
  const smoke = useChat((s) => s.smoke)

  const init: RiskInputs = risk?.inputs ?? {
    age: profile.age ?? 60, education: 4, bmi: 26, copd: false, personalCancer: false, familyLung: false,
    smoker: smoke.status === 'former' ? 'former' : 'current', cigsPerDay: smoke.cpd ?? 15, yearsSmoked: smoke.years ?? 25, yearsQuit: smoke.quit ?? 0, ethnicity: 'white',
  }
  const [f, setF] = useState<RiskInputs>(init)
  const [sel, setSel] = useState<SmokeSel>(risk ? risk.inputs.smoker : smoke.status ?? 'current')
  const [hw, setHw] = useState({ h: 175, w: Math.round(26 * 1.75 * 1.75) })
  const [bmiMode, setBmiMode] = useState<'hw' | 'bmi'>(risk ? 'bmi' : 'hw')
  const up = <K extends keyof RiskInputs>(k: K, v: RiskInputs[K]) => setF((x) => ({ ...x, [k]: v }))

  const inputs: RiskInputs = useMemo(() => ({
    ...f,
    smoker: sel === 'former' ? 'former' : 'current',
    bmi: bmiMode === 'hw' ? +(hw.w / Math.pow(hw.h / 100, 2)).toFixed(1) : f.bmi,
    yearsQuit: sel === 'current' ? 0 : f.yearsQuit,
  }), [f, sel, hw, bmiMode])
  const valid = sel !== 'never' && inputs.age >= 18 && inputs.age <= 100 && inputs.cigsPerDay > 0 && inputs.yearsSmoked >= 0 && inputs.bmi > 10 && inputs.bmi < 70
  const p = valid ? plco(inputs) : null

  // keep the store in sync so the hospital page / summary see the latest score
  useEffect(() => {
    if (sel === 'never') { if (risk) set({ risk: null }); return }
    if (p === null) return
    const t0 = setTimeout(() => set({ risk: { inputs, prob6y: p, at: new Date().toISOString() }, profile: { ...useStore.getState().profile, age: inputs.age } }), 250)
    return () => clearTimeout(t0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, sel, JSON.stringify(inputs)])

  const high = p !== null && p >= PLCO_THRESHOLD
  const py = packYears(inputs.cigsPerDay, inputs.yearsSmoked)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:gap-0 items-start">
      <Card tone="paper" className="p-6 sm:p-8 lg:mr-[-24px] lg:mt-8 relative z-10" tilt={-1}>
        <div className="space-y-6">
          <div role="radiogroup" aria-label={t('r.smoke')}>
            <Label className="mb-2">{t('r.smoke')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['current', 'former', 'never'] as SmokeSel[]).map((s) => (
                <Chip key={s} active={sel === s} onClick={() => setSel(s)}>{t(`c.${s}`)}</Chip>
              ))}
            </div>
          </div>

          <div className={cx('grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-5 transition-opacity', sel === 'never' && 'opacity-30 pointer-events-none')} aria-disabled={sel === 'never'}>
            <Field label={t('r.age')} htmlFor="r-age"><input id="r-age" type="number" min={18} max={100} value={f.age} onChange={(e) => up('age', +e.target.value)} className={num} /></Field>
            <Field label={t('r.cpd')} htmlFor="r-cpd"><input id="r-cpd" type="number" min={1} max={80} value={f.cigsPerDay} onChange={(e) => up('cigsPerDay', +e.target.value)} className={num} /></Field>
            <Field label={t('r.years')} htmlFor="r-yrs"><input id="r-yrs" type="number" min={0} max={80} value={f.yearsSmoked} onChange={(e) => up('yearsSmoked', +e.target.value)} className={num} /></Field>
            {sel === 'former' && (
              <Field label={t('r.quit')} htmlFor="r-quit"><input id="r-quit" type="number" min={0} max={70} value={f.yearsQuit} onChange={(e) => up('yearsQuit', +e.target.value)} className={num} /></Field>
            )}
            {bmiMode === 'hw' ? <>
              <Field label={t('r.height')} htmlFor="r-h"><input id="r-h" type="number" min={120} max={220} value={hw.h} onChange={(e) => setHw((x) => ({ ...x, h: +e.target.value }))} className={num} /></Field>
              <Field label={t('r.weight')} htmlFor="r-w"><input id="r-w" type="number" min={30} max={250} value={hw.w} onChange={(e) => setHw((x) => ({ ...x, w: +e.target.value }))} className={num} /></Field>
            </> : (
              <Field label="BMI" htmlFor="r-bmi"><input id="r-bmi" type="number" step={0.1} min={12} max={60} value={f.bmi} onChange={(e) => up('bmi', +e.target.value)} className={num} /></Field>
            )}
            <div className="col-span-2 sm:col-span-3 -mt-3">
              <button onClick={() => { if (bmiMode === 'hw') up('bmi', inputs.bmi); setBmiMode(bmiMode === 'hw' ? 'bmi' : 'hw') }}
                className="font-type text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 hover:text-terra">
                BMI {inputs.bmi} · {bmiMode === 'hw' ? 'BMI ⇄' : `${t('r.height')} / ${t('r.weight')} ⇄`}
              </button>
            </div>
            <Field label={t('r.edu')} htmlFor="r-edu" className="col-span-2 sm:col-span-3">
              <select id="r-edu" value={f.education} onChange={(e) => up('education', +e.target.value as RiskInputs['education'])} className="w-full border-b border-black/20 py-2 font-serif text-xl outline-none focus:border-terra">
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{t(`r.edu${n}`)}</option>)}
              </select>
            </Field>
            <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-2">
              {(['copd', 'personalCancer', 'familyLung'] as const).map((k) => (
                <Chip key={k} active={f[k]} onClick={() => up(k, !f[k])}>
                  <span aria-hidden className="mr-1">{f[k] ? '✓' : '+'}</span>{t(k === 'copd' ? 'r.copd' : k === 'personalCancer' ? 'r.pcancer' : 'r.family')}
                </Chip>
              ))}
            </div>
            <Field label={t('r.eth')} htmlFor="r-eth" className="col-span-2 sm:col-span-3">
              <select id="r-eth" value={f.ethnicity} onChange={(e) => up('ethnicity', e.target.value as RiskInputs['ethnicity'])} className="w-full border-b border-black/20 py-2 font-serif text-xl outline-none focus:border-terra">
                {(['white', 'black', 'hispanic', 'asian', 'other'] as const).map((n) => <option key={n} value={n}>{t(`eth.${n}`)}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card tone={sel === 'never' ? 'stone' : high ? 'terra' : 'mustard'} tilt={2} className="p-6 sm:p-8 pl-10 sm:pl-12 lg:min-h-[560px] flex flex-col">
        <EdgeText>PLCOm2012 · {t('r.sixYear')}</EdgeText>
        <div className="flex items-start justify-between gap-3">
          <Label className="!opacity-80">{t('r.sixYear')}</Label>
          {sel !== 'never' && p !== null && <Stamp tone={high ? 'paper' : 'ink'} rotate={-12}>{high ? t('r.stampHigh') : t('r.stampLow')}</Stamp>}
        </div>
        {sel === 'never' ? (
          <div className="mt-auto">
            <p className="font-serif text-5xl leading-none">—</p>
            <p className="font-serif italic text-2xl leading-snug mt-4 max-w-sm">{t('r.never')}</p>
          </div>
        ) : (
          <>
            <div className="mt-2 flex justify-center"><Gauge p={p} dark={high} /></div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-serif text-7xl sm:text-8xl leading-none tracking-tight">{p === null ? '—' : (p * 100).toFixed(2)}</span>
              <span className="font-type text-lg">%</span>
              <SourceBadge id="plco" kind="estimate" how={PLCO_HOW} />
            </div>
            <p className="font-serif italic text-2xl leading-tight mt-3">{p === null ? '' : high ? t('r.high') : t('r.low')}</p>
            <div className="tear mt-auto pt-4 grid grid-cols-3 gap-3 !border-black/15">
              <div><Label className="!opacity-70">{t('r.threshold')}</Label><p className="font-serif text-2xl">1.51 %</p></div>
              <div><Label className="!opacity-70">{t('r.packYears')}</Label><p className="font-serif text-2xl">{py}</p></div>
              <div><Label className="!opacity-70">BMI</Label><p className="font-serif text-2xl">{inputs.bmi}</p></div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
