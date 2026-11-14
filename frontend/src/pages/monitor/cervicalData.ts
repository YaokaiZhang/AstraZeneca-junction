// Cervical cancer screening, 2024 round. Finnish Cancer Registry (Suomen Syöpärekisteri) mass screening
// annual statistics "Kohdunkaulasyövän seulontaohjelma: vuositilasto", published 20 May 2026 (20.05.2026),
// retrieved 14 Nov 2026 from https://stats.cancerregistry.fi/joukkistilastot/kohtu.html
// (kohdunkaulansyopa.html is only a loader page; kohtu.html is the cervical screening report.)
//
// Section "Hyvinvointialueet", year 2024: tables "Seulontaketju", "Seulontatulokset", "Histologiset
// löydökset" and the chart "Viipeet kolposkopiaan pääsyssä". Each table is published twice:
//   - Ikäryhmäseulonta  = routine age-group screening (ages 30–65 in five-year steps; some municipalities
//     also invite 25-year-olds)  -> AGE_GROUP_CSV / CERVICAL
//   - Riskiryhmäseulonta = repeat test 18–24 months after a mild positive (HPV+, ASC-US, LSIL without
//     referral) in the previous round   -> RISK_GROUP_CSV / CERVICAL_RISK
//
// The CSVs keep the source numbers verbatim (decimal comma -> dot, "–" -> empty) so they can be checked
// line by line. Only the county name "Helsingin kaupunki" is shortened to "Helsinki" and "Yhteensä" is
// written "Finland". The source also has an Ahvenanmaa (Åland) row: it is kept in the CSV but filtered out
// of CERVICAL. NOTE: the source's "Yhteensä" (= our Finland row) INCLUDES Åland.
//
// Column meanings (denominator of each % as in the source):
//   invited                       Kutsuttu. Since 2020 = everyone picked for invitation from the population
//                                 register (a few may not actually have been sent an invitation).
//   participated / _pct           Osallistunut (of invited)
//   risk_group_referral / _pct    Suositus riskiryhmäseulontaan (of participated): mild finding, re-test in 18–24 mo
//   referred_colposcopy / _pct    Lähete kolposkopiaan (of participated) = screen positive, referred onward
//   colposcopy_done / _pct        Käynyt kolposkopiassa (of referred), as reported to the registry
//   hsil_plus / _pct              Histologinen HSIL tai vakavampi (of colposcopy done) = HSIL + AIS + cancer
//   hpv_tested / _pct             HPV-testattu (of participated). Shows HPV vs Pap primary test per county.
//   hpv_positive / _pct           HPV-positiivinen (of HPV tested)
//   normal / _pct                 Normaali tulos (of participated)
//   uninterpretable               Ei tulkittavissa/tieto puuttuu (N; % omitted, all ≤0.5)
//   cancers, ais, hsil, lsil, normal_benign, other_unknown, no_followup_info
//                                 Histologiset löydökset, N among those REFERRED to colposcopy (the source's
//                                 % columns are omitted; they are N / referred_colposcopy). Cancer = invasive
//                                 + microinvasive cervical carcinoma. no_followup_info = "Ei tietoa
//                                 jatkotutkimuksista": no colposcopy, or colposcopy data not sent to the registry.
//   median_months_to_colposcopy_approx
//                                 NOT a published number: the source shows the median delay from positive test
//                                 to colposcopy only as a PNG dot chart. Measured from the chart's pixels (dot
//                                 centre, axis calibrated on the 0/3/6/9 ticks), ± ~0.1 month. Finland row = the
//                                 chart's dashed national-median line. Empty for Åland (not in the chart).
//
// Data caveats visible in the source itself (see CERVICAL_CAVEATS):
//   - Varsinais-Suomi: only 4 of 190 referred have a colposcopy in the registry and 186 are "no follow-up
//     info". This is a reporting gap, not 2% attendance; its colposcopy/histology/delay figures are unusable.
//   - Kainuu used the Pap test (1 of 2594 HPV tested); Pohjois-Pohjanmaa was mixed (23.1% HPV tested).
//     Nationally 92% of 2024 screening was HPV-based, 8% Pap (source text "Ohjelman perustiedot").
//   - Colposcopy attendance has been registered comprehensively only since about 2022 (source definitions).
//   - Findings are those reported to the screening registry by spring 2026; later cancers linked from the
//     cancer registry are not included.

export const CERVICAL_YEAR = 2024
export const CERVICAL_AGES = '30–65'
/** Primary test in the 2024 round: HPV nationally (92 % of screening), Pap in some counties (8 %). */
export const CERVICAL_TEST = 'HPV'
export const CERVICAL_SOURCE_URL = 'https://stats.cancerregistry.fi/joukkistilastot/kohtu.html'
export const CERVICAL_PUBLISHED = '2026-05-20'
export const CERVICAL_RETRIEVED = '2026-11-14'

/** Ikäryhmäseulonta (routine age-group screening), 2024, by wellbeing county. */
export const AGE_GROUP_CSV = `county,invited,participated,participation_pct,risk_group_referral,risk_group_referral_pct,referred_colposcopy,referred_colposcopy_pct,colposcopy_done,colposcopy_of_referred_pct,hsil_plus,hsil_plus_of_colposcopy_pct,hpv_tested,hpv_tested_pct,hpv_positive,hpv_positive_pct,normal,normal_pct,uninterpretable,cancers,ais,hsil,lsil,normal_benign,other_unknown,no_followup_info,median_months_to_colposcopy_approx
Ahvenanmaa,1545,1235,79.9,77,6.2,6,0.5,0,0.0,0,,1228,99.4,83,6.8,1152,93.3,0,0,0,0,0,0,0,6,
Etelä-Karjala,5942,4560,76.7,230,5.0,59,1.3,49,83.1,20,40.8,4560,100.0,289,6.3,4271,93.7,0,2,0,18,13,15,1,10,3.7
Etelä-Pohjanmaa,8922,7315,82.0,403,5.5,95,1.3,89,93.7,38,42.7,7313,100.0,496,6.8,6817,93.2,0,0,0,38,29,21,1,6,3.3
Etelä-Savo,6029,4955,82.2,302,6.1,63,1.3,57,90.5,23,40.4,4875,98.4,347,7.1,4590,92.6,0,1,0,22,24,10,0,6,0.6
Helsinki,38382,27514,71.7,1753,6.4,277,1.0,260,93.9,105,40.4,27513,100.0,2027,7.4,25482,92.6,2,2,5,98,46,109,0,17,7.8
Itä-Uusimaa,5125,3909,76.3,179,4.6,24,0.6,23,95.8,9,39.1,3909,100.0,203,5.2,3706,94.8,0,1,1,7,9,5,0,1,3.6
Kainuu,3305,2594,78.5,72,2.8,13,0.5,10,76.9,6,60.0,1,0.0,0,0.0,2506,96.6,3,1,0,5,1,3,0,3,2.8
Kanta-Häme,8312,5814,69.9,361,6.2,88,1.5,80,90.9,30,37.5,5814,100.0,449,7.7,5365,92.3,0,2,0,28,21,28,1,8,3.2
Keski-Pohjanmaa,3114,2152,69.1,107,5.0,30,1.4,28,93.3,12,42.9,2152,100.0,137,6.4,2015,93.6,0,1,2,9,10,5,1,2,3.5
Keski-Suomi,13086,9182,70.2,482,5.2,111,1.2,91,82.0,32,35.2,9140,99.5,590,6.5,8589,93.5,0,0,1,31,50,3,6,20,3.6
Keski-Uusimaa,10808,8294,76.7,416,5.0,89,1.1,87,97.8,34,39.1,8294,100.0,505,6.1,7789,93.9,0,1,1,32,39,14,0,2,7.2
Kymenlaakso,7751,5968,77.0,317,5.3,63,1.1,57,90.5,24,42.1,5968,100.0,380,6.4,5588,93.6,0,2,0,22,13,20,0,6,2.6
Lappi,8555,6825,79.8,485,7.1,123,1.8,100,81.3,34,34.0,6493,95.1,584,9.0,6216,91.1,1,0,1,33,35,28,3,23,4.4
Länsi-Uusimaa,26151,19429,74.3,917,4.7,181,0.9,174,96.1,55,31.6,19428,100.0,1097,5.6,18331,94.3,0,1,2,52,43,73,3,7,5.1
Pirkanmaa,27033,19198,71.0,1172,6.1,255,1.3,242,94.9,85,35.1,19198,100.0,1427,7.4,17768,92.6,3,2,4,79,67,85,5,13,4.8
Pohjanmaa,8088,5841,72.2,267,4.6,80,1.4,78,97.5,33,42.3,5841,100.0,347,5.9,5494,94.1,0,2,3,28,27,15,3,2,6.0
Pohjois-Karjala,7572,5135,67.8,205,4.0,93,1.8,91,97.8,37,40.7,5135,100.0,296,5.8,4813,93.7,24,2,2,33,40,12,2,2,3.5
Pohjois-Pohjanmaa,19455,14288,73.4,654,4.6,146,1.0,107,73.3,54,50.5,3294,23.1,218,6.6,13487,94.4,1,2,2,50,11,40,2,39,3.3
Pohjois-Savo,12037,8367,69.5,530,6.3,110,1.3,106,96.4,40,37.7,8281,99.0,616,7.4,7727,92.4,0,2,2,36,36,25,5,4,0.6
Päijät-Häme,9996,6817,68.2,423,6.2,111,1.6,107,96.4,38,35.5,6717,98.5,526,7.8,6283,92.2,0,2,3,33,30,36,3,4,4.9
Satakunta,10022,7170,71.5,420,5.9,99,1.4,97,98.0,34,35.1,7169,100.0,518,7.2,6651,92.8,0,0,2,32,25,33,5,2,3.8
Vantaa ja Kerava,15285,10952,71.7,616,5.6,139,1.3,134,96.4,51,38.1,10952,100.0,755,6.9,10197,93.1,0,1,2,48,41,42,0,5,8.3
Varsinais-Suomi,24297,18823,77.5,1065,5.7,190,1.0,4,2.1,2,50.0,17015,90.4,1131,6.6,17564,93.3,4,0,0,2,2,0,0,186,3.0
Finland,280812,206337,73.5,11453,5.6,2445,1.2,2071,84.7,796,38.4,190290,92.2,13021,6.8,192401,93.2,38,27,33,736,612,622,41,374,3.8`

/** Riskiryhmäseulonta (repeat test after a mild positive), 2024, by wellbeing county. */
export const RISK_GROUP_CSV = `county,invited,participated,participation_pct,risk_group_referral,risk_group_referral_pct,referred_colposcopy,referred_colposcopy_pct,colposcopy_done,colposcopy_of_referred_pct,hsil_plus,hsil_plus_of_colposcopy_pct,hpv_tested,hpv_tested_pct,hpv_positive,hpv_positive_pct,normal,normal_pct,uninterpretable,cancers,ais,hsil,lsil,normal_benign,other_unknown,no_followup_info,median_months_to_colposcopy_approx
Ahvenanmaa,43,39,90.7,0,0.0,7,17.9,0,0.0,0,,39,100.0,7,17.9,32,82.1,0,0,0,0,0,0,0,7,
Etelä-Karjala,270,223,82.6,0,0.0,101,45.3,85,84.2,11,12.9,223,100.0,101,45.3,122,54.7,0,0,0,11,35,38,1,16,7.4
Etelä-Pohjanmaa,368,328,89.1,0,0.0,119,36.3,106,89.1,22,20.8,325,99.1,116,35.7,209,63.7,0,0,0,22,25,54,5,13,7.3
Etelä-Savo,277,237,85.6,84,35.4,16,6.8,16,100.0,5,31.2,232,97.9,100,43.1,137,57.8,0,0,0,5,9,2,0,0,0.7
Helsinki,1972,1613,81.8,3,0.2,797,49.4,748,93.9,146,19.5,1613,100.0,800,49.6,813,50.4,0,3,6,137,182,414,6,49,6.9
Itä-Uusimaa,223,183,82.1,0,0.0,93,50.8,91,97.8,32,35.2,183,100.0,93,50.8,90,49.2,0,2,1,29,38,21,0,2,3.7
Kainuu,47,38,80.9,4,10.5,2,5.3,2,100.0,1,50.0,0,0.0,0,,32,84.2,0,0,0,1,0,1,0,0,4.0
Kanta-Häme,315,259,82.2,0,0.0,126,48.6,108,85.7,19,17.6,259,100.0,126,48.6,133,51.4,0,0,1,18,26,62,1,18,5.9
Keski-Pohjanmaa,63,48,76.2,0,0.0,8,16.7,5,62.5,2,40.0,48,100.0,8,16.7,40,83.3,0,0,0,2,1,2,0,3,5.4
Keski-Suomi,538,443,82.3,0,0.0,198,44.7,165,83.3,24,14.5,437,98.6,198,45.3,245,55.3,0,0,1,23,110,10,21,33,6.5
Keski-Uusimaa,443,364,82.2,2,0.5,175,48.1,170,97.1,62,36.5,364,100.0,177,48.6,186,51.1,1,2,3,57,55,52,1,5,7.4
Kymenlaakso,407,340,83.5,0,0.0,152,44.7,144,94.7,27,18.8,340,100.0,152,44.7,188,55.3,0,1,2,24,27,90,0,8,4.9
Lappi,211,178,84.4,4,2.2,29,16.3,24,82.8,5,20.8,169,94.9,29,17.2,145,81.5,0,0,0,5,7,11,1,5,5.5
Länsi-Uusimaa,1104,915,82.9,2,0.2,414,45.2,396,95.7,70,17.7,915,100.0,416,45.5,499,54.5,0,3,4,63,111,207,8,18,6.4
Pirkanmaa,1085,898,82.8,0,0.0,489,54.5,437,89.4,86,19.7,898,100.0,489,54.5,409,45.5,0,1,4,81,86,248,17,52,5.8
Pohjanmaa,264,205,77.7,0,0.0,23,11.2,22,95.7,10,45.5,205,100.0,23,11.2,182,88.8,0,0,0,10,9,2,1,1,6.3
Pohjois-Karjala,332,242,72.9,2,0.8,125,51.7,121,96.8,19,15.7,242,100.0,126,52.1,112,46.3,3,0,0,19,77,22,3,4,6.3
Pohjois-Pohjanmaa,421,343,81.5,17,5.0,46,13.4,41,89.1,11,26.8,83,24.2,17,20.5,280,81.6,0,0,0,11,7,22,1,5,6.2
Pohjois-Savo,485,394,81.2,4,1.0,205,52.0,187,91.2,34,18.2,394,100.0,206,52.3,185,47.0,0,1,0,33,72,69,12,18,0.7
Päijät-Häme,398,341,85.7,0,0.0,183,53.7,169,92.3,28,16.6,338,99.1,183,54.1,158,46.3,0,1,1,26,36,95,10,14,6.9
Satakunta,401,345,86.0,0,0.0,202,58.6,197,97.5,36,18.3,345,100.0,202,58.6,143,41.4,0,0,2,34,28,95,38,5,6.9
Vantaa ja Kerava,710,576,81.1,1,0.2,302,52.4,282,93.4,45,16.0,576,100.0,303,52.6,273,47.4,0,2,1,42,77,158,2,20,7.3
Varsinais-Suomi,921,789,85.7,0,0.0,320,40.6,1,0.3,0,0.0,789,100.0,320,40.6,469,59.4,0,0,0,0,1,0,0,319,4.1
Finland,11298,9341,82.7,123,1.3,4132,44.2,3517,85.1,695,19.8,9017,96.5,4192,46.5,5082,54.4,4,16,26,653,1019,1675,128,615,6.1`

const parse = (csv: string) => {
  const [head, ...rows] = csv.trim().split('\n')
  const keys = head.split(',')
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], v])) as Record<string, string>)
}
/** Empty cell = not published -> null. */
const val = (v: string | undefined): number | null => (v === undefined || v === '' ? null : +v)
const req = (v: string | undefined): number => {
  const n = val(v)
  if (n === null || Number.isNaN(n)) throw new Error(`cervicalData: missing required value`)
  return n
}

// Same id scheme as data.ts (ids in counties.ts; 'finland' for the national row).
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ ja /g, '-').replace(/\s+/g, '-')

export type PrimaryTest = 'HPV' | 'Pap' | 'mixed'

export interface CervicalRow {
  /** id in counties.ts ('finland' for the national row) */
  id: string
  name: string
  invited: number
  participated: number
  participationPct: number
  /** mild finding -> repeat test in 18–24 months (% of participated) */
  riskGroupReferral: number
  riskGroupReferralPct: number
  /** screen positive, referred to colposcopy (% of participated) */
  referredColposcopy: number
  referredColposcopyPct: number
  /** colposcopy recorded in the registry (% of referred) */
  colposcopyDone: number
  colposcopyOfReferredPct: number
  /** histological HSIL or worse = HSIL + AIS + cancer (% of colposcopy done; null when 0 colposcopies) */
  hsilPlus: number
  hsilPlusOfColposcopyPct: number | null
  hpvTested: number
  hpvTestedPct: number
  hpvPositive: number
  /** % of HPV tested; null when nobody was HPV tested */
  hpvPositivePct: number | null
  normal: number
  normalPct: number
  uninterpretable: number
  /** histology among those referred to colposcopy (N) */
  cancers: number
  ais: number
  hsil: number
  lsil: number
  normalBenign: number
  otherUnknown: number
  /** referred but no colposcopy, or colposcopy data not reported */
  noFollowupInfo: number
  /** derived from hpvTestedPct: ≥90 % HPV, ≤10 % Pap, otherwise mixed */
  primaryTest: PrimaryTest
  /** median months positive test -> colposcopy, measured from a chart (± ~0.1); null if not shown */
  medianMonthsToColposcopyApprox: number | null
}

const toRows = (csv: string): CervicalRow[] =>
  parse(csv)
    .filter((r) => r.county !== 'Ahvenanmaa')
    .map((r) => {
      const hpvTestedPct = req(r.hpv_tested_pct)
      return {
        id: slug(r.county),
        name: r.county,
        invited: req(r.invited),
        participated: req(r.participated),
        participationPct: req(r.participation_pct),
        riskGroupReferral: req(r.risk_group_referral),
        riskGroupReferralPct: req(r.risk_group_referral_pct),
        referredColposcopy: req(r.referred_colposcopy),
        referredColposcopyPct: req(r.referred_colposcopy_pct),
        colposcopyDone: req(r.colposcopy_done),
        colposcopyOfReferredPct: req(r.colposcopy_of_referred_pct),
        hsilPlus: req(r.hsil_plus),
        hsilPlusOfColposcopyPct: val(r.hsil_plus_of_colposcopy_pct),
        hpvTested: req(r.hpv_tested),
        hpvTestedPct,
        hpvPositive: req(r.hpv_positive),
        hpvPositivePct: val(r.hpv_positive_pct),
        normal: req(r.normal),
        normalPct: req(r.normal_pct),
        uninterpretable: req(r.uninterpretable),
        cancers: req(r.cancers),
        ais: req(r.ais),
        hsil: req(r.hsil),
        lsil: req(r.lsil),
        normalBenign: req(r.normal_benign),
        otherUnknown: req(r.other_unknown),
        noFollowupInfo: req(r.no_followup_info),
        primaryTest: hpvTestedPct >= 90 ? 'HPV' : hpvTestedPct <= 10 ? 'Pap' : 'mixed',
        medianMonthsToColposcopyApprox: val(r.median_months_to_colposcopy_approx),
      }
    })

const ageRows = toRows(AGE_GROUP_CSV)
const riskRows = toRows(RISK_GROUP_CSV)

/** Routine age-group screening, 22 wellbeing counties (Åland excluded). */
export const CERVICAL: CervicalRow[] = ageRows.filter((r) => r.id !== 'finland')
/** National total as published ("Yhteensä"); includes Åland. */
export const CERVICAL_FI: CervicalRow = ageRows.find((r) => r.id === 'finland')!
export const cervicalById = (id: string) => (id === 'finland' ? CERVICAL_FI : CERVICAL.find((r) => r.id === id))

/** Risk-group (repeat) screening after a mild positive, same counties. */
export const CERVICAL_RISK: CervicalRow[] = riskRows.filter((r) => r.id !== 'finland')
export const CERVICAL_RISK_FI: CervicalRow = riskRows.find((r) => r.id === 'finland')!

/** Whole-programme totals stated in the source text: cancers and serious precancers (HSIL+AIS) found via colposcopy, age + risk group. */
export const CERVICAL_TOTALS_FI = { cancers: 43, seriousPrecancers: 1448 } as const

/** Known problems in individual county rows, visible in the source data. */
export const CERVICAL_CAVEATS: Record<string, string> = {
  'varsinais-suomi':
    'Colposcopy results are almost entirely missing from the registry (4 of 190 referred recorded, 186 with no follow-up info). Treat colposcopy, histology and delay figures as not available.',
  kainuu: 'Screened with the Pap test in 2024 (only 1 woman HPV tested), so referral rates are not comparable with HPV counties.',
  'pohjois-pohjanmaa': 'Mixed Pap/HPV screening in 2024 (23.1 % HPV tested); 39 of 146 referred have no follow-up info.',
  'etela-savo': 'Median delay to colposcopy read as ~0.6 months, far below other counties; may reflect how dates are recorded.',
  'pohjois-savo': 'Median delay to colposcopy read as ~0.6 months, far below other counties; may reflect how dates are recorded.',
}

export interface CervicalEvidence {
  id: string
  /** plain English, short */
  action: string
  /** plain words */
  effect: string
  /** headline effect size(s) */
  effectNumbers: string
  citation: string
  url: string
}

export const CERVICAL_EVIDENCE: CervicalEvidence[] = [
  {
    id: 'invitation-letters',
    action: 'Send everyone a personal invitation letter',
    effect: 'Women sent an invitation were about 1.7 times as likely to be screened as women who were not.',
    effectNumbers: 'RR 1.71 (95% CI 1.49–1.96); 24 RCTs, 141,391 women; moderate certainty',
    citation:
      'Staley H, Shiraz A, Shreeve N, Bryant A, Martin-Hirsch PP, Gajjar K. Interventions targeted at women to encourage the uptake of cervical screening. Cochrane Database Syst Rev. 2021;9:CD002834. doi:10.1002/14651858.CD002834.pub3. PMID 34694000',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34694000/',
  },
  {
    id: 'fixed-appointment',
    action: 'Put a ready-booked time in the letter',
    effect: 'A letter with a fixed appointment raised attendance by about 60% compared with a letter asking women to book themselves.',
    effectNumbers: 'RR 1.61 (95% CI 1.48–1.75); 5 RCTs, 5,742 women; moderate certainty',
    citation:
      'Staley H, Shiraz A, Shreeve N, Bryant A, Martin-Hirsch PP, Gajjar K. Interventions targeted at women to encourage the uptake of cervical screening. Cochrane Database Syst Rev. 2021;9:CD002834. doi:10.1002/14651858.CD002834.pub3. PMID 34694000',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34694000/',
  },
  {
    id: 'mailed-self-sampling',
    action: 'Mail an HPV self-sampling kit to women who did not come',
    effect: 'Posting a kit home reached about 2.3 times as many under-screened women as an invitation or reminder letter. Kits women had to order themselves did not clearly help.',
    effectNumbers: 'Relative participation 2.33 (95% CI 1.86–2.91), mailed kit vs letter (ITT); opt-in kit 1.22 (0.93–1.61); 25 trials, high heterogeneity',
    citation:
      'Arbyn M, Smith SB, Temin S, Sultana F, Castle P; Collaboration on Self-Sampling and HPV Testing. Detecting cervical precancer and reaching underscreened women by using HPV testing on self samples: updated meta-analyses. BMJ. 2018;363:k4823. doi:10.1136/bmj.k4823. PMID 30518635',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30518635/',
  },
  {
    id: 'finland-second-contact',
    action: 'Follow up non-attenders with a reminder or a self-sampling kit (Finnish trial)',
    effect: 'In Espoo, a second contact to non-attenders lifted total participation from 64% to 75%. Self-sampling did slightly better than a reminder letter.',
    effectNumbers: 'Participation 29.8% (kit) vs 26.2% (reminder), adjusted RR 1.13; overall 64.0% -> 75.4%; 4,160 non-attenders randomised',
    citation:
      'Virtanen A, Anttila A, Luostarinen T, Nieminen P. Self-sampling versus reminder letter: effects on cervical cancer screening attendance and coverage in Finland. Int J Cancer. 2011;128(11):2681-7. doi:10.1002/ijc.25581. PMID 20669228',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20669228/',
  },
]
