import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PatientPage from './pages/patient'
import HospitalPage from './pages/hospital'
import CountyPage from './pages/county'
import MonitorPage from './pages/monitor'
import { SHOW_FULL_STORY } from './config'

/** Start each page at the top (county switches only change the query, so they keep their place). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route index element={<Home />} />
      <Route element={<Layout />}>
        {/* the earlier patient, hospital and county pages stay in the code but are not reachable while hidden */}
        {SHOW_FULL_STORY && <Route path="patient/*" element={<PatientPage />} />}
        {SHOW_FULL_STORY && <Route path="hospital/*" element={<HospitalPage />} />}
        {SHOW_FULL_STORY && <Route path="county/*" element={<CountyPage />} />}
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  )
}
