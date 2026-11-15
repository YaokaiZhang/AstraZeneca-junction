// How the monitor connects to the National Cancer Strategy 2026–2035 (p. 5), in one sentence per place it is shown.
// Goal 3's indicator is access to treatment within target times; no county-level time-to-treatment figure is
// published, so the follow-up and wait steps are the closest public figures. We claim no THL target time for them.
export const STRATEGY_URL = 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf'

/** The diagnostic step whose wait is the first part of the time to treatment, per programme. */
const STEP = { bowel: 'colonoscopy', breast: 'further tests', cervical: 'colposcopy' } as const

export const goal3Line = (p: keyof typeof STEP) =>
  `Strategy link: Goal 3 of the National Cancer Strategy (p. 5) is that patients reach treatment within target times. The wait from a positive test to ${STEP[p]} is the first part of that time; time to treatment itself is not published by county, so the follow-up and wait steps are the closest public figures. Goal 2 is 80% attendance in every county, and comparing counties serves the strategy's equality aim (regional differences used to steer services, p. 5).`

/** Shorter, for the one-page plan. */
export const goal3Short = (p: keyof typeof STEP) =>
  `Goal 3 (p. 5): treatment within target times; the wait to ${STEP[p]} is its first part (time to treatment is not published by county).`
