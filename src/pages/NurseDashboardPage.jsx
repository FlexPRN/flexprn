import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Award, TrendingUp, Building2, Calendar, Star, Clock, Settings, Mail, Menu, X } from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function NurseDashboardPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [facilities, setFacilities] = useState([])
  const [myPools, setMyPools] = useState([])
  const [openShifts, setOpenShifts] = useState([])
  const [myShifts, setMyShifts] = useState([])
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/signin')
    }
    if (profile) {
      loadFacilities()
      loadMyPools()
      loadAvailableShifts()
      loadMyShifts()
      loadPendingInvitesCount()
    }
  }, [user, profile, loading])

  async function loadFacilities() {
    const { data } = await supabase.from('facilities').select('id, facility_name, facility_type, city, state')
    setFacilities(data || [])
  }

  async function loadMyPools() {
    const { data } = await supabase.from('float_pool').select('*, facilities(facility_name, city, state)').eq('nurse_id', profile.id)
    setMyPools(data || [])
  }

  async function loadPendingInvitesCount() {
    const { data } = await supabase
      .from('recruitment_invites')
      .select('id')
      .eq('nurse_id', profile.id)
      .eq('status', 'pending')
    setPendingInvitesCount((data || []).length)
  }

  async function loadAvailableShifts() {
    const approvedFacilityIds = (await supabase
      .from('float_pool')
      .select('facility_id')
      .eq('nurse_id', profile.id)
      .eq('status', 'approved')).data?.map(p => p.facility_id) || []

    if (approvedFacilityIds.length === 0) {
      setOpenShifts([])
      return
    }

    const { data } = await supabase
      .from('shifts')
      .select('*, facilities(facility_name, city, state)')
      .eq('status', 'open')
      .in('facility_id', approvedFacilityIds)
      .order('shift_date', { ascending: true })
      .limit(5)

    setOpenShifts(data || [])
  }

  async function loadMyShifts() {
    const { data } = await supabase
      .from('shifts')
      .select('*, facilities(facility_name)')
      .eq('assigned_nurse_id', profile.id)
      .in('status', ['filled', 'in_progress'])
      .order('shift_date', { ascending: true })
      .limit(3)
    setMyShifts(data || [])
  }

  async function applyToPool(facilityId) {
    const { error } = await supabase.from('float_pool').insert({
      nurse_id: profile.id,
      facility_id: facilityId,
      status: 'pending'
    })
    if (error) {
      alert('Already applied or error: ' + error.message)
    } else {
      alert('Application submitted!')
      loadMyPools()
    }
  }

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  return (
    <div className="dashboard">
      {/* MOBILE NAV STYLES */}
      <style>{`
        .mobile-menu-btn { display: none; }
        .mobile-nav-backdrop { display: none; }
        @media (max-width: 900px) {
          .mobile-menu-btn {
            display: inline-flex !important;
            align-items: center;
            background: transparent;
            border: none;
            color: #1B3A6B;
            cursor: pointer;
            padding: 0.5rem;
            margin-right: 0.25rem;
          }
          .dash-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            max-width: 80vw;
            background: white !important;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 2px 0 12px rgba(0,0,0,0.15);
            overflow-y: auto;
            padding: 1.5rem 1rem !important;
            display: block !important;
          }
          .dash-sidebar.mobile-open {
            transform: translateX(0);
          }
          .mobile-nav-backdrop.visible {
            display: block !important;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
          }
          .dash-sidebar nav a {
            padding: 0.85rem 0.75rem;
            font-size: 1rem;
            border-radius: 8px;
          }
        }
      `}</style>

      <header className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="dash-logo" onClick={() => navigate('/nurse/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        </div>
        <div className="dash-user">
          <span>Welcome, {profile.first_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="dash-container">
        {/* Mobile backdrop */}
        <div
          className={`mobile-nav-backdrop ${mobileNavOpen ? 'visible' : ''}`}
          onClick={closeMobileNav}
        ></div>

        <aside className={`dash-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Dashboard</h2>
            <button
              onClick={closeMobileNav}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '0.25rem',
                display: window.innerWidth < 900 ? 'flex' : 'none'
              }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav>
            <a href="#overview" className="active" onClick={closeMobileNav}><User size={18} /> Overview</a>
            <a href="/nurse/shifts" onClick={closeMobileNav}><Calendar size={18} /> Browse Shifts</a>
            <a href="/nurse/invites" onClick={closeMobileNav} style={{ position: 'relative' }}>
              <Mail size={18} /> Invites
              {pendingInvitesCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '0.75rem',
                  transform: 'translateY(-50%)',
                  background: '#DC2626',
                  color: 'white',
                  borderRadius: '999px',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  minWidth: '1.5rem',
                  textAlign: 'center'
                }}>
                  {pendingInvitesCount}
                </span>
              )}
            </a>
            <a href="#pools" onClick={closeMobileNav}><Building2 size={18} /> My Float Pools</a>
            <a href="#facilities" onClick={closeMobileNav}><Building2 size={18} /> Find Facilities</a>
            <a href="/nurse/profile" onClick={closeMobileNav} style={{ color: '#0A7E8C', fontWeight: 600 }}><Settings size={18} /> Edit My Profile</a>
          </nav>
        </aside>

        <main className="dash-main">
          <section id="overview" className="dash-section">
            <h1>Welcome back, {profile.first_name}!</h1>
            <p className="dash-subtitle">{profile.license_type} · {profile.license_state} · {profile.years_experience} years experience</p>

            <div className="stat-cards">
              <div className="dash-stat">
                <TrendingUp size={24} />
                <div className="dash-stat-value">{profile.reliability_score}%</div>
                <div className="dash-stat-label">Reliability Score</div>
              </div>
              <div className="dash-stat">
                <Star size={24} />
                <div className="dash-stat-value">{profile.star_rating || '—'}</div>
                <div className="dash-stat-label">Star Rating</div>
              </div>
              <div className="dash-stat">
                <Clock size={24} />
                <div className="dash-stat-value">{profile.total_shifts_worked}</div>
                <div className="dash-stat-label">Shifts Completed</div>
              </div>
              <div className="dash-stat">
                <Building2 size={24} />
                <div className="dash-stat-value">{myPools.filter(p => p.status === 'approved').length}</div>
                <div className="dash-stat-label">Active Float Pools</div>
              </div>
            </div>
          </section>

          {pendingInvitesCount > 0 && (
            <section className="dash-section" style={{ background: 'linear-gradient(135deg, #FEF9F0 0%, #FDF6E3 100%)', border: '2px solid #FBBF24', borderRadius: '10px' }}>
              <div className="section-head">
                <h2 style={{ color: '#92400E', margin: 0 }}>
                  <Mail size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  You have {pendingInvitesCount} pending invitation{pendingInvitesCount > 1 ? 's' : ''}!
                </h2>
                <button className="primary-btn" onClick={() => navigate('/nurse/invites')}>
                  View Invitations
                </button>
              </div>
              <p style={{ color: '#92400E', margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
                Facilities have invited you to their float pool. Accept to start receiving shift offers.
              </p>
            </section>
          )}

          {myShifts.length > 0 && (
            <section className="dash-section">
              <div className="section-head">
                <h2>Upcoming Shifts</h2>
                <a href="/nurse/shifts" className="forgot-link">View all →</a>
              </div>
              <div className="shift-list">
                {myShifts.map(shift => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{shift.facilities?.facility_name}</h3>
                      <p>{shift.unit} · {new Date(shift.shift_date).toLocaleDateString()} · {shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}</p>
                      <p className="shift-pay">${shift.nurse_pay_rate}/hr · {shift.scheduled_hours} hours</p>
                    </div>
                    <span className={`status-badge status-${shift.status}`}>{shift.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="shifts" className="dash-section">
            <div className="section-head">
              <h2>Available Shifts</h2>
              <a href="/nurse/shifts" className="forgot-link">View all →</a>
            </div>
            {openShifts.length === 0 ? (
              <p className="empty-state">No shifts available right now. Apply to facility float pools to start receiving shifts.</p>
            ) : (
              <div className="shift-list">
                {openShifts.map(shift => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{shift.facilities?.facility_name}</h3>
                      <p>{shift.unit} · {new Date(shift.shift_date).toLocaleDateString()} · {shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}</p>
                      <p className="shift-pay">${shift.nurse_pay_rate}/hr · {shift.scheduled_hours} hours</p>
                    </div>
                    <button className="primary-btn" onClick={() => navigate('/nurse/shifts')}>View Details</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="pools" className="dash-section">
            <h2>My Float Pools</h2>
            {myPools.length === 0 ? (
              <p className="empty-state">You haven't joined any float pools yet. Browse facilities below.</p>
            ) : (
              <div className="pool-list">
                {myPools.map(pool => (
                  <div key={pool.id} className="pool-card">
                    <div>
                      <h3>{pool.facilities?.facility_name}</h3>
                      <p>{pool.facilities?.city}, {pool.facilities?.state}</p>
                    </div>
                    <span className={`status-badge status-${pool.status}`}>{pool.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="facilities" className="dash-section">
            <h2>Find Facilities to Join</h2>
            {facilities.length === 0 ? (
              <p className="empty-state">No facilities have signed up yet. Check back soon!</p>
            ) : (
              <div className="facility-list">
                {facilities.map(facility => {
                  const isApplied = myPools.some(p => p.facility_id === facility.id)
                  return (
                    <div key={facility.id} className="facility-card">
                      <div>
                        <h3>{facility.facility_name}</h3>
                        <p>{facility.facility_type} · {facility.city}, {facility.state}</p>
                      </div>
                      <button
                        className="primary-btn"
                        onClick={() => applyToPool(facility.id)}
                        disabled={isApplied}
                      >
                        {isApplied ? 'Applied' : 'Apply to Pool'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default NurseDashboardPage