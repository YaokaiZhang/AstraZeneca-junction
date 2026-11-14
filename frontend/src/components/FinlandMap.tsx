// Map of Finland's wellbeing services counties (real outlines, Statistics Finland). Click a county to pick it.
// The capital region is too small to tap at map scale, so it is repeated, enlarged, in an inset over the sea.
import { useState, type ReactNode } from 'react'
import { COUNTIES, type County } from '../data/counties'
import { COUNTY_SHAPES } from '../data/countyShapes.generated'
import { FI_W, FI_H } from '../data/finland'

export interface MapStyle { fill: string; faded?: boolean }

// inset: source window around Helsinki → box in the Gulf of Bothnia
const SRC = { x: 214, y: 896, w: 78, h: 80 }
const K = 2.1
const BOX = { x: 6, y: 300, w: SRC.w * K, h: SRC.h * K }
const insetT = `translate(${BOX.x - SRC.x * K} ${BOX.y - SRC.y * K}) scale(${K})`
const SMALL = new Set(['helsinki', 'vantaa-kerava', 'keski-uusimaa'])

export function FinlandMap({ style, selected, onSelect, tooltip, label = 'Map of Finland by county', className }: {
  style: (c: County) => MapStyle
  selected: string
  onSelect: (id: string) => void
  tooltip?: (c: County) => ReactNode
  label?: string
  className?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const hc = hover ? COUNTIES.find((c) => c.id === hover) : null

  const shape = (c: County, inset: boolean) => {
    const s = COUNTY_SHAPES[c.id]
    const st = style(c)
    const sel = c.id === selected
    const hot = c.id === hover
    return (
      <path key={c.id} d={s.d} fill={st.fill} fillOpacity={st.faded ? 0.45 : 1}
        stroke={sel ? '#1F1F1F' : '#F4F1EA'} strokeWidth={(sel ? 2.2 : hot ? 1.6 : 0.8) / (inset ? K : 1)} strokeLinejoin="round"
        className="transition-[fill] duration-500" style={hot && !sel ? { filter: 'brightness(.93)' } : undefined} />
    )
  }

  // one focusable hit group per county; small capital-region counties are hit through the inset
  const hit = (c: County, inset: boolean) => {
    const primary = inset === SMALL.has(c.id) // each county is announced and tabbable once
    return (
    <g key={c.id} role="button" tabIndex={primary ? 0 : -1} aria-hidden={primary ? undefined : true} aria-label={c.name} aria-pressed={c.id === selected}
      className="cursor-pointer outline-none focus-visible:[&>path]:[stroke:#C65D3B]"
      onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
      onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}
      onClick={() => onSelect(c.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id) } }}>
      {shape(c, inset)}
    </g>
    )
  }

  // selected county drawn last so its outline is on top
  const order = [...COUNTIES].sort((a, b) => Number(a.id === selected) - Number(b.id === selected))
  const pos = (c: County): [number, number] => {
    const s = COUNTY_SHAPES[c.id]
    return SMALL.has(c.id)
      ? [BOX.x + (s.cx - SRC.x) * K, BOX.y + (s.cy - SRC.y) * K]
      : [s.cx, s.cy]
  }
  const hp = hc ? pos(hc) : null

  return (
    <div className={'relative ' + (className ?? '')}>
      <svg viewBox={`0 0 ${FI_W} ${FI_H}`} className="w-full h-auto block overflow-visible" role="group" aria-label={label}>
        <defs>
          <clipPath id="fi-inset"><rect x={SRC.x} y={SRC.y} width={SRC.w} height={SRC.h} /></clipPath>
        </defs>
        <g>{order.map((c) => hit(c, false))}</g>
        {/* where the inset comes from */}
        <rect x={SRC.x} y={SRC.y} width={SRC.w} height={SRC.h} fill="none" stroke="#1F1F1F" strokeOpacity={0.45} strokeDasharray="3 3" pointerEvents="none" />
        <path d={`M${SRC.x} ${SRC.y} L${BOX.x + BOX.w / 2} ${BOX.y + BOX.h}`} stroke="#1F1F1F" strokeOpacity={0.25} strokeDasharray="3 3" fill="none" pointerEvents="none" />
        <g>
          <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={6} fill="none" stroke="#1F1F1F" strokeOpacity={0.35} />
          <g transform={insetT} clipPath="url(#fi-inset)">
            {order.map((c) => hit(c, true))}
          </g>
          <text x={BOX.x + 8} y={BOX.y - 8} className="font-type uppercase" style={{ fontSize: 15, letterSpacing: '.08em' }} fill="#1F1F1F" opacity={0.6}>Capital region</text>
        </g>
      </svg>
      {hc && hp && tooltip && (
        <div className="pointer-events-none absolute z-20 rise"
          style={{ left: `${(hp[0] / FI_W) * 100}%`, top: `${(hp[1] / FI_H) * 100}%`, transform: `translate(${hp[0] > FI_W * 0.55 ? '-90%' : '-10%'}, 14px)` }}>
          <div className="bg-ink text-paper rounded-lg shadow-2xl px-3 py-2 whitespace-nowrap">
            <p className="font-serif text-lg leading-tight">{hc.name}</p>
            <div className="font-type text-sm uppercase tracking-wider opacity-80 mt-1">{tooltip(hc)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
