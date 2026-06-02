import { Link, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, LogOut, User } from 'lucide-react'
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
  let displayName = ''
  if (userType === 'nurse') {
    dashboardPath = '/nurse/dashboard'
    displayName = profile?.first_name || ''
  } else if (userType === 'facility' || userType === 'facility_member') {
    dashboardPath = '/facility/dashboard'
    displayName = profile?.facility_name || profile?.contact_first_name || ''
  }

  const linkStyle = {
    color: 'inherit',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer'
  }

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
            {displayName && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#64748B',
                fontSize: '0.9rem',
                padding: '0.5rem 0.5rem'
              }}>
                <User size={16} />
                {displayName}
              </span>
            )}

            {dashboardPath && (
              <Link to={dashboardPath} style={linkStyle}>
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            )}

            <button
              onClick={handleSignOut}
              style={{
                ...linkStyle,
                background: 'transparent',
                border: 'none',
                font: 'inherit',
                color: '#DC2626'
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