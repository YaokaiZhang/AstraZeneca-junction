import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PatientPage from './pages/patient'
import HospitalPage from './pages/hospital'
import CountyPage from './pages/county'
import MonitorPage from './pages/monitor'

export default function App() {
  return (
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
  )
}
