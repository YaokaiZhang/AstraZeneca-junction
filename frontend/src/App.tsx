import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PatientPage from './pages/patient'
import HospitalPage from './pages/hospital'
import CountyPage from './pages/county'
import MonitorPage from './pages/monitor'

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
        <Route path="patient/*" element={<PatientPage />} />
        <Route path="hospital/*" element={<HospitalPage />} />
        <Route path="county/*" element={<CountyPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  )
}
