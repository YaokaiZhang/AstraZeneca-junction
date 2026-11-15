// Keeps the one-page plan on one A4 page when printed. Just before printing, measure #monitor-print at the printable
// width (A4 minus the 14 mm margins: 182 x 269 mm) and, only if it is taller, scale it down with `zoom`, widening it by
// the same factor so it still fills the page width. A long AI briefing can need this; template plans usually don't.
import { useEffect } from 'react'

const W = 182, H = 267 // mm; 2 mm under the printable height for safety
const PX_PER_MM = 96 / 25.4

function heightAt(el: HTMLElement, widthMm: number) {
  const old = el.getAttribute('style') ?? ''
  el.setAttribute('style', `display:block;position:absolute;left:0;top:0;width:${widthMm}mm;visibility:hidden`)
  const mm = el.getBoundingClientRect().height / PX_PER_MM
  el.setAttribute('style', old)
  return mm
}

export function fitPrint() {
  const el = document.getElementById('monitor-print')
  if (!el) return
  el.style.zoom = ''
  el.style.width = ''
  let z = 1
  for (let i = 0; i < 4; i++) { // wider text wraps less, so iterate to a stable scale
    const h = heightAt(el, W / z)
    if (h * z <= H) break
    z = Math.max(0.6, H / h)
  }
  if (z < 1) { el.style.width = `${W / z}mm`; el.style.zoom = String(z) }
}

function resetPrint() {
  const el = document.getElementById('monitor-print')
  if (el) { el.style.zoom = ''; el.style.width = '' }
}

/** Call once on each monitor page. */
export function usePrintFit() {
  useEffect(() => {
    window.addEventListener('beforeprint', fitPrint)
    window.addEventListener('afterprint', resetPrint)
    return () => { window.removeEventListener('beforeprint', fitPrint); window.removeEventListener('afterprint', resetPrint) }
  }, [])
}
