// The /api/briefing response as the browser sees it (the server has its own copy in server/rag/types.ts).
export type SourceType = 'official_policy' | 'official_guidance' | 'official_statistics' | 'systematic_review' | 'primary_study' | 'mentor_input'

export interface EvidenceRef {
  /** citation number shown on the sheet, 1-based, order of the evidence array */
  n: number
  sourceId: string
  chunkId: string
  title: string
  publisher: string
  url: string
  sourceType: SourceType
  setting: 'finland' | 'international'
  section?: string
  page?: number
  publicationDate?: string
  dataPeriod?: string
  /** <= 300 chars from the passage */
  excerpt: string
}

export type EvidenceLevel = 'evidence_backed' | 'limited_evidence'

export interface BriefingResponse {
  status: 'grounded' | 'template_fallback'
  evidenceLevel?: EvidenceLevel
  reason?: string
  text?: string
  limitations?: string[]
  evidence: EvidenceRef[]
  retrieval: { method: 'keyword'; queryVersion: string; corpusVersion: string }
  generatedAt: string
}

const KIND: Record<SourceType, string> = {
  official_policy: 'policy',
  official_guidance: 'guidance',
  official_statistics: 'statistics',
  systematic_review: 'review',
  primary_study: 'study',
  mentor_input: '',
}

/** Short badge for a source: "Finnish policy", "International review", "Mentor input". */
export function sourceBadge(e: Pick<EvidenceRef, 'sourceType' | 'setting'>): string {
  if (e.sourceType === 'mentor_input') return 'Mentor input'
  return `${e.setting === 'finland' ? 'Finnish' : 'International'} ${KIND[e.sourceType] ?? 'source'}`
}
