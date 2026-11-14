import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { TextRing, Toaster, cx } from './ui'
import { useStore } from '../lib/store'

const NAV = [
  { to: '/patient', label: 'Patient', sub: 'Notice · track · ask' },
  { to: '/hospital', label: 'Hospital', sub: 'Who is falling behind' },
  { to: '/county', label: 'County', sub: 'Where people are lost' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const reset = useStore((s) => s.reset)
  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row">
      <aside className="w-full lg:w-[260px] xl:w-[300px] lg:h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-stone/60 flex lg:flex-col justify-between gap-3 sm:gap-6 p-4 sm:p-5 lg:p-10 z-20 bg-paper shrink-0">
        <div className="flex lg:flex-col gap-4 lg:gap-8 items-center lg:items-start">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 border border-current rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
            </div>
            <span className="lg:hidden font-serif text-2xl italic">Ajoissa</span>
          </NavLink>
          <div className="hidden lg:block">
            <h1 className="text-6xl font-light leading-[0.9]">Ajo<br /><span className="ml-8 italic">issa</span></h1>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-3 sm:gap-4 lg:gap-5 lg:mt-auto items-center lg:items-start">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to)
            return (
              <NavLink key={n.to} to={n.to} className={cx('group font-type uppercase text-[11px] sm:text-xs lg:text-sm tracking-wider sm:tracking-widest hover:text-terra transition-colors', !active && 'opacity-50')}>
                <span className="flex items-center gap-2">
                  {active && <span className="w-1.5 h-1.5 bg-terra rounded-full" />}
                  {n.label}
                </span>
                <span className="hidden lg:block normal-case tracking-normal text-xs opacity-70 mt-1 pl-3.5">{n.sub}</span>
              </NavLink>
            )
          })}
          <button onClick={() => { if (confirm('Clear all demo data?')) { reset(); location.reload() } }}
            className="hidden lg:block font-type uppercase text-xs tracking-widest opacity-40 hover:opacity-100 hover:text-terra mt-6">Reset demo</button>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 relative overflow-x-clip">
        <div className="absolute top-0 right-0 p-10 opacity-[0.07] pointer-events-none hidden xl:block">
          <TextRing size={340} text="ajoissa • cancer on time • finland • strategy 2026–2035 • " />
        </div>
        <div className="relative">
          <Outlet />
        </div>
      </main>
      <Toaster />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')" }} />
    </div>
  )
}
