// Parser for knowledge/sources/<source-id>.md. Each passage sits under a `## ` heading and starts with a marker:
//   <!-- chunk: <source-id>#<slug> | page: 20 | keywords: positiivinen, kolonoskopia, follow-up -->
// The text after the marker (up to the next marker or heading) is the verbatim passage.
// Sections without a marker are ignored: a passage needs a stable id to be cited.
import type { Chunk } from './types.ts'

const MARKER = /<!--\s*chunk:([\s\S]*?)-->/g

function parseMarker(body: string): { chunkId: string; page?: number; keywords: string[] } | null {
  const parts = body.split('|').map((p) => p.trim())
  const chunkId = parts[0]
  if (!chunkId || !/^[a-z0-9][a-z0-9-]*#[a-z0-9][a-z0-9-]*$/i.test(chunkId)) return null
  let page: number | undefined
  let keywords: string[] = []
  for (const p of parts.slice(1)) {
    const m = p.match(/^(\w+)\s*:\s*([\s\S]*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    if (key === 'page') {
      const n = Number.parseInt(m[2], 10)
      if (Number.isFinite(n) && n > 0) page = n
    } else if (key === 'keywords') {
      keywords = m[2].split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
    }
  }
  return { chunkId, page, keywords }
}

/** All chunks of one source file. Chunks whose id does not start with `<sourceId>#` are dropped. */
export function parseSourceMarkdown(md: string, sourceId: string): Chunk[] {
  const out: Chunk[] = []
  const sections = md.replace(/\r\n?/g, '\n').split(/^## /m).slice(1)
  for (const section of sections) {
    const nl = section.indexOf('\n')
    const heading = (nl < 0 ? section : section.slice(0, nl)).trim()
    const body = nl < 0 ? '' : section.slice(nl + 1)
    const markers = [...body.matchAll(MARKER)]
    markers.forEach((m, i) => {
      const meta = parseMarker(m[1])
      if (!meta || !meta.chunkId.startsWith(`${sourceId}#`)) return
      const start = (m.index ?? 0) + m[0].length
      const end = i + 1 < markers.length ? markers[i + 1].index ?? body.length : body.length
      const text = body.slice(start, end).replace(/<!--[\s\S]*?-->/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
      if (!text) return
      out.push({ chunkId: meta.chunkId, sourceId, heading, page: meta.page, keywords: meta.keywords, text })
    })
  }
  return out
}
