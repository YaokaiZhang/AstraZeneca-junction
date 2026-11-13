// Tiny inline stroke icons (no icon package in the project).
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IconPhone = ({ className = 'w-4 h-4' }) => (
  <svg {...base} className={className}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
)
export const IconCal = ({ className = 'w-4 h-4' }) => (
  <svg {...base} className={className}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
)
export const IconCheck = ({ className = 'w-4 h-4' }) => (
  <svg {...base} className={className}><path d="M4.5 12.5l5 5L19.5 7" /></svg>
)
export const IconLock = ({ className = 'w-6 h-6' }) => (
  <svg {...base} className={className}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)
export const IconArrow = ({ className = 'w-4 h-4' }) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const IconUndo = ({ className = 'w-4 h-4' }) => (
  <svg {...base} className={className}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
)
