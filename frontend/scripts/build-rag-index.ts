// Builds knowledge/index/chunks.json from knowledge/manifest.json + knowledge/sources/*.md (approved sources only).
//   npm run rag:index            (or: node --experimental-strip-types scripts/build-rag-index.ts [knowledgeDir])
// The server reads the index when its corpusVersion matches the manifest, and parses the md files otherwise.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findKnowledgeDir, parseKnowledgeDir } from '../server/rag/loadKnowledge.ts'
import type { ChunkIndexFile } from '../server/rag/types.ts'

const dir = process.argv[2] ? resolve(process.argv[2]) : findKnowledgeDir()
if (!dir) {
  console.error('No knowledge dir found (looked for knowledge/manifest.json).')
  process.exit(1)
}
const parsed = parseKnowledgeDir(dir)
if (!parsed) {
  console.error(`Could not read ${join(dir, 'manifest.json')}.`)
  process.exit(1)
}
const approved = parsed.sources.filter((s) => s.reviewStatus === 'approved')
const ids = new Set(approved.map((s) => s.id))
const seen = new Set<string>()
const chunks = parsed.chunks.filter((c) => {
  if (!ids.has(c.sourceId)) return false
  if (seen.has(c.chunkId)) { console.warn(`duplicate chunk id skipped: ${c.chunkId}`); return false }
  seen.add(c.chunkId)
  return true
})
for (const s of approved) if (!chunks.some((c) => c.sourceId === s.id)) console.warn(`approved source without chunks: ${s.id}`)
for (const s of parsed.sources) if (s.reviewStatus !== 'approved') console.log(`skipped (${s.reviewStatus}): ${s.id}`)

const out: ChunkIndexFile = { corpusVersion: parsed.corpusVersion, builtAt: new Date().toISOString(), sources: approved, chunks }
mkdirSync(join(dir, 'index'), { recursive: true })
writeFileSync(join(dir, 'index', 'chunks.json'), `${JSON.stringify(out, null, 1)}\n`)
console.log(`wrote ${join(dir, 'index', 'chunks.json')}: corpus ${out.corpusVersion}, ${approved.length} sources, ${chunks.length} chunks`)
