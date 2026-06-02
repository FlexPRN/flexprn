import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo">
            <Zap className="logo-icon" size={24} />
            <span>Flexprn</span>
          </div>
          <p>Same-day PRN coverage, zero agency overhead.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>For Nurses</h4>
            <Link to="/for-nurses">Find Shifts</Link>
            <Link to="/signup/nurse">Sign Up</Link>
            <Link to="/signin">Sign In</Link>
          </div>
          <div className="footer-col">
            <h4>For Facilities</h4>
            <Link to="/for-facilities">Post Shifts</Link>
            <Link to="/signup/facility">Get Started</Link>
            <Link to="/signin">Sign In</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Flexprn. Built by nurses, for nurses.</p>
      </div>
    </footer>
  )
}

export default Footer