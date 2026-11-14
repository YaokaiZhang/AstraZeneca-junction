import csv, json, sys, os
RAW, OUT = sys.argv[1], sys.argv[2]
def rd(n):
    with open(os.path.join(RAW, n), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=';'))
num = lambda s: None if s is None or s.strip() in ('', '-') else float(s.replace(',', '.'))
SEX = {'Male': 'm', 'Female': 'f'}
SITE = {'C18-20': 'bowel', 'C21': 'anus', 'C50': 'breast', 'C53': 'cervical', 'C33-34': 'lung'}
AG5 = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79','80-84','85+']
AG10 = ['0-9','10-19','20-29','30-39','40-49','50-59','60-69','70-79','80+']
YEARS = 5
# person-years (5-year total) per sex x 5y band from all-cancers counts/rates
py = {'f': {}, 'm': {}}
for r in rd('inc_ag5_all.csv'):
    py[SEX[r['Sex']]][r['Age group (5y.)']] = num(r['Diagnosed cancer cases']) / num(r['Rate per 100,000']) * 1e5
def ag_table(fname, cnt, rate):
    t = {}
    for r in rd(fname):
        c, s, a = SITE[r['ICD-10']], SEX[r['Sex']], r['Age group (5y.)']
        d = t.setdefault(c, {}).setdefault(s, {'rate5': {}, 'count5_total': {}})
        d['rate5'][a] = num(r[rate]); d['count5_total'][a] = num(r[cnt])
    for c in t:
        for s, d in t[c].items():
            d['rate5'] = [d['rate5'][a] for a in AG5]
            d['count5_total'] = [None if d['count5_total'][a] is None else int(d['count5_total'][a]) for a in AG5]
            r10 = []
            for i in range(9):
                a1, a2 = AG5[2*i], AG5[2*i+1]
                w1, w2 = py[s][a1], py[s][a2]
                r10.append(round((d['rate5'][2*i]*w1 + d['rate5'][2*i+1]*w2) / (w1+w2), 2))
            d['rate10'] = r10
    return t
inc = ag_table('inc_ag5_rate.csv', 'Diagnosed cancer cases', 'Rate per 100,000')
mort = ag_table('mort_ag5.csv', 'Cancer deaths', 'Mortality per 100,000')
def derive_c18_21(t):
    out = {}
    for s in ('f', 'm'):
        r5 = [round(a+b, 2) for a, b in zip(t['bowel'][s]['rate5'], t['anus'][s]['rate5'])]
        r10 = [round(a+b, 2) for a, b in zip(t['bowel'][s]['rate10'], t['anus'][s]['rate10'])]
        out[s] = {'rate5': r5, 'rate10': r10, 'note': 'derived: sum of published C18-20 and C21 rates (same population denominator)'}
    return out
inc['bowel_C18_21'] = derive_c18_21(inc)
mort['bowel_C18_21'] = derive_c18_21(mort)
tot = {}
for r in rd('inc_latest5.csv'):
    c, s = SITE[r['ICD-10']], SEX[r['Sex']]
    tot.setdefault(c, {})[s] = {'cases_total_2020_2024': int(num(r['Diagnosed cancer cases'])), 'cases_per_year': round(num(r['Diagnosed cancer cases'])/YEARS, 1),
        'crude_rate': num(r['Rate per 100,000']), 'asr_finland2014': num(r['Rate per 100,000, age-standardised (Finland 2014)']),
        'asr_world1966': num(r['Rate per 100,000, age-standardised (world standard population)'])}
for r in rd('mort_latest5.csv'):
    c, s = SITE[r['ICD-10']], SEX[r['Sex']]
    d = tot.setdefault(c, {}).setdefault(s, {})
    d['deaths_total_2020_2024'] = int(num(r['Cancer deaths'])); d['deaths_per_year'] = round(num(r['Cancer deaths'])/YEARS, 1)
    d['mortality_crude_rate'] = num(r['Mortality per 100,000']); d['mortality_asr_finland2014'] = num(r['Mortality per 100,000, age-standardised (Finland 2014)'])
for r in rd('inc_stage.csv'):
    c, s = SITE[r['ICD-10']], SEX[r['Sex']]
    d = tot[c][s].setdefault('stage_2020_2024', {})
    d[r['Cancer stage'].lower().replace('-', '_')] = int(num(r['Diagnosed cancer cases']))
for c in tot:
    for s, d in tot[c].items():
        st = d['stage_2020_2024']; n = sum(st.values())
        assert n == d['cases_total_2020_2024'], (c, s, n)
        d['stage_share'] = {k: round(v/n, 3) for k, v in st.items()}
        known = st['localized'] + st['non_localized']
        d['stage_share_of_known'] = {'localized': round(st['localized']/known, 3), 'non_localized': round(st['non_localized']/known, 3)}
for s in ('f', 'm'):
    b, a = tot['bowel'][s], tot['anus'][s]
    tot.setdefault('bowel_C18_21', {})[s] = {'cases_per_year': round((b['cases_total_2020_2024']+a['cases_total_2020_2024'])/YEARS, 1),
        'deaths_per_year': round((b['deaths_total_2020_2024']+a['deaths_total_2020_2024'])/YEARS, 1), 'note': 'derived: C18-20 + C21'}
out = {
  'source': 'Finnish Cancer Registry, Cancer statistics application https://tilastot.syoparekisteri.fi/syovat/',
  'retrieved': '2026-11-14', 'period': '2020-2024', 'years': [2020, 2021, 2022, 2023, 2024], 'area': 'Whole country (Finland)',
  'units': 'rate = new cases (or deaths) per 100 000 person-years, i.e. per 100 000 per year, crude age-specific',
  'definitions': {'bowel': 'Colon and rectum, ICD-10 C18-20 (registry site code 58); anus C21 given separately as "anus"; "bowel_C18_21" = derived sum',
                  'breast': 'C50', 'cervical': 'Cervix uteri, C53', 'lung': 'Lung, trachea, C33-34', 'anus': 'C21'},
  'age_bands_5y': AG5, 'age_bands_10y': AG10,
  'collapse_method': 'rate10 = population-weighted mean of the two 5-year rates; weights = person-years per sex and 5-year band, derived from the registry all-sites (site 0) table as cases/rate*1e5 for 2020-2024. 80+ = 80-84 and 85+.',
  'person_years_2020_2024': {s: [round(py[s][a]) for a in AG5] for s in ('f', 'm')},
  'count5_total_note': 'count5_total = cases over the whole 5-year period; null = suppressed by the registry (counts 1-4 not shown; the rate is still published)',
  'incidence': inc, 'mortality_by_age': mort, 'national': tot,
  'stage_note': 'Registry stage categories: localized / non-localized / unknown, as published in tab "Cancer stage (2020-2024)". Unknown is large for bowel and lung.',
}
json.dump(out, open(OUT, 'w'), indent=1)
for c in ('bowel', 'breast', 'cervical', 'lung'):
    for s in ('f', 'm'):
        if s in inc[c]: print(c, s, inc[c][s]['rate10'])
