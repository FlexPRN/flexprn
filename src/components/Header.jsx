import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <Zap className="logo-icon" size={24} />
        <span>Flexprn</span>
      </Link>
      <nav className="nav">
        <Link to="/for-nurses">For Nurses</Link>
        <Link to="/for-facilities">For Facilities</Link>
        <Link to="/signin" className="signin-btn">Sign In</Link>
      </nav>
    </header>
  )
}

export default Header