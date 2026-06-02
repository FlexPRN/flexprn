import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import StatsSection from '../components/StatsSection'
import HowItWorksSection from '../components/HowItWorksSection'
import AboutSection from '../components/AboutSection'
import FinalCTA from '../components/FinalCTA'
import InstallAppBanner from '../components/InstallAppBanner'

function HomePage() {
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