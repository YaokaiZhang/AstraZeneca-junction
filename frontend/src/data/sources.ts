// Source registry. Every number in the UI points at one of these via <SourceBadge id=... kind=... />.
// Matches the "Where the data comes from" table in docs/final-ideas.md. URLs checked 14 Nov 2026.
// kind: direct = taken from the source as published · estimate = our calculation, method in the badge ·
// gap = nobody publishes it · mentor = AstraZeneca mentor interview · example = illustrative, not data.
export type SourceKind = 'direct' | 'estimate' | 'gap' | 'mentor' | 'example'

export interface Source {
  id: string
  name: string
  url?: string
  note?: string
  /** years the figures describe, e.g. "2024" */
  years?: string
  /** when we pulled the figures */
  retrieved?: string
  /** extra links, e.g. one per Sotkanet indicator */
  links?: { label: string; url: string }[]
}

const SOTKANET = (n: string) => `https://sotkanet.fi/sotkanet/en/metadata/indicators/${n}`
const ind = (...n: string[]) => n.map((x) => ({ label: `Sotkanet ${x}`, url: SOTKANET(x) }))
const PULLED = '14 Nov 2026'

export const SOURCES: Record<string, Source> = {
  cancerRegistry: {
    id: 'cancerRegistry', name: 'Finnish Cancer Registry statistics', url: 'https://cancerregistry.fi/statistics/',
    note: 'Statistics app (CC BY 4.0). New cases and deaths by wellbeing services county; stage at diagnosis (localized / non-localized / unknown) by county, preliminary statistics; national rates by age and sex. Counts of 1–4 are hidden by the Registry.',
    years: 'cases and deaths 2020–24 · stage 2021–25', retrieved: PULLED,
    links: [{ label: 'Cancer Registry statistics', url: 'https://cancerregistry.fi/statistics/' }, { label: 'Statistics app (fi)', url: 'https://tilastot.syoparekisteri.fi/syovat' }],
  },
  cancerRegistryScreening: {
    id: 'cancerRegistryScreening', name: 'Finnish Cancer Registry – screening statistics', url: 'https://cancerregistry.fi/statistics/screening-statistics/',
    note: 'Screening positivity and detection rates by programme (CC BY 4.0). Checked, not used for figures.',
    years: 'yearly programme reports', retrieved: PULLED,
  },
  statfinPop: {
    id: 'statfinPop', name: 'Statistics Finland – population structure', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/',
    note: 'Key figures by municipality (table 11ra): residents, share 65+, Swedish and foreign-language speakers. Open data, CC BY 4.0.',
    years: '2024', retrieved: PULLED,
  },
  statfinProjection: {
    id: 'statfinProjection', name: 'Statistics Finland – population projection 2024', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaenn/',
    note: 'Population by age and area (table 14wx). County = sum of its municipalities. A projection, not a count: it assumes today’s birth, death and migration trends continue. Open data, CC BY 4.0.',
    years: '2025 and 2035', retrieved: PULLED,
  },
  statfinIncome: {
    id: 'statfinIncome', name: 'Statistics Finland – income distribution', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__tjt/',
    note: 'Median disposable income per consumption unit by municipality (table 14ww). Open data, CC BY 4.0.',
    years: '2024', retrieved: PULLED,
  },
  sotkanetScreening: {
    id: 'sotkanetScreening', name: 'THL Sotkanet – screening turnout', url: SOTKANET('6103'),
    note: 'Share of invited who attended: bowel 6103, breast 3621, cervical 3620. By municipality and county. The Strategy’s target is 80% in every county. Open data, CC BY 4.0; pulled once from the open API.',
    years: '2024', retrieved: PULLED, links: ind('6103', '3621', '3620'),
  },
  sotkanetRisk: {
    id: 'sotkanetRisk', name: 'THL Sotkanet – risk factors', url: SOTKANET('4404'),
    note: 'Adults 20+, survey-based: daily smokers 4404, drinks too much (AUDIT-C) 4411, obesity BMI ≥ 30 4459, too little exercise 5527. Open data, CC BY 4.0; pulled once from the open API.',
    years: '2024', retrieved: PULLED, links: ind('4404', '4411', '4459', '5527'),
  },
  sotkanetQueue: {
    id: 'sotkanetQueue', name: 'THL Sotkanet – specialist waiting lists', url: SOTKANET('3336'),
    note: 'Indicator 3336: patients who waited over 6 months for specialist care during the year, per 10 000 residents. All specialties, not cancer only. No full series for HUS-area counties and Helsinki. Open data, CC BY 4.0.',
    years: '2022–2025', retrieved: PULLED,
  },
  thlSampo: {
    id: 'thlSampo', name: 'THL Sampo – specialist care waiting times', url: 'https://sampo.thl.fi/pivot/prod/fi/thl/hilmo/',
    note: 'Waiting-time cubes for specialist care; not split by cancer. Checked, not used for figures.',
    years: 'specialist care, all specialties', retrieved: PULLED,
  },
  nordcan: {
    id: 'nordcan', name: 'NORDCAN (IARC)', url: 'https://nordcan.iarc.fr/en',
    note: 'Official 5-year relative survival for Finland and the other Nordic countries; not by county. The Strategy’s survival targets start from the 2023 NORDCAN level. Used under the IARC / NORDCAN terms of use (cite NORDCAN, no redistribution of the database).',
    years: '2023 survival level', retrieved: PULLED,
  },
  plco: {
    id: 'plco', name: 'PLCOm2012 (Tammemägi et al., NEJM 2013)', url: 'https://doi.org/10.1056/NEJMoa1211776',
    note: '6-year lung cancer risk for people who smoke or used to. Built on US trial data (PLCO); not validated in Finland. Cut-off ≥ 1.51% from Tammemägi et al., PLOS Medicine 2014.',
    links: [{ label: 'Model, NEJM 2013', url: 'https://doi.org/10.1056/NEJMoa1211776' }, { label: '1.51% cut-off, PLOS Med 2014', url: 'https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1001764' }],
  },
  plcoValidation: {
    id: 'plcoValidation', name: 'PLCOm2012 – validation and use',
    note: 'US validation (Tammemägi et al., NEJM 2013): AUC 0.797; with the same number of people screened it caught 83.0% of later lung cancers vs 71.1% for the age-and-pack-years rule (NLST criteria), PPV 4.0% vs 3.4%. EPIC-Germany prospective cohort (20 700 ever-smokers): C-index 0.81, expected/observed 1.03, the best of four models. England: the NHS Lung Cancer Screening Programme invites ever-smokers 55–74 with PLCOm2012 ≥ 1.51% (or LLPv2 ≥ 2.5%) to a low-dose CT. Not yet checked against Finnish outcomes.',
    links: [{ label: 'NEJM 2013', url: 'https://doi.org/10.1056/NEJMoa1211776' }, { label: 'NHS eligibility assessment (2023)', url: 'https://nationalscreening.blog.gov.uk/wp-content/uploads/sites/254/2023/11/Eligibility-Assessment-Dr-Richard-Lee.pdf' }, { label: 'NHS lung health check', url: 'https://www.lhch.nhs.uk/invitation-and-lung-health-check' }],
  },
  fhir: {
    id: 'fhir', name: 'HL7 FHIR R4', url: 'https://hl7.org/fhir/R4/',
    note: 'Open health-data standard. Referral = ServiceRequest, diagnosis = Condition, first treatment = Procedure. Kanta, Finland’s national health-data service, uses FHIR for its personal health record (Kanta PHR).',
    links: [{ label: 'FHIR R4', url: 'https://hl7.org/fhir/R4/' }, { label: 'Kanta PHR', url: 'https://www.kanta.fi/en/system-developers/kanta-phr' }],
  },
  thlTargets: {
    id: 'thlTargets', name: 'Cancer care target times',
    url: 'https://urn.fi/URN:ISBN:978-952-00-2971-5',
    note: 'Referral arriving → first treatment within 6 weeks, tests included; imaging report and tissue sample within 1 week each (Ministry of Social Affairs and Health, report 2010:6). THL Ohjaus 21/2016 defines how access is measured. The 7 days from GP visit to referral, and how the 6 weeks split across steps, are our assumptions.',
    links: [{ label: 'STM report 2010:6 (fi)', url: 'https://urn.fi/URN:ISBN:978-952-00-2971-5' }, { label: 'THL Ohjaus 21/2016 (fi)', url: 'https://urn.fi/URN:ISBN:978-952-302-782-4' }],
  },
  strategy: {
    id: 'strategy', name: 'National Cancer Strategy 2026–2035', url: 'https://stm.fi/en/national-cancer-strategy',
    note: '“Slightly under 38,000” new cancers and 13,300 cancer deaths a year. Targets by 2035: 80% screening turnout in every county, 70% of cancers found at stage I–II, 5-year survival +14 percentage points lung, +6 pancreas, +14 liver (Nordic level). The English PDF is hosted on the ICCP portal, a mirror of the Ministry’s publication.',
    years: '2026–2035 (published 2026)', retrieved: PULLED,
    links: [{ label: 'Ministry page', url: 'https://stm.fi/en/national-cancer-strategy' }, { label: 'English summary (PDF, ICCP mirror)', url: 'https://www.iccp-portal.org/sites/default/files/2026-02/National_Cancer_Strategy_2026-2035_Finland.pdf' }],
  },
  screeningRules: {
    id: 'screeningRules', name: 'National screening programme ages', url: 'https://cancerregistry.fi/screening/',
    note: 'Breast 50–69 every 2 years; cervical 30–65 every 5 years. Bowel: every 2 years, ages 60–72 today (60–70 in the 2024 round), widening to everyone aged 56–74 from 2031.',
    years: 'rules in force 2026', retrieved: PULLED,
  },
  bowelStageSurvival: {
    id: 'bowelStageSurvival', name: 'Bowel cancer survival by stage, Finland (BMC Cancer 2022)', url: 'https://doi.org/10.1186/s12885-022-09460-0',
    note: 'Olenius T et al. Long-term survival among colorectal cancer patients in Finland, 1991–2015: a nationwide population-based registry study. BMC Cancer 2022;22:356, table 6. 5-year relative survival by Cancer Registry stage, diagnosed 2006–2015: localized 93.6%; after spread 84.2% (locally advanced) down to 14.0% (distant metastasis). The only Finnish survival-by-stage figures we found; the Registry statistics app has no survival by stage.',
    years: 'diagnosed 2006–2015', retrieved: PULLED,
    links: [{ label: 'Article (PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8976396/' }],
  },
  bowelScreening2024: {
    id: 'bowelScreening2024', name: 'Finnish Cancer Registry – bowel cancer screening, 2024 round', url: 'https://stats.cancerregistry.fi/joukkistilastot/suolisto.html',
    note: 'Annual screening statistics by wellbeing services county and by group (group data national only). Participation = valid kits returned ÷ invited. "No colonoscopy" may partly be private colonoscopies not reported to the register. Median months from positive test to colonoscopy read by eye from a chart (± 0.1 month).',
    years: '2024 round · published 20 May 2026', retrieved: PULLED,
  },
  statfinLang: {
    id: 'statfinLang', name: 'Statistics Finland – population by age and language (vaerak/11rz)', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/statfin_vaerak_pxt_11rz.px/',
    note: 'Residents by single year of age and mother tongue, by municipality, rolled up by us to wellbeing services counties. Used: residents aged 56–74 and the share of them whose mother tongue is not Finnish, Swedish or Sami. Open data, CC BY 4.0.',
    years: '2025', retrieved: PULLED,
  },
  statfinEdu: {
    id: 'statfinEdu', name: 'Statistics Finland – education by age (vkour/12bq)', url: 'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vkour/statfin_vkour_pxt_12bq.px/',
    note: 'Highest completed education by age, by municipality, rolled up by us to wellbeing services counties. Used: the basic, upper secondary and higher education shares at screening age. Open data, CC BY 4.0.',
    years: '2025', retrieved: PULLED,
  },
  bowelExpansion: {
    id: 'bowelExpansion', name: 'Finnish Cancer Registry – bowel cancer screening programme', url: 'https://syoparekisteri.fi/seulonta/suolistosyovan-seulonta/',
    note: 'The programme widens year by year until 2031, when everyone aged 56–74 is invited every two years (even ages in each round).',
    years: 'target group from 2031', retrieved: PULLED,
  },
  bowelScreeningRounds: {
    id: 'bowelScreeningRounds', name: 'Finnish Cancer Registry – bowel cancer screening, 2022 and 2023 rounds', url: 'https://stats.cancerregistry.fi/joukkistilastot/suolisto.html',
    note: 'The same annual county tables as the 2024 round. Nationally, colonoscopy after a positive test was 78.8% (2022), 78.6% (2023) and 72.7% (2024); the 2024 drop is probably partly reports still to come in.',
    years: '2022 and 2023 rounds', retrieved: PULLED,
  },
  navMeta: {
    id: 'navMeta', name: 'Interventions to raise colonoscopy after a positive stool test – meta-analysis (JAMA Intern Med 2026)', url: 'https://pubmed.ncbi.nlm.nih.gov/42832233/',
    note: 'Risk ratios for completing colonoscopy: patient navigation 1.24, patient reminders 1.32, clinician reminders 1.36, automated referral 1.68. Mostly US settings. PMID 42832233.',
  },
  dougherty: {
    id: 'dougherty', name: 'Dougherty et al. Interventions to raise colorectal screening uptake (JAMA Intern Med 2018)', url: 'https://pubmed.ncbi.nlm.nih.gov/30326005/',
    note: 'Systematic review and meta-analysis: patient reminders RR 1.20 (about +3 points); patient navigation RR 2.01 from low US baselines; clinician reminders about +13 points (US). PMID 30326005.',
  },
  ourModel: { id: 'ourModel', name: 'Our calculation', note: 'Method shown below. Inputs are the published sources named in it.' },
  waitGap: { id: 'waitGap', name: 'No public source', note: 'Finland publishes no referral-to-treatment waiting times for cancer.' },
  mentor: { id: 'mentor', name: 'AstraZeneca mentor interview' },
  demoPatients: { id: 'demoPatients', name: 'Synthetic demo patients', note: 'Generated from county case volumes; not real people.' },
  illustration: { id: 'illustration', name: 'Illustration', note: 'Made-up numbers that show how a feature works. Not data.' },
}

/** County cancer cases, deaths and stage now come from the Cancer Registry. */
export const DEMO_DATA = false
