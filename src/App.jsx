import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ForNursesPage from './pages/ForNursesPage'
import ForFacilitiesPage from './pages/ForFacilitiesPage'
import NurseSignupPage from './pages/NurseSignupPage'
import FacilitySignupPage from './pages/FacilitySignupPage'
import SignInPage from './pages/SignInPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NurseDashboardPage from './pages/NurseDashboardPage'
import NurseProfilePage from './pages/NurseProfilePage'
import NurseShiftsPage from './pages/NurseShiftsPage'
import NurseInvitesPage from './pages/NurseInvitesPage'
import NurseImmunizationsPage from './pages/NurseImmunizationsPage'
import FacilityDashboardPage from './pages/FacilityDashboardPage'
import FacilityProfilePage from './pages/FacilityProfilePage'
import FacilityTeamPage from './pages/FacilityTeamPage'
import NursePoolDetailPage from './pages/NursePoolDetailPage'
import FindNursesPage from './pages/FindNursesPage'
import ShiftDetailPage from './pages/ShiftDetailPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import ChatPage from './pages/ChatPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/for-nurses" element={<ForNursesPage />} />
      <Route path="/for-facilities" element={<ForFacilitiesPage />} />
      <Route path="/signup/nurse" element={<NurseSignupPage />} />
      <Route path="/signup/facility" element={<FacilitySignupPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/nurse/dashboard" element={<NurseDashboardPage />} />
      <Route path="/nurse/profile" element={<NurseProfilePage />} />
      <Route path="/nurse/shifts" element={<NurseShiftsPage />} />
      <Route path="/nurse/invites" element={<NurseInvitesPage />} />
      <Route path="/nurse/immunizations" element={<NurseImmunizationsPage />} />
      <Route path="/nurse/messages" element={<ChatPage viewerType="nurse" />} />
      <Route path="/facility/dashboard" element={<FacilityDashboardPage />} />
      <Route path="/facility/profile" element={<FacilityProfilePage />} />
      <Route path="/facility/team" element={<FacilityTeamPage />} />
      <Route path="/facility/messages" element={<ChatPage viewerType="facility" />} />
      <Route path="/facility/nurse/:nurseId" element={<NursePoolDetailPage />} />
      <Route path="/facility/find-nurses" element={<FindNursesPage />} />
      <Route path="/shift/:shiftId" element={<ShiftDetailPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
    </Routes>
  )
}

export default App