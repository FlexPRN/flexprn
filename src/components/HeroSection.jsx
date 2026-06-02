import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'

function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-bg"></div>
      <div className="hero-content">
        <div className="badge">
          <Sparkles size={14} />
          <span>Built by ED nurses, for nurses</span>
        </div>
        <h1>Same-Day PRN Coverage.<br/>Zero Agency Overhead.</h1>
        <p className="subtitle">
          The direct-to-facility platform connecting pre-vetted nurses
          with hospitals for same-day shift coverage.
        </p>
        <div className="cta-buttons">
          <Link to="/signup/nurse" className="primary-btn">
            I'm a Nurse — Find Shifts <ArrowRight size={18} />
          </Link>
          <Link to="/signup/facility" className="secondary-btn">
            I'm a Facility — Post Shifts
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HeroSection