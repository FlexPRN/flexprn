import { Link } from 'react-router-dom'
import { ArrowRight, DollarSign, Calendar, Shield, Star, Sparkles } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HowItWorksSection from '../components/HowItWorksSection'
import FinalCTA from '../components/FinalCTA'

function ForNursesPage() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <section className="hero-section">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <div className="badge">
              <Sparkles size={14} />
              <span>For Nurses</span>
            </div>
            <h1>Work When You Want.<br/>Get Paid What You're Worth.</h1>
            <p className="subtitle">
              Build a PRN portfolio across multiple facilities. Transparent pay, no agency middleman,
              guaranteed shift coverage. The career flexibility you actually want.
            </p>
            <div className="cta-buttons">
              <Link to="/signup/nurse" className="primary-btn">
                Create Your Free Profile <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section className="benefits-section">
          <div className="section-header">
            <div className="eyebrow">Why Nurses Love Flexprn</div>
            <h2>Everything PRN should be</h2>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><DollarSign size={28} /></div>
              <h3>Transparent Pay</h3>
              <p>See exactly what you earn per hour before accepting. No agency markup eating into your wage.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Calendar size={28} /></div>
              <h3>Total Schedule Control</h3>
              <p>Apply to multiple facilities, accept only the shifts that work for you. PRN life on your terms.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Shield size={28} /></div>
              <h3>Guaranteed Shift Pay</h3>
              <p>Sent home early? You still get paid for the full shift. Protection built into every work order.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Star size={28} /></div>
              <h3>Build Your Reputation</h3>
              <p>Reliability score and star ratings travel with you. Strong reputation means priority access to shifts.</p>
            </div>
          </div>
        </section>

        <HowItWorksSection />

        <FinalCTA
          title="Ready to take control of your PRN career?"
          subtitle="Sign up free and start building your float pool portfolio today."
          primaryLink="/signup/nurse"
          primaryText="Create Your Profile"
          secondaryLink="/signin"
          secondaryText="I Already Have An Account"
        />
      </main>
      <Footer />
    </div>
  )
}

export default ForNursesPage