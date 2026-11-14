#!/usr/bin/env python3
"""Download the Statistics Finland tables behind the county cancer figures.

  python3 scripts/fetch_statfin.py            # writes scripts/data/statfin_*.json

- Population by 5-year age band and sex per county, 31 Dec 2023 (table 11re, municipalities summed into
  counties using the municipality list in src/pages/county/towns.ts). Used for expected cases.
- Cancer deaths by wellbeing services county and cause, 2021-2025 (table 13u5, open PxWeb API). Kept as a
  cross-check: the app uses the Cancer Registry's own death counts, which match its case definitions.

Then run scripts/build_cancer_data.py to regenerate src/data/registry.generated.ts.
"""
import itertools
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'data'
API = 'https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin'
YEARS = ['2021', '2022', '2023', '2024', '2025']
POP_YEAR = '2023'

HVA = {
    'HVA01': 'ita-uusimaa', 'HVA02': 'keski-uusimaa', 'HVA03': 'lansi-uusimaa', 'HVA04': 'vantaa-kerava',
    'HVA05': 'varsinais-suomi', 'HVA06': 'satakunta', 'HVA07': 'kanta-hame', 'HVA08': 'pirkanmaa',
    'HVA09': 'paijat-hame', 'HVA10': 'kymenlaakso', 'HVA11': 'etela-karjala', 'HVA12': 'etela-savo',
    'HVA13': 'pohjois-savo', 'HVA14': 'pohjois-karjala', 'HVA15': 'keski-suomi', 'HVA16': 'etela-pohjanmaa',
    'HVA17': 'pohjanmaa', 'HVA18': 'keski-pohjanmaa', 'HVA19': 'pohjois-pohjanmaa', 'HVA20': 'kainuu',
    'HVA21': 'lappi', 'HVA90': 'helsinki', 'SSS': 'finland',
}
# time-series cause-of-death classification -> app cancer ids (bowel = colon 07 + rectum/anus 08)
CAUSES = {'04-21': 'all', '07': 'colon', '08': 'rectum', '09': 'liver', '10': 'pancreas', '11': 'lung', '13': 'breast', '14': 'cervical'}


def post(table: str, query: list) -> dict:
    body = json.dumps({'query': query, 'response': {'format': 'json-stat2'}}).encode()
    req = urllib.request.Request(f'{API}/{table}', data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def cells(d: dict):
    keys = [list(d['dimension'][k]['category']['index'].keys()) for k in d['id']]
    for i, combo in enumerate(itertools.product(*keys)):
        yield combo, d['value'][i]


def deaths() -> dict:
    d = post('ksyyt/13u5.px', [
        {'code': 'alue_23_20260101', 'selection': {'filter': 'item', 'values': list(HVA)}},
        {'code': 'kuolinsyyt_1_20210101', 'selection': {'filter': 'item', 'values': list(CAUSES)}},
        {'code': 'timeperiod_y', 'selection': {'filter': 'item', 'values': YEARS}},
        {'code': 'contentscode', 'selection': {'filter': 'item', 'values': ['ksyylkm']}},
    ])
    out: dict = {}
    for (area, cause, year, _), v in cells(d):
        out.setdefault(HVA[area], {}).setdefault(CAUSES[cause], {})[year] = v
    for c in out.values():
        c['bowel'] = {y: c['colon'][y] + c['rectum'][y] for y in YEARS}
    return {'table': '13u5', 'years': YEARS, 'deaths': out}


def population() -> dict:
    towns = (ROOT.parent / 'src/pages/county/towns.ts').read_text()
    muni = {'KU' + code: county for code, county in re.findall(r"\['(\d{3})', \"[^\"]+\", '([a-z-]+)'", towns)}
    d = post('vaerak/11re.px', [
        {'code': 'alue_23_20260101', 'selection': {'filter': 'item', 'values': list(muni)}},
        {'code': 'ikaryhma_10_20180101', 'selection': {'filter': 'all', 'values': ['*']}},
        {'code': 'sukupuoli_9_20180101', 'selection': {'filter': 'item', 'values': ['1', '2']}},
        {'code': 'timeperiod_y', 'selection': {'filter': 'item', 'values': [POP_YEAR]}},
    ])
    out: dict = {}
    for (area, age, sex, _, _), v in cells(d):
        if age == 'SSS':
            continue
        band = min(17, (100 if age.startswith('100') else int(age)) // 5)  # 0-4 ... 85+
        arr = out.setdefault(muni[area], {'m': [0] * 18, 'f': [0] * 18})['m' if sex == '1' else 'f']
        arr[band] += v or 0
    return {'table': '11re', 'year': POP_YEAR, 'bands': '0-4 ... 80-84, 85+', 'population': out}


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    (OUT / 'statfin_deaths.json').write_text(json.dumps(deaths(), indent=1))
    (OUT / 'statfin_population.json').write_text(json.dumps(population()))
    print('wrote', OUT / 'statfin_deaths.json', OUT / 'statfin_population.json')
