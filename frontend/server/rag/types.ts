// Shared types of the evidence layer behind POST /api/briefing (see server/llm.ts).
// The knowledge files (frontend/knowledge/) supply passages; the numbers always come from the app's facts.

export const SOURCE_TYPES = ['official_policy', 'official_guidance', 'official_statistics', 'systematic_review', 'primary_study', 'mentor_input'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]
export type Setting = 'finland' | 'international'
export type ReviewStatus = 'approved' | 'pending' | 'rejected'

export interface Source {
  id: string
  title: string
  publisher: string
  sourceType: SourceType
  setting: Setting
  country?: string
  url: string
  publicationDate?: string
  dataPeriod?: string
  retrievedAt?: string
  language?: string
  version?: string
  reviewStatus: ReviewStatus
  reviewedBy?: string
  reuseNotes?: string
}

export interface Chunk {
  /** "<source-id>#<slug>", unique and stable */
  chunkId: string
  sourceId: string
  /** the `## ` heading the passage sits under */
  heading: string
  page?: number
  keywords: string[]
  /** verbatim passage text */
  text: string
}

/** Only approved sources and their chunks. */
export interface Corpus {
  corpusVersion: string
  sources: Source[]
  chunks: Chunk[]
}

/** The file written by scripts/build-rag-index.ts to knowledge/index/chunks.json. */
export interface ChunkIndexFile {
  corpusVersion: string
  builtAt: string
  sources: Source[]
  chunks: Chunk[]
}

export type PathwayStep = 'referral' | 'capacity' | 'detection' | 'none'

export interface ScoredChunk {
  chunk: Chunk
  source: Source
  score: number
  /** controlled query concepts found in the passage */
  matched: string[]
}

export interface RetrievalMeta {
  method: 'keyword'
  queryVersion: string
  corpusVersion: string
}

export type RetrievalResult =
  | { status: 'ok'; chunks: ScoredChunk[]; query: string[]; meta: RetrievalMeta }
  | { status: 'insufficient_evidence'; chunks: ScoredChunk[]; query: string[]; meta: RetrievalMeta }

export const isOfficial = (t: SourceType) => t === 'official_policy' || t === 'official_guidance' || t === 'official_statistics'
export const isIntervention = (t: SourceType) => t === 'systematic_review' || t === 'primary_study'

// ----- /api/briefing response (contract section 3) -----

export interface EvidenceRef {
  /** citation number shown in the UI, 1-based, order of the evidence array */
  n: number
  sourceId: string
  chunkId: string
  title: string
  publisher: string
  url: string
  sourceType: SourceType
  setting: Setting
  section?: string
  page?: number
  publicationDate?: string
  dataPeriod?: string
  /** at most 300 characters from the passage */
  excerpt: string
}

export interface BriefingResponse {
  status: 'grounded' | 'template_fallback'
  evidenceLevel?: 'evidence_backed' | 'limited_evidence'
  reason?: string
  text?: string
  limitations?: string[]
  evidence: EvidenceRef[]
  retrieval: RetrievalMeta
  generatedAt: string
}
