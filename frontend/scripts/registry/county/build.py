import csv, json, sys, os
RAW = sys.argv[1]; OUT = sys.argv[2]
AREA = {
 'East Uusimaa wellbeing services county':'ita-uusimaa','Central Uusimaa wellbeing services county':'keski-uusimaa',
 'West Uusimaa wellbeing services county':'lansi-uusimaa','Vantaa and Kerava wellbeing services county':'vantaa-kerava',
 'Päijät-Häme wellbeing services county':'paijat-hame','Kymenlaakso wellbeing services county':'kymenlaakso',
 'South Karelia wellbeing services county':'etela-karjala','City of Helsinki':'helsinki',
 'South Savo wellbeing services county':'etela-savo','North Savo wellbeing services county':'pohjois-savo',
 'North Karelia wellbeing services county':'pohjois-karjala','Central Finland wellbeing services county':'keski-suomi',
 'Kanta-Häme wellbeing services county':'kanta-hame','Pirkanmaa wellbeing services county':'pirkanmaa',
 'South Ostrobothnia wellbeing services county':'etela-pohjanmaa','Southwest Finland wellbeing services county':'varsinais-suomi',
 'Satakunta wellbeing services county':'satakunta','Ostrobothnia wellbeing services county':'pohjanmaa',
 'Central Ostrobothnia wellbeing services county':'keski-pohjanmaa','North Ostrobothnia wellbeing services county':'pohjois-pohjanmaa',
 'Kainuu wellbeing services county':'kainuu','Lapland wellbeing services county':'lappi','Whole country':'_whole_country'}
SITE = {'C33-34':'lung','C18-20':'bowel','C21':'_anus','C25':'pancreas','C22':'liver','C50':'breast','C53':'cervical'}
def num(s):
    s = (s or '').strip()
    if s in ('', '-'): return None
    return float(s.replace(',', '.'))
def rows(name):
    with open(os.path.join(RAW, name + '.csv'), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=';'))
d = {}
def slot(a, s):
    return d.setdefault(AREA[a], {}).setdefault(SITE[s], {})
for nm in ['inc_both', 'inc_female']:
    for r in rows(nm):
        x = slot(r['Area'], r['ICD-10'])
        x['casesTotal5y'] = num(r['Diagnosed cancer cases'])
        x['incCrudeRate'] = num(r['Rate per 100,000'])
        x['incASR_Finland2014'] = num(r['Rate per 100,000, age-standardised (Finland 2014)'])
        x['incASR_World'] = num(r['Rate per 100,000, age-standardised (world standard population)'])
for nm in ['mort_both', 'mort_female']:
    for r in rows(nm):
        x = slot(r['Area'], r['ICD-10'])
        x['deathsTotal5y'] = num(r['Cancer deaths'])
        x['mortCrudeRate'] = num(r['Mortality per 100,000'])
        x['mortASR_Finland2014'] = num(r['Mortality per 100,000, age-standardised (Finland 2014)'])
        x['mortASR_World'] = num(r['Mortality per 100,000, age-standardised (world standard population)'])
for nm in ['pstage_both', 'pstage_female']:
    for r in rows(nm):
        x = slot(r['Area'], r['ICD-10'])
        k = {'Localized':'localized','Non-localized':'nonLocalized','Unknown':'unknown'}[r['Cancer stage']]
        x.setdefault('stageCounts', {})[k] = num(r['Diagnosed cancer cases, preliminary'])
for nm in ['pinc_both', 'pinc_female']:
    for r in rows(nm):
        x = slot(r['Area'], r['ICD-10'])
        x['prelimCasesTotal5y_2021_2025'] = num(r['Diagnosed cancer cases, preliminary'])
# national final-statistics stage 2020-2024 (no regional breakdown in final stats)
natstage = {}
for nm in ['stage_both', 'stage_female']:
    for r in rows(nm):
        k = {'Localized':'localized','Non-localized':'nonLocalized','Unknown':'unknown'}[r['Cancer stage']]
        natstage.setdefault(SITE[r['ICD-10']], {})[k] = num(r['Diagnosed cancer cases'])
def r4(v): return None if v is None else round(v, 4)
def shares(sc):
    if not sc: return None, None, None
    L, N, U = sc.get('localized'), sc.get('nonLocalized'), sc.get('unknown')
    late = r4(N / (L + N)) if L is not None and N is not None and (L + N) > 0 else None
    unk = r4(U / (L + N + U)) if None not in (L, N, U) and (L + N + U) > 0 else None
    lateAll = r4(N / (L + N + U)) if None not in (L, N, U) and (L + N + U) > 0 else None
    return late, unk, lateAll
out = {}
for area, cs in d.items():
    # derived C18-21
    b, a = cs.get('bowel', {}), cs.pop('_anus', {})
    for cid, x in cs.items():
        late, unk, lateAll = shares(x.get('stageCounts'))
        ct, dt = x.get('casesTotal5y'), x.get('deathsTotal5y')
        o = {
          'cases': None if ct is None else round(ct / 5, 1),
          'deaths': None if dt is None else round(dt / 5, 1),
          'lateShare': late,
          'unknownStageShare': unk,
          'years': '2020-2024',
          'stageYears': '2021-2025 (preliminary statistics)',
          'nonLocalizedShareOfAllCases': lateAll,
          **{k: x.get(k) for k in ['casesTotal5y','deathsTotal5y','stageCounts','prelimCasesTotal5y_2021_2025','incCrudeRate','incASR_Finland2014','incASR_World','mortCrudeRate','mortASR_Finland2014','mortASR_World']},
          'expected': None,
        }
        sc = x.get('stageCounts') or {}
        L, N, U = sc.get('localized'), sc.get('nonLocalized'), sc.get('unknown')
        tot = x.get('prelimCasesTotal5y_2021_2025')
        bounds = None
        if late is None and sc:
            # exactly the registry's rule: blank count means 1-4. Bounds only, no point estimate.
            if L is None and N is not None:
                bounds = [r4(N / (N + 4)), r4(N / (N + 1))]
            elif N is None and L is not None:
                bounds = [r4(1 / (L + 1)), r4(4 / (L + 4))]
        o['lateShareBounds'] = bounds
        # denominators from the published (unsuppressed) preliminary 5-year total, so suppression elsewhere does not null these
        if tot:
            if U is not None: o['unknownStageShare'] = r4(U / tot)
            if N is not None: o['nonLocalizedShareOfAllCases'] = r4(N / tot)
        if cid == 'bowel':
            o['icd10'] = 'C18-C20'
            o['anusC21'] = {'casesTotal5y': a.get('casesTotal5y'), 'deathsTotal5y': a.get('deathsTotal5y'), 'stageCounts': a.get('stageCounts')}
            if b.get('casesTotal5y') is not None and a.get('casesTotal5y') is not None:
                o['casesC18_21'] = round((b['casesTotal5y'] + a['casesTotal5y']) / 5, 1)
            if b.get('deathsTotal5y') is not None and a.get('deathsTotal5y') is not None:
                o['deathsC18_21'] = round((b['deathsTotal5y'] + a['deathsTotal5y']) / 5, 1)
        else:
            o['icd10'] = {'lung':'C33-C34','pancreas':'C25','liver':'C22','breast':'C50 (women only)','cervical':'C53'}[cid]
        if cid in ('breast','cervical'): o['sex'] = 'female'
        else: o['sex'] = 'both'
        out.setdefault(area, {})[cid] = o
order = [v for v in AREA.values() if v != '_whole_country']
final = {k: out[k] for k in order}
nat = out['_whole_country']
nat_final_stage = {}
for cid, sc in natstage.items():
    if cid == '_anus': continue
    late, unk, lateAll = shares(sc)
    nat_final_stage[cid] = {'stageCounts': sc, 'lateShare': late, 'unknownStageShare': unk, 'nonLocalizedShareOfAllCases': lateAll, 'years': '2020-2024 (final statistics)'}
final['_meta'] = {
  'source': 'Finnish Cancer Registry statistics application, https://tilastot.syoparekisteri.fi/syovat/ (English UI: ?_inputs_&language=%22en%22); data from 2026-04-02, version 2026-04-22-001; licence CC BY 4.0',
  'retrieved': '2026-11-14',
  'cases': 'mean per year = (Diagnosed cancer cases, tab "Latest 5-year period (2020-2024)") / 5',
  'deaths': 'mean per year = (Cancer deaths, tab "Latest 5-year period (2020-2024)") / 5; region = region of residence in year of death',
  'lateShare': 'Non-localized / (Localized + Non-localized), unknown stage EXCLUDED from denominator; from preliminary statistics 2021-2025 tab "Cancer stage" (final 2020-2024 stage exists only for whole country). NOT TNM III-IV: registry categories are only Localized / Non-localized / Unknown.',
  'unknownStageShare': 'Unknown / all cases in preliminary statistics 2021-2025 (tab Latest 5-year period (2021-2025), which equals the sum of the stage rows), same source as lateShare',
  'nonLocalizedShareOfAllCases': 'Non-localized / all cases (unknown in denominator) - a lower bound',
  'suppression': 'the registry blanks counts of 1-4; such values are null here (not back-calculated). Where only one of Localized/Non-localized is blanked, lateShareBounds gives the [min,max] lateShare implied by the 1-4 range; lateShare stays null.',
  'expected': 'not published by the app; null everywhere',
  'bowel': 'C18-C20 (Colon and rectum); C21 anus given separately under anusC21, and casesC18_21/deathsC18_21 sum them',
}
final['_whole_country'] = nat
final['_whole_country_final_stage_2020_2024'] = nat_final_stage
json.dump(final, open(OUT, 'w'), ensure_ascii=False, indent=1)
# summary
for k in order:
    print(k.ljust(18), ' '.join(f"{c}:{final[k][c]['cases']}/{final[k][c]['deaths']}/{final[k][c]['lateShare']}/{final[k][c]['unknownStageShare']}" for c in ['lung','bowel','pancreas','liver','breast','cervical']))
print('nat', {c: (nat[c]['cases'], nat[c]['deaths'], nat[c]['lateShare'], nat[c]['unknownStageShare']) for c in nat})
print('natfinal', {c: (v['lateShare'], v['unknownStageShare']) for c, v in nat_final_stage.items()})
