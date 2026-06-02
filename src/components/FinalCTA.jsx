import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function FinalCTA({ title, subtitle, primaryLink, primaryText, secondaryLink, secondaryText }) {
  return (
    <section className="final-cta">
      <div className="final-cta-content">
        <h2>{title || 'Ready to fill your next shift?'}</h2>
        <p>{subtitle || 'Join Flexprn and see why hospitals are leaving traditional agencies behind.'}</p>
        <div className="cta-buttons">
          <Link to={primaryLink || '/signup/nurse'} className="primary-btn">
            {primaryText || "Get Started — It's Free"} <ArrowRight size={18} />
          </Link>
          <Link to={secondaryLink || '/signup/facility'} className="secondary-btn">
            {secondaryText || 'Request a Demo'}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FinalCTA