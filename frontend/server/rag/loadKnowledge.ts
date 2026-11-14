// Loads the curated knowledge files into a corpus of approved passages.
// Reads knowledge/index/chunks.json when it matches the manifest's corpusVersion, else parses knowledge/sources/*.md.
// Only sources with reviewStatus "approved" in the manifest are kept. A missing or broken knowledge dir gives an
// empty corpus, which makes retrieval report insufficient evidence and the briefing fall back to its template.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSourceMarkdown } from './chunk.ts'
import { SOURCE_TYPES, type Chunk, type ChunkIndexFile, type Corpus, type Source } from './types.ts'

export const EMPTY_CORPUS: Corpus = { corpusVersion: 'none', sources: [], chunks: [] }

const hasKnowledge = (dir: string) => existsSync(join(dir, 'manifest.json')) || existsSync(join(dir, 'index', 'chunks.json'))

/** The knowledge dir: frontend/knowledge next to this file's server/ dir, else <cwd>/knowledge, else <cwd>/frontend/knowledge. */
export function findKnowledgeDir(): string | null {
  const candidates: string[] = []
  try { candidates.push(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'knowledge')) } catch { /* not a file: URL */ }
  candidates.push(resolve(process.cwd(), 'knowledge'), resolve(process.cwd(), 'frontend', 'knowledge'))
  return candidates.find(hasKnowledge) ?? null
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** A manifest entry with every required field valid, or null. */
export function cleanSource(raw: unknown): Source | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = str(r.id), title = str(r.title), publisher = str(r.publisher), url = str(r.url)
  const sourceType = SOURCE_TYPES.find((t) => t === r.sourceType)
  const setting = r.setting === 'finland' || r.setting === 'international' ? r.setting : undefined
  const reviewStatus = r.reviewStatus === 'approved' || r.reviewStatus === 'pending' || r.reviewStatus === 'rejected' ? r.reviewStatus : undefined
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id) || !title || !publisher || !url || !/^https?:\/\//.test(url) || !sourceType || !setting || !reviewStatus) return null
  return {
    id, title, publisher, sourceType, setting, url, reviewStatus,
    country: str(r.country), publicationDate: str(r.publicationDate), dataPeriod: str(r.dataPeriod), retrievedAt: str(r.retrievedAt),
    language: str(r.language), version: str(r.version), reviewedBy: str(r.reviewedBy), reuseNotes: str(r.reuseNotes),
  }
}

function cleanChunk(raw: unknown): Chunk | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const chunkId = str(r.chunkId), sourceId = str(r.sourceId), text = str(r.text)
  if (!chunkId || !sourceId || !text || !chunkId.startsWith(`${sourceId}#`)) return null
  return {
    chunkId, sourceId, text,
    heading: str(r.heading) ?? '',
    page: typeof r.page === 'number' && r.page > 0 ? r.page : undefined,
    keywords: Array.isArray(r.keywords) ? r.keywords.filter((k): k is string => typeof k === 'string').map((k) => k.toLowerCase()) : [],
  }
}

function readJson(path: string): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

/** Keep approved sources only, and chunks of those sources only, with unique chunk ids. */
function approvedOnly(corpusVersion: string, sources: Source[], chunks: Chunk[]): Corpus {
  const ok = sources.filter((s) => s.reviewStatus === 'approved')
  const ids = new Set(ok.map((s) => s.id))
  const seen = new Set<string>()
  const kept = chunks.filter((c) => {
    if (!ids.has(c.sourceId) || seen.has(c.chunkId)) return false
    seen.add(c.chunkId)
    return true
  })
  return { corpusVersion, sources: ok.filter((s) => kept.some((c) => c.sourceId === s.id)), chunks: kept }
}

/** Parse manifest.json + sources/*.md. Every manifest source is returned (approved or not) so the index builder can report them. */
export function parseKnowledgeDir(dir: string): { corpusVersion: string; sources: Source[]; chunks: Chunk[] } | null {
  const manifest = readJson(join(dir, 'manifest.json')) as { corpusVersion?: unknown; sources?: unknown } | null
  if (!manifest || !Array.isArray(manifest.sources)) return null
  const sources = manifest.sources.map(cleanSource).filter((s): s is Source => !!s)
  const chunks: Chunk[] = []
  for (const s of sources) {
    const file = join(dir, 'sources', `${s.id}.md`)
    if (!existsSync(file)) continue
    try { chunks.push(...parseSourceMarkdown(readFileSync(file, 'utf8'), s.id)) } catch { /* unreadable file: skip */ }
  }
  return { corpusVersion: str(manifest.corpusVersion) ?? 'unversioned', sources, chunks }
}

/** Load a corpus from one knowledge dir, uncached. */
export function loadCorpusFrom(dir: string): Corpus {
  const manifest = readJson(join(dir, 'manifest.json')) as { corpusVersion?: unknown; sources?: unknown } | null
  const index = readJson(join(dir, 'index', 'chunks.json')) as Partial<ChunkIndexFile> | null
  const indexOk = !!index && Array.isArray(index.sources) && Array.isArray(index.chunks) && typeof index.corpusVersion === 'string'
  if (indexOk && (!manifest || str(manifest.corpusVersion) === index.corpusVersion)) {
    let sources = (index.sources as unknown[]).map(cleanSource).filter((s): s is Source => !!s)
    // the manifest stays the authority on review status, even for a current index
    if (manifest && Array.isArray(manifest.sources)) {
      const status = new Map(manifest.sources.map(cleanSource).filter((s): s is Source => !!s).map((s) => [s.id, s.reviewStatus]))
      sources = sources.filter((s) => status.get(s.id) === 'approved')
    }
    const chunks = (index.chunks as unknown[]).map(cleanChunk).filter((c): c is Chunk => !!c)
    return approvedOnly(index.corpusVersion as string, sources, chunks)
  }
  const parsed = parseKnowledgeDir(dir)
  return parsed ? approvedOnly(parsed.corpusVersion, parsed.sources, parsed.chunks) : EMPTY_CORPUS
}

const mtime = (p: string) => { try { return statSync(p).mtimeMs } catch { return 0 } }
const sourcesStamp = (dir: string) => {
  try { return readdirSync(join(dir, 'sources')).filter((f) => f.endsWith('.md')).map((f) => `${f}@${mtime(join(dir, 'sources', f))}`).join(',') } catch { return '' }
}
let cache: { dir: string; stamp: string; corpus: Corpus } | null = null

/** The corpus from the located knowledge dir, cached until the manifest, the index or a source file changes. Never throws. */
export function loadKnowledge(dir: string | null = findKnowledgeDir()): Corpus {
  if (!dir) return EMPTY_CORPUS
  try {
    const stamp = `${mtime(join(dir, 'manifest.json'))}:${mtime(join(dir, 'index', 'chunks.json'))}:${sourcesStamp(dir)}`
    if (cache && cache.dir === dir && cache.stamp === stamp) return cache.corpus
    const corpus = loadCorpusFrom(dir)
    cache = { dir, stamp, corpus }
    return corpus
  } catch {
    return EMPTY_CORPUS
  }
}
