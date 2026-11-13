import { Link } from 'react-router-dom'
import { Card, EdgeText, Label } from '../components/ui'

const CARDS = [
  { to: '/patient', tone: 'mustard' as const, a: 'For the', b: 'patient', k: '01', tilt: -2 },
  { to: '/hospital', tone: 'terra' as const, a: 'For the', b: 'hospital', k: '02', tilt: 1.5 },
  { to: '/county', tone: 'stone' as const, a: 'For the', b: 'county', k: '03', tilt: 3 },
]

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 w-full max-w-5xl">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="block">
            <Card tone={c.tone} tilt={c.tilt} className="h-[360px] lg:h-[460px] p-8 pl-12 flex flex-col hover:!rotate-0 hover:-translate-y-2">
              <EdgeText>Ajoissa · {c.k}</EdgeText>
              <Label>{c.k}</Label>
              <div className="mt-auto">
                <span className="font-serif text-5xl leading-none block">{c.a}</span>
                <span className="font-serif text-5xl leading-none italic block pl-4">{c.b}</span>
              </div>
              <div className="tear mt-8 pt-3 flex justify-between items-center">
                <span className="font-type text-[10px] uppercase tracking-widest">Open</span>
                <span>→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
