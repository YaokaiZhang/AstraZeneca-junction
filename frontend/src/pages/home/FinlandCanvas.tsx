import { useEffect, useRef } from 'react'
import { FI_H, FI_RINGS, FI_W, KM_PER_UNIT, project, unproject } from '../../data/finland'

export const HOSPITALS: { name: string; lat: number; lon: number; uni?: boolean }[] = [
  { name: 'Helsinki', lat: 60.19, lon: 24.9, uni: true },
  { name: 'Turku', lat: 60.45, lon: 22.27, uni: true },
  { name: 'Tampere', lat: 61.5, lon: 23.8, uni: true },
  { name: 'Kuopio', lat: 62.89, lon: 27.65, uni: true },
  { name: 'Oulu', lat: 65.01, lon: 25.5, uni: true },
  { name: 'Jyväskylä', lat: 62.24, lon: 25.75 },
  { name: 'Rovaniemi', lat: 66.5, lon: 25.73 },
  { name: 'Joensuu', lat: 62.6, lon: 29.76 },
  { name: 'Vaasa', lat: 63.1, lon: 21.62 },
  { name: 'Lahti', lat: 60.98, lon: 25.66 },
  { name: 'Seinäjoki', lat: 62.79, lon: 22.84 },
  { name: 'Kajaani', lat: 64.23, lon: 27.73 },
  { name: 'Kotka', lat: 60.47, lon: 26.95 },
  { name: 'Lappeenranta', lat: 61.06, lon: 28.19 },
  { name: 'Pori', lat: 61.49, lon: 21.8 },
  { name: 'Mikkeli', lat: 61.69, lon: 27.27 },
  { name: 'Hämeenlinna', lat: 61.0, lon: 24.46 },
  { name: 'Kokkola', lat: 63.84, lon: 23.13 },
  { name: 'Kemi', lat: 65.74, lon: 24.56 },
  { name: 'Savonlinna', lat: 61.87, lon: 28.88 },
]

export type Hover = { lat: number; lon: number; hospital: string; km: number } | null
export type Tally = { onTime: number; late: number }

const INK: RGB = [31, 31, 31]
const MUSTARD: RGB = [255, 194, 51]
const TERRA: RGB = [198, 93, 59]
type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

function inside(x: number, y: number) {
  let hit = false
  for (const r of FI_RINGS) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
  }
  return hit
}

type Dot = { x: number; y: number; delay: number; heat: number; tint: number; seed: number }
type Pulse = { x: number; y: number; t0: number; c: RGB; speed: number; life: number }
type Trip = { ax: number; ay: number; cx: number; cy: number; bx: number; by: number; t0: number; dur: number; late: boolean; h: number }

const H_PTS = HOSPITALS.map((h) => project(h.lat, h.lon))

function nearestHospital(x: number, y: number) {
  let best = 0, bd = Infinity
  H_PTS.forEach(([hx, hy], i) => { const d = (hx - x) ** 2 + (hy - y) ** 2; if (d < bd) { bd = d; best = i } })
  return { i: best, d: Math.sqrt(bd) }
}

export default function FinlandCanvas({ onHover, onTally, className }: {
  onHover?: (h: Hover) => void; onTally?: (t: Tally) => void; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cb = useRef({ onHover, onTally })
  cb.current = { onHover, onTally }

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const G = 8.5
    const dots: Dot[] = []
    for (let y = G / 2; y < FI_H; y += G) {
      for (let x = G / 2; x < FI_W; x += G) {
        const jx = x + (y / G % 2 ? G / 2 : 0)
        if (inside(jx, y)) dots.push({ x: jx, y, delay: (FI_H - y) * 1.6 + Math.random() * 380, heat: 0, tint: 0, seed: Math.random() })
      }
    }
    // Helsinki and the south are denser: weight trip origins by latitude
    const origins = dots.filter((d) => Math.random() < (d.y > 700 ? 1 : d.y > 450 ? 0.55 : 0.22))

    let W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      const r = cv.getBoundingClientRect()
      W = r.width; H = r.height
      cv.width = W * dpr; cv.height = H * dpr
      sc = Math.min((H * 0.84) / FI_H, (W * 0.9) / FI_W)
      ox = (W - FI_W * sc) / 2; oy = (H - FI_H * sc) / 2 + H * 0.03
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(cv)

    const mouse = { x: -1e4, y: -1e4, mx: -1e4, my: -1e4, on: false }
    const pulses: Pulse[] = []
    const trips: Trip[] = []
    const tally: Tally = { onTime: 0, late: 0 }
    const hospHeat = HOSPITALS.map(() => 0)
    const start = performance.now()
    let lastTrip = 0, lastBeat = 0, beatI = 0, lastHoverKey = ''

    const toMap = (px: number, py: number) => [(px - ox) / sc, (py - oy) / sc] as const

    const spawnTrip = (now: number, from?: { x: number; y: number }) => {
      const o = from ?? origins[(Math.random() * origins.length) | 0]
      const n = nearestHospital(o.x, o.y)
      // sometimes referred on to the university hospital: longer trip
      let hi = n.i
      if (Math.random() < 0.25) { let bd = Infinity; H_PTS.forEach(([hx, hy], i) => { if (HOSPITALS[i].uni) { const d = (hx - o.x) ** 2 + (hy - o.y) ** 2; if (d < bd) { bd = d; hi = i } } }) }
      const [bx, by] = H_PTS[hi]
      const dist = Math.hypot(bx - o.x, by - o.y)
      if (dist < 6) return
      const nx = -(by - o.y) / dist, ny = (bx - o.x) / dist
      const bend = dist * (0.25 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1)
      const km = dist * KM_PER_UNIT
      const late = Math.random() < Math.min(0.75, 0.12 + km / 520)
      trips.push({ ax: o.x, ay: o.y, bx, by, cx: (o.x + bx) / 2 + nx * bend, cy: (o.y + by) / 2 + ny * bend, t0: now, dur: 1100 + dist * 9 * (late ? 1.7 : 1), late, h: hi })
    }

    const bez = (t: Trip, u: number) => {
      const v = 1 - u
      return [v * v * t.ax + 2 * v * u * t.cx + u * u * t.bx, v * v * t.ay + 2 * v * u * t.cy + u * u * t.by] as const
    }

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true
    }
    const onLeave = () => { mouse.on = false; cb.current.onHover?.(null); lastHoverKey = '' }
    const onClick = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      const [x, y] = toMap(e.clientX - r.left, e.clientY - r.top)
      const now = performance.now()
      pulses.push({ x, y, t0: now, c: MUSTARD, speed: 0.32, life: 1600 })
      if (inside(x, y)) for (let i = 0; i < 7; i++) spawnTrip(now + i * 40, { x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30 })
    }
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerleave', onLeave)
    cv.addEventListener('pointerdown', onClick)

    let raf = 0
    const frame = (now: number) => {
      // schedule first so a bad frame can never stop the animation and leave the map blank
      raf = requestAnimationFrame(frame)
      try { draw(now) } catch (e) { console.error(e) }
    }
    const draw = (now: number) => {
      const t = now - start
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      mouse.mx += (mouse.x - mouse.mx) * 0.18; mouse.my += (mouse.y - mouse.my) * 0.18
      if (!mouse.on) { mouse.mx = mouse.x; mouse.my = mouse.y }

      // heartbeat: a wave from a hospital every beat
      if (!reduce && now - lastBeat > 1400) {
        lastBeat = now
        const h = H_PTS[beatI++ % H_PTS.length]
        pulses.push({ x: h[0], y: h[1], t0: now, c: TERRA, speed: 0.16, life: 2200 })
      }
      if (!reduce && t > 1800 && now - lastTrip > 140) { lastTrip = now; spawnTrip(now) }

      const [mmx, mmy] = toMap(mouse.mx, mouse.my)
      const lensR = 70 / sc

      // dots
      const base = Math.max(1, sc * 2.6)
      for (const d of dots) {
        const a = reduce ? 1 : Math.min(1, Math.max(0, (t - d.delay) / 500))
        if (a <= 0) continue
        let boost = 0, tint = 0
        for (const p of pulses) {
          const age = now - p.t0
          if (age < 0 || age >= p.life) continue // expired (e.g. after the tab was in the background)
          const rr = age * p.speed
          const dd = Math.hypot(d.x - p.x, d.y - p.y)
          const band = 1 - Math.abs(dd - rr) / 14
          if (band > 0) { const fade = 1 - age / p.life; boost += band * fade * 0.9; tint = Math.max(tint, band * fade) ; if (p.c === MUSTARD) tint = -Math.max(-tint, band * fade) }
        }
        if (mouse.on) {
          const md = Math.hypot(d.x - mmx, d.y - mmy)
          if (md < lensR) { const k = 1 - md / lensR; boost += k * k * 2.4; tint = -Math.max(Math.abs(tint), k) }
        }
        d.heat = Math.max(d.heat * 0.94, 0)
        boost += d.heat
        const wob = reduce ? 0 : Math.sin(t / 900 + d.seed * 6.28) * 0.12
        const r = Math.max(0, base * (0.55 + wob + boost * 0.55) * (0.4 + 0.6 * a))
        const col = tint < 0 ? mix(INK, MUSTARD, Math.min(1, -tint * 1.2)) : mix(INK, TERRA, Math.min(1, tint * 1.2))
        ctx.fillStyle = rgba(col, (0.5 + Math.min(0.5, boost * 0.5)) * a)
        const sx = ox + d.x * sc, sy = oy + d.y * sc
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill()
      }
      for (let i = pulses.length - 1; i >= 0; i--) if (now - pulses[i].t0 > pulses[i].life) pulses.splice(i, 1)

      // trips
      ctx.lineCap = 'round'
      for (let i = trips.length - 1; i >= 0; i--) {
        const tr = trips[i]
        const u = (now - tr.t0) / tr.dur
        if (u < 0) continue
        if (u >= 1.35) { trips.splice(i, 1); continue }
        const c = tr.late ? TERRA : MUSTARD
        const head = Math.min(1, u), tail = Math.max(0, Math.min(1, u - 0.35))
        const N = 14
        for (let s = 0; s < N; s++) {
          const u0 = tail + ((head - tail) * s) / N, u1 = tail + ((head - tail) * (s + 1)) / N
          const [x0, y0] = bez(tr, u0), [x1, y1] = bez(tr, u1)
          ctx.strokeStyle = rgba(c === MUSTARD ? mix(MUSTARD, INK, 0.12) : c, ((s + 1) / N) * 0.85)
          ctx.lineWidth = Math.max(1, sc * 2.2) * ((s + 1) / N)
          ctx.beginPath(); ctx.moveTo(ox + x0 * sc, oy + y0 * sc); ctx.lineTo(ox + x1 * sc, oy + y1 * sc); ctx.stroke()
        }
        if (u < 1) {
          const [hx, hy] = bez(tr, u)
          ctx.fillStyle = rgba(c, 1)
          ctx.beginPath(); ctx.arc(ox + hx * sc, oy + hy * sc, Math.max(1.6, sc * 3), 0, 6.2832); ctx.fill()
        } else if (!(tr as Trip & { done?: boolean }).done) {
          (tr as Trip & { done?: boolean }).done = true
          hospHeat[tr.h] = 1
          if (tr.late) tally.late++; else tally.onTime++
          cb.current.onTally?.({ ...tally })
          pulses.push({ x: tr.bx, y: tr.by, t0: now, c, speed: 0.06, life: 700 })
        }
      }

      // hospitals: medical crosses
      HOSPITALS.forEach((h, i) => {
        const [hx, hy] = H_PTS[i]
        const sx = ox + hx * sc, sy = oy + hy * sc
        hospHeat[i] *= 0.95
        const s = Math.max(3, sc * (h.uni ? 7 : 5)) * (1 + hospHeat[i] * 0.5)
        const appear = reduce ? 1 : Math.min(1, Math.max(0, (t - 1200 - i * 50) / 400))
        if (!appear) return
        ctx.save(); ctx.translate(sx, sy); ctx.scale(appear, appear)
        ctx.fillStyle = '#F4F1EA'
        ctx.beginPath(); ctx.arc(0, 0, s * 1.25, 0, 6.2832); ctx.fill()
        ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = rgba(mix(TERRA, MUSTARD, hospHeat[i] * 0.0), 1)
        const a = s * 0.28
        ctx.fillRect(-a, -s * 0.8, a * 2, s * 1.6); ctx.fillRect(-s * 0.8, -a, s * 1.6, a * 2)
        ctx.restore()
      })

      // lens
      if (mouse.on) {
        const n = nearestHospital(mmx, mmy)
        const [lat, lon] = unproject(mmx, mmy)
        ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 1
        ctx.setLineDash([3, 4]); ctx.lineDashOffset = -t / 40
        ctx.beginPath(); ctx.arc(mouse.mx, mouse.my, 70, 0, 6.2832); ctx.stroke()
        if (inside(mmx, mmy)) {
          const [hx, hy] = H_PTS[n.i]
          ctx.strokeStyle = rgba(TERRA, 0.7)
          ctx.beginPath(); ctx.moveTo(mouse.mx, mouse.my); ctx.lineTo(ox + hx * sc, oy + hy * sc); ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.strokeStyle = rgba(INK, 0.8)
        ctx.beginPath(); ctx.moveTo(mouse.mx - 6, mouse.my); ctx.lineTo(mouse.mx + 6, mouse.my); ctx.moveTo(mouse.mx, mouse.my - 6); ctx.lineTo(mouse.mx, mouse.my + 6); ctx.stroke()
        const key = inside(mmx, mmy) ? `${n.i}|${Math.round(n.d * KM_PER_UNIT / 5)}|${lat.toFixed(2)}|${lon.toFixed(2)}` : 'out'
        if (key !== lastHoverKey) {
          lastHoverKey = key
          cb.current.onHover?.(key === 'out' ? null : { lat, lon, hospital: HOSPITALS[n.i].name, km: Math.round(n.d * KM_PER_UNIT) })
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerleave', onLeave); cv.removeEventListener('pointerdown', onClick)
    }
  }, [])

  return <canvas ref={ref} className={className} style={{ touchAction: 'none' }} aria-label="Map of Finland with patients travelling to hospitals" role="img" />
}
