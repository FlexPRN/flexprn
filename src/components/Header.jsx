import { Link, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../useAuth'

function Header() {
  const navigate = useNavigate()
  const { user, profile, userType, signOut, loading } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  // Determine where Dashboard should link
  let dashboardPath = null
  if (userType === 'nurse') dashboardPath = '/nurse/dashboard'
  else if (userType === 'facility' || userType === 'facility_member') dashboardPath = '/facility/dashboard'

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <Zap className="logo-icon" size={24} />
        <span>Flexprn</span>
      </Link>
      <nav className="nav">
        {!user && !loading && (
          <>
            <Link to="/for-nurses">For Nurses</Link>
            <Link to="/for-facilities">For Facilities</Link>
            <Link to="/signin" className="signin-btn">Sign In</Link>
          </>
        )}

        {user && !loading && (
          <>
            {dashboardPath && (
              <Link to={dashboardPath} className="signin-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            )}
            <button
              onClick={handleSignOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                font: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem'
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

export default Header