import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import StatsSection from '../components/StatsSection'
import HowItWorksSection from '../components/HowItWorksSection'
import AboutSection from '../components/AboutSection'
import FinalCTA from '../components/FinalCTA'
import InstallAppBanner from '../components/InstallAppBanner'

function HomePage() {
  const navigate = useNavigate()
  const { user, userType, loading } = useAuth()

  // Auto-redirect signed-in users straight to their dashboard
  useEffect(() => {
    if (loading) return
    if (!user) return

    if (userType === 'nurse') {
      navigate('/nurse/dashboard', { replace: true })
    } else if (userType === 'facility' || userType === 'facility_member') {
      navigate('/facility/dashboard', { replace: true })
    }
  }, [user, userType, loading, navigate])

  // Show a tiny loading state while auth resolves (prevents marketing page flash for logged-in users)
  if (loading || user) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="dashboard-loading">Loading...</div>
      </div>
    )
  }

  // Logged-out users: see the marketing homepage
  return (
    <div className="app">
      <Header />
      <main className="main">
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <AboutSection />
        <FinalCTA />
      </main>
      <Footer />
      <InstallAppBanner />
    </div>
  )
}

export default HomePage