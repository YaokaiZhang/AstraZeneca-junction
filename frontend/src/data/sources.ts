// Source registry. Every number in the UI points at one of these via <SourceBadge id=... kind=... />.
// Matches the "Where the data comes from" table in docs/final-ideas.md. URLs checked 14 Nov 2026.
export type SourceKind = 'direct' | 'estimate' | 'gap' | 'mentor'

export interface Source {
  id: string
  name: string
  url?: string
  note?: string
  /** extra links, e.g. one per Sotkanet indicator */
  links?: { label: string; url: string }[]
}

const SOTKANET = (n: string) => `https://sotkanet.fi/sotkanet/en/metadata/indicators/${n}`
const ind = (...n: string[]) => n.map((x) => ({ label: `Sotkanet ${x}`, url: SOTKANET(x) }))

export const SOURCES: Record<string, Source> = {
  cancerRegistry: { id: 'cancerRegistry', name: 'Finnish Cancer Registry statistics', url: 'https://cancerregistry.fi/statistics/', note: 'Cancer cases, deaths and stage at diagnosis by county (CSV download)' },
  cancerRegistryScreening: { id: 'cancerRegistryScreening', name: 'Finnish Cancer Registry – screening statistics', url: 'https://cancerregistry.fi/screening/', note: 'Screening positivity and detection rates' },
  statfinDeaths: { id: 'statfinDeaths', name: 'Statistics Finland – causes of death', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ksyyt/', note: 'Cancer deaths by wellbeing services county, 1969–2025 (table 13u5)' },
  statfinPop: { id: 'statfinPop', name: 'Statistics Finland – population structure', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/', note: 'Key figures by municipality, 2024 (table 11ra): residents, share 65+, Swedish and foreign-language speakers' },
  statfinProjection: { id: 'statfinProjection', name: 'Statistics Finland – population projection 2024', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaenn/', note: 'Population by age and area, 2024–2045 (table 14wx). County = sum of its municipalities.' },
  statfinIncome: { id: 'statfinIncome', name: 'Statistics Finland – income distribution', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__tjt/', note: 'Median disposable income per consumption unit by municipality, 2024 (table 14ww)' },
  sotkanetScreening: { id: 'sotkanetScreening', name: 'THL Sotkanet – screening turnout', url: SOTKANET('6103'), note: 'Share of invited who attended, 2024: bowel 6103, breast 3621, cervical 3620', links: ind('6103', '3621', '3620') },
  sotkanetRisk: { id: 'sotkanetRisk', name: 'THL Sotkanet – risk factors', url: SOTKANET('4404'), note: 'Adults, 2024: daily smokers 4404, drinks too much (AUDIT-C) 4411, obesity BMI ≥ 30 4459, too little exercise 5527', links: ind('4404', '4411', '4459', '5527') },
  sotkanetQueue: { id: 'sotkanetQueue', name: 'THL Sotkanet – specialist waiting lists', url: SOTKANET('3336'), note: 'Indicator 3336: patients who waited over 6 months for specialist care during the year, per 10 000 residents. All specialties, not cancer only.' },
  thlSampo: { id: 'thlSampo', name: 'THL Sampo – specialist care waiting times', url: 'https://sampo.thl.fi/pivot/prod/fi/thl/hilmo/', note: 'Waiting-time cubes for specialist care; not split by cancer' },
  nordcan: { id: 'nordcan', name: 'NORDCAN', url: 'https://nordcan.iarc.fr/en', note: 'Nordic survival comparison (official survival for Finland, not by county)' },
  plco: { id: 'plco', name: 'PLCOm2012 (Tammemägi et al., NEJM 2013)', url: 'https://doi.org/10.1056/NEJMoa1211776', note: '6-year lung cancer risk' },
  thlTargets: { id: 'thlTargets', name: 'THL guidance 21/2016 – cancer care target times', note: 'Exact days still to verify' },
  strategy: { id: 'strategy', name: 'National Cancer Strategy 2026–2035, Goal 3' },
  screeningRules: { id: 'screeningRules', name: 'National screening programme ages', note: 'Bowel 56–74, breast 50–69, cervical 30–65' },
  ourModel: { id: 'ourModel', name: 'Our calculation', note: 'Method shown next to the number' },
  waitGap: { id: 'waitGap', name: 'No public source', note: 'Finland publishes no referral-to-treatment waiting times for cancer' },
  mentor: { id: 'mentor', name: 'AstraZeneca mentor interview' },
  demoPatients: { id: 'demoPatients', name: 'Synthetic demo patients', note: 'Generated from county case volumes; not real people' },
}

/** County cancer cases, deaths and stage are placeholders until the Cancer Registry CSV pull is wired in. */
export const DEMO_DATA = true
