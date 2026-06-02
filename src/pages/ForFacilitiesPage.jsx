import { Link } from 'react-router-dom'
import { ArrowRight, Building2, BadgeDollarSign, Users, Lock, Sparkles } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatsSection from '../components/StatsSection'
import ComparisonTable from '../components/ComparisonTable'
import FinalCTA from '../components/FinalCTA'

function ForFacilitiesPage() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <section className="hero-section">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <div className="badge">
              <Sparkles size={14} />
              <span>For Facilities</span>
            </div>
            <h1>Cut Agency Costs by 30-45%.<br/>Without Cutting Quality.</h1>
            <p className="subtitle">
              Build your own pre-vetted float pool, post same-day shifts in 60 seconds,
              and pay only a flat personnel fee — never an agency markup again.
            </p>
            <div className="cta-buttons">
              <Link to="/signup/facility" className="primary-btn">
                Get Started — It's Free <ArrowRight size={18} />
              </Link>
              <Link to="/signin" className="secondary-btn">
                Request a Demo
              </Link>
            </div>
          </div>
        </section>

        <StatsSection />

        <section className="benefits-section">
          <div className="section-header">
            <div className="eyebrow">For Hospitals & Long-Term Care</div>
            <h2>Built for healthcare administrators</h2>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><BadgeDollarSign size={28} /></div>
              <h3>Cut Staffing Spend by 30-45%</h3>
              <p>Pay nurses directly with a flat platform fee — eliminate the 20-40% agency markup on every hour.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Users size={28} /></div>
              <h3>Build Your Own Float Pool</h3>
              <p>Approve every nurse before they ever work a shift. Total control over who's in your building.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Lock size={28} /></div>
              <h3>Full Pricing Transparency</h3>
              <p>See exactly what nurses earn vs. the platform fee. No hidden margins, no black-box bill rates.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Building2 size={28} /></div>
              <h3>Lower Conversion Fees</h3>
              <p>Want to hire a great PRN permanently? Pay $1,500-$7,500 instead of $10K-$25K agency conversion fees.</p>
            </div>
          </div>
        </section>

        <ComparisonTable />

        <FinalCTA
          title="Ready to stop overpaying agencies?"
          subtitle="Set up your facility account in under 24 hours. No setup fees, no minimum contracts."
          primaryLink="/signup/facility"
          primaryText="Create Facility Account"
          secondaryLink="/signin"
          secondaryText="Talk to Our Team"
        />
      </main>
      <Footer />
    </div>
  )
}

export default ForFacilitiesPage