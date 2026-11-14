// Tile-grid map of the wellbeing services counties. One rounded tile per county; Lappi spans two rows.
import { useState, type ReactNode } from 'react'
import { COUNTIES, type County } from '../../data/counties'
import { ABBR } from './model'

const S = 56, G = 6, STEP = S + G, PAD = 4
const W = 4 * STEP - G + PAD * 2
const H = 9 * STEP - G + PAD * 2

function rect(c: County) {
  if (c.id === 'lappi') return { x: PAD + STEP * 1, y: PAD, w: STEP * 2 - G, h: STEP * 2 - G }
  return { x: PAD + c.col * STEP, y: PAD + (c.row + 1) * STEP, w: S, h: S }
}

export interface TileStyle { fill: string; label?: string; faded?: boolean; flag?: boolean }

export function TileMap({ style, selected, onSelect, tooltip, className }: {
  style: (c: County) => TileStyle
  selected: string
  onSelect: (id: string) => void
  tooltip: (c: County) => ReactNode
  className?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const hc = hover ? COUNTIES.find((c) => c.id === hover) : null
  const hr = hc ? rect(hc) : null
  return (
    <div className={'relative ' + (className ?? '')}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="group" aria-label="Map of counties">
        <defs>
          <pattern id="county-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#1F1F1F" strokeOpacity=".35" strokeWidth="1.6" />
          </pattern>
        </defs>
        {COUNTIES.map((c) => {
          const r = rect(c)
          const st = style(c)
          const sel = c.id === selected
          const big = c.id === 'lappi'
          return (
            <g key={c.id} tabIndex={0} role="button" aria-label={c.name} aria-pressed={sel}
              className="cursor-pointer outline-none group"
              onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
              onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id) } }}>
              <rect x={r.x + 1.5} y={r.y + 2.5} width={r.w} height={r.h} rx={8} fill="#1F1F1F" opacity={0.12} />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill={st.fill}
                opacity={st.faded ? 0.55 : 1}
                stroke={sel ? '#1F1F1F' : 'rgba(31,31,31,.15)'} strokeWidth={sel ? 2.5 : 1}
                className="transition-[fill] duration-500 group-hover:brightness-95 group-focus-visible:[stroke:#C65D3B] group-focus-visible:[stroke-width:2.5]" />
              {st.faded && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill="url(#county-hatch)" pointerEvents="none" />}
              <text x={r.x + 5} y={r.y + 15} className="font-type" style={{ fontSize: big ? 16 : 14, letterSpacing: '.04em' }} fill="#1F1F1F" opacity={0.75}>
                {ABBR[c.id]}
              </text>
              {st.label && (
                // numbers in serif; word labels (e.g. the weakest step) small and uppercase so they fit a tile
                <text x={r.x + 6} y={r.y + r.h - 8} className={/\d/.test(st.label) ? 'font-serif' : 'font-type uppercase'}
                  style={/\d/.test(st.label) ? { fontSize: big ? 26 : 17 } : { fontSize: big ? 14 : 8.5, letterSpacing: '.02em' }} fill="#1F1F1F">
                  {st.label}
                </text>
              )}
              {st.flag && <circle cx={r.x + r.w - 9} cy={r.y + 10} r={4} fill="#1F1F1F" stroke="#F4F1EA" strokeWidth={1.5} />}
              {sel && <circle cx={r.x + r.w - 9} cy={r.y + r.h - 10} r={3} fill="#C65D3B" />}
            </g>
          )
        })}
      </svg>
      {hc && hr && (
        <div className="pointer-events-none absolute z-20 rise"
          style={{
            left: `${((hr.x + hr.w / 2) / W) * 100}%`,
            top: `${((hr.y + hr.h) / H) * 100}%`,
            transform: `translate(${hc.col >= 2 ? '-85%' : '-15%'}, 6px)`,
          }}>
          <div className="bg-ink text-paper rounded-lg shadow-2xl px-3 py-2 min-w-[150px] whitespace-nowrap">
            <p className="font-serif text-lg leading-tight">{hc.name}</p>
            <div className="font-type text-sm uppercase tracking-wider opacity-80 mt-1">{tooltip(hc)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
