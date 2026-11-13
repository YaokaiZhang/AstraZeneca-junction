// Source registry. Every number in the UI points at one of these via <SourceBadge id=... kind=... />.
export type SourceKind = 'direct' | 'estimate' | 'gap' | 'mentor'

export interface Source {
  id: string
  name: string
  url?: string
  note?: string
}

export const SOURCES: Record<string, Source> = {
  cancerRegistry: { id: 'cancerRegistry', name: 'Finnish Cancer Registry', url: 'https://cancerregistry.fi/statistics/', note: 'Cases, deaths, stage by county (CSV)' },
  statfinDeaths: { id: 'statfinDeaths', name: 'Statistics Finland – causes of death', url: 'https://pxdata.stat.fi/', note: 'Cancer deaths by county 1969–2025' },
  statfinPop: { id: 'statfinPop', name: 'Statistics Finland – population & forecast', url: 'https://pxdata.stat.fi/', note: 'Population, age, income, forecast to 2035' },
  sotkanetScreening: { id: 'sotkanetScreening', name: 'THL Sotkanet – screening turnout', url: 'https://sotkanet.fi/', note: 'Indicators 3620, 3621, 6103' },
  sotkanetRisk: { id: 'sotkanetRisk', name: 'THL Sotkanet – risk factors', url: 'https://sotkanet.fi/', note: 'Smoking 4404, alcohol 4411, obesity 4459, inactivity 5527' },
  sotkanetQueue: { id: 'sotkanetQueue', name: 'THL Sotkanet – specialist waiting lists', url: 'https://sotkanet.fi/', note: 'Indicator 3336' },
  nordcan: { id: 'nordcan', name: 'NORDCAN', url: 'https://nordcan.iarc.fr/', note: 'Nordic survival comparison' },
  plco: { id: 'plco', name: 'PLCOm2012 (Tammemägi et al., NEJM 2013)', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1211776', note: '6-year lung cancer risk' },
  thlTargets: { id: 'thlTargets', name: 'THL guidance 21/2016 – cancer care target times', note: 'Exact days still to verify' },
  strategy: { id: 'strategy', name: 'National Cancer Strategy 2026–2035, Goal 3' },
  screeningRules: { id: 'screeningRules', name: 'National screening programme ages', note: 'Bowel 56–74, breast 50–69, cervical 30–65' },
  ourModel: { id: 'ourModel', name: 'Our calculation', note: 'Method shown next to the number' },
  waitGap: { id: 'waitGap', name: 'No public source', note: 'Finland publishes no referral-to-treatment waiting times for cancer' },
  mentor: { id: 'mentor', name: 'AstraZeneca mentor interview' },
  demoPatients: { id: 'demoPatients', name: 'Synthetic demo patients', note: 'Generated from county case volumes; not real people' },
}

/** Every county figure in this prototype is a placeholder until the real CSV/API pull is wired in. */
export const DEMO_DATA = true
