#!/usr/bin/env python3
"""Build src/data/registry.generated.ts: real cancer figures per county.

  python3 scripts/build_cancer_data.py

Inputs (all committed, re-fetch with the scripts named):
- scripts/registry/county/registry_counties.json  Finnish Cancer Registry, by county (registry/county/run.cjs + build.py)
    cases and deaths: mean per year 2020-2024; stage: preliminary 2021-2025 (the only county stage table)
- scripts/registry/county/raw/inc_ag5_rate_{m,f}.csv  national incidence by 5-year age band and sex, 2020-2024
    (registry/county/age_rates.cjs)
- scripts/data/statfin_population.json  county population by 5-year age band and sex, 31 Dec 2023 (fetch_statfin.py)

Per county and cancer:
- cases, deaths: Registry means per year. Where the Registry hides a death count of 1-4, deaths are taken from its
  published crude mortality rate × the population implied by its crude incidence rate.
- lateShare: non-localized ÷ (localized + non-localized); unknown stage left out. A hidden stage count (1-4) is
  taken as 2.5 and the cell is flagged.
- expected: indirect standardisation. National age × sex rates × the county's 2023 population, then scaled so the
  22 counties together expect exactly the cases they had (Åland and the 2023 snapshot otherwise shift the total).
- exp75: share of the expected cases that fall in people 75+ (used by the 2035 projection).
"""
import csv
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
REG = HERE / 'registry/county'
OUT = HERE.parent / 'src/data/registry.generated.ts'
CANCERS = ['lung', 'bowel', 'pancreas', 'liver', 'breast', 'cervical']
SITE = {'C33-34': 'lung', 'C18-20': 'bowel', 'C25': 'pancreas', 'C22': 'liver', 'C50': 'breast', 'C53': 'cervical'}
FEMALE_ONLY = {'breast', 'cervical'}  # the Registry's county figures for these are women only
HIDDEN = 2.5  # midpoint of a hidden count of 1-4


def num(s):
    s = (s or '').strip()
    return None if s in ('', '-') else float(s.replace(',', '.'))


def age_rates():
    """{cancer: {'m': [18 rates per 100k], 'f': [...]}}"""
    out = {k: {'m': [0.0] * 18, 'f': [0.0] * 18} for k in CANCERS}
    for sex in 'mf':
        with open(REG / f'raw/inc_ag5_rate_{sex}.csv', encoding='utf-8-sig') as f:
            for r in csv.DictReader(f, delimiter=';'):
                k = SITE.get(r['ICD-10'])
                if not k:
                    continue
                band = 17 if r['Age group (5y.)'] == '85+' else int(r['Age group (5y.)'].split('-')[0]) // 5
                out[k][sex][band] = num(r['Rate per 100,000']) or 0.0
    return out


def main():
    reg = json.loads((REG / 'registry_counties.json').read_text())
    pop = json.loads((HERE / 'data/statfin_population.json').read_text())['population']
    rates = age_rates()
    counties = [k for k in reg if not k.startswith('_')]
    assert set(counties) == set(pop), set(counties) ^ set(pop)

    rows: dict = {c: {} for c in counties}
    for k in CANCERS:
        sexes = 'f' if k in FEMALE_ONLY else 'mf'
        raw_exp, exp75 = {}, {}
        for c in counties:
            e = [sum(rates[k][s][b] * pop[c][s][b] / 1e5 for s in sexes) for b in range(18)]
            raw_exp[c] = sum(e)
            exp75[c] = sum(e[15:]) / sum(e)
        scale = sum(reg[c][k]['cases'] for c in counties) / sum(raw_exp.values())
        for c in counties:
            x = reg[c][k]
            deaths = x['deaths']
            deaths_from_rate = deaths is None
            if deaths_from_rate:  # hidden count: published crude rate × implied population
                deaths = x['mortCrudeRate'] * x['cases'] / x['incCrudeRate']
            sc = x['stageCounts']
            loc, non = sc['localized'], sc['nonLocalized']
            stage_hidden = loc is None or non is None
            loc, non = HIDDEN if loc is None else loc, HIDDEN if non is None else non
            rows[c][k] = {
                'cases': round(x['cases'], 1),
                'deaths': round(deaths, 1),
                'lateShare': round(non / (loc + non), 3),
                'stageKnown': loc + non,
                'unknownStage': round(x['unknownStageShare'], 3),
                'expected': round(raw_exp[c] * scale, 1),
                'exp75': round(exp75[c], 3),
                **({'stageHidden': True} if stage_hidden else {}),
                **({'deathsFromRate': True} if deaths_from_rate else {}),
            }
        print(f'{k:9s} expected scale {scale:.3f}')

    fi = reg['_whole_country']
    total_pop = sum(sum(v['m']) + sum(v['f']) for v in pop.values())
    national = {}
    for k in CANCERS:
        x = fi[k]
        sc = x['stageCounts']
        national[k] = {
            'ratePer100k': round(x['cases'] / total_pop * 1e5, 1),  # per 100 000 of everyone, women-only sites too
            'fatality': round(x['deaths'] / x['cases'], 3),
            'lateShare': round(sc['nonLocalized'] / (sc['localized'] + sc['nonLocalized']), 3),
            'unknownStage': round(x['unknownStageShare'], 3),
            'cases': round(x['cases'], 1),
        }

    body = json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('},"', '},\n  "')
    OUT.write_text(
        '// GENERATED by scripts/build_cancer_data.py from the Finnish Cancer Registry and Statistics Finland. Do not edit.\n'
        '// cases, deaths: mean per year 2020-2024. Stage: preliminary 2021-2025. expected: indirect standardisation.\n'
        'import type { RegistryFigures, RegistryNational } from \'./counties\'\n\n'
        f'export const REGISTRY: Record<string, Record<string, RegistryFigures>> = {body}\n\n'
        f'export const REGISTRY_FI: Record<string, RegistryNational> = {json.dumps(national, separators=(",", ":"))}\n'
    )
    print('wrote', OUT)


if __name__ == '__main__':
    main()
