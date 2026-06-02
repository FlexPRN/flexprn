import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Users, Building2, Calendar, DollarSign,
  TrendingUp, Shield, Filter, Download, BarChart3, Award
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Data states
  const [nurses, setNurses] = useState([])
  const [facilities, setFacilities] = useState([])
  const [shifts, setShifts] = useState([])
  const [ledger, setLedger] = useState([])

  // Filter states
  const [filterDate, setFilterDate] = useState('all')
  const [filterRole, setFilterRole] = useState('all')

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/signin')
      } else {
        checkAdminAccess()
      }
    }
  }, [user, loading])

  async function checkAdminAccess() {
    const { data } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setIsAdmin(true)
      loadAllData()
    } else {
      setIsAdmin(false)
    }
    setCheckingAdmin(false)
  }

  async function loadAllData() {
    const [n, f, s, l] = await Promise.all([
      supabase.from('nurses').select('*').order('created_at', { ascending: false }),
      supabase.from('facilities').select('*').order('created_at', { ascending: false }),
      supabase.from('shifts').select('*, facilities(facility_name), nurses:assigned_nurse_id(first_name, last_name)').order('shift_date', { ascending: false }),
      supabase.from('revenue_ledger').select('*, facilities(facility_name), nurses(first_name, last_name)').order('recorded_at', { ascending: false })
    ])
    setNurses(n.data || [])
    setFacilities(f.data || [])
    setShifts(s.data || [])
    setLedger(l.data || [])
  }

  function filterLedger() {
    let filtered = [...ledger]
    if (filterRole !== 'all') {
      filtered = filtered.filter(r => r.role_type === filterRole)
    }
    if (filterDate !== 'all') {
      const now = new Date()
      let cutoff = new Date()
      if (filterDate === '7days') cutoff.setDate(now.getDate() - 7)
      if (filterDate === '30days') cutoff.setDate(now.getDate() - 30)
      if (filterDate === '90days') cutoff.setDate(now.getDate() - 90)
      filtered = filtered.filter(r => new Date(r.recorded_at) >= cutoff)
    }
    return filtered
  }

  const filtered = filterLedger()
  const totalRevenue = filtered.reduce((sum, r) => sum + parseFloat(r.total_platform_revenue || 0), 0)
  const totalBilled = filtered.reduce((sum, r) => sum + parseFloat(r.total_facility_charge || 0), 0)
  const totalNursePaid = filtered.reduce((sum, r) => sum + parseFloat(r.total_nurse_pay || 0), 0)
  const totalHours = filtered.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0)
  const avgFeePerHour = totalHours > 0 ? (totalRevenue / totalHours).toFixed(2) : 0

  // Revenue by role
  const revenueByRole = {}
  filtered.forEach(r => {
    if (!revenueByRole[r.role_type]) revenueByRole[r.role_type] = { count: 0, revenue: 0, hours: 0 }
    revenueByRole[r.role_type].count += 1
    revenueByRole[r.role_type].revenue += parseFloat(r.total_platform_revenue || 0)
    revenueByRole[r.role_type].hours += parseFloat(r.hours_worked || 0)
  })

  // Revenue by specialty
  const revenueBySpecialty = {}
  filtered.forEach(r => {
    const key = r.specialty || 'Unspecified'
    if (!revenueBySpecialty[key]) revenueBySpecialty[key] = { count: 0, revenue: 0 }
    revenueBySpecialty[key].count += 1
    revenueBySpecialty[key].revenue += parseFloat(r.total_platform_revenue || 0)
  })

  // Top facilities by spend
  const facilitySpend = {}
  filtered.forEach(r => {
    const fid = r.facility_id
    if (!facilitySpend[fid]) {
      facilitySpend[fid] = {
        name: r.facilities?.facility_name || 'Unknown',
        revenue: 0,
        shifts: 0
      }
    }
    facilitySpend[fid].revenue += parseFloat(r.total_platform_revenue || 0)
    facilitySpend[fid].shifts += 1
  })
  const topFacilities = Object.values(facilitySpend).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  function exportCSV() {
    const headers = ['Date', 'Facility', 'Nurse', 'Role', 'Specialty', 'Hours', 'Pay Rate', 'Fee Rate', 'Bill Rate', 'Nurse Pay', 'Platform Revenue', 'Facility Charge']
    const rows = filtered.map(r => [
      r.shift_date,
      r.facilities?.facility_name,
      `${r.nurses?.first_name} ${r.nurses?.last_name}`,
      r.role_type,
      r.specialty,
      r.hours_worked,
      r.nurse_pay_rate,
      r.platform_fee_rate,
      r.bill_rate,
      r.total_nurse_pay,
      r.total_platform_revenue,
      r.total_facility_charge
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flexprn-revenue-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  if (loading || checkingAdmin) return <div className="dashboard-loading">Loading...</div>

  if (!isAdmin) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading" style={{ flexDirection: 'column', gap: '1rem' }}>
          <Shield size={48} style={{ color: '#94A3B8' }} />
          <h2 style={{ color: '#1B3A6B' }}>Admin Access Required</h2>
          <p style={{ color: '#64748B' }}>You don't have admin permissions to view this page.</p>
          <button className="primary-btn" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo">⚡ Flexprn <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, marginLeft: '0.5rem' }}>ADMIN</span></div>
        <div className="dash-user">
          <span>Admin Console</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="dash-container">
        <aside className="dash-sidebar">
          <h2>Admin</h2>
          <nav>
            <a onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''} style={{ cursor: 'pointer' }}>
              <BarChart3 size={18} /> Overview
            </a>
            <a onClick={() => setActiveTab('revenue')} className={activeTab === 'revenue' ? 'active' : ''} style={{ cursor: 'pointer' }}>
              <DollarSign size={18} /> Revenue
            </a>
            <a onClick={() => setActiveTab('nurses')} className={activeTab === 'nurses' ? 'active' : ''} style={{ cursor: 'pointer' }}>
              <Users size={18} /> Nurses ({nurses.length})
            </a>
            <a onClick={() => setActiveTab('facilities')} className={activeTab === 'facilities' ? 'active' : ''} style={{ cursor: 'pointer' }}>
              <Building2 size={18} /> Facilities ({facilities.length})
            </a>
            <a onClick={() => setActiveTab('shifts')} className={activeTab === 'shifts' ? 'active' : ''} style={{ cursor: 'pointer' }}>
              <Calendar size={18} /> Shifts ({shifts.length})
            </a>
          </nav>
        </aside>

        <main className="dash-main">
          {activeTab === 'overview' && (
            <>
              <section className="dash-section">
                <h1>Platform Overview</h1>
                <p className="dash-subtitle">Real-time metrics across all of Flexprn</p>

                <div className="stat-cards">
                  <div className="dash-stat">
                    <DollarSign size={24} />
                    <div className="dash-stat-value">${totalRevenue.toFixed(0)}</div>
                    <div className="dash-stat-label">Platform Revenue</div>
                  </div>
                  <div className="dash-stat">
                    <Users size={24} />
                    <div className="dash-stat-value">{nurses.length}</div>
                    <div className="dash-stat-label">Total Nurses</div>
                  </div>
                  <div className="dash-stat">
                    <Building2 size={24} />
                    <div className="dash-stat-value">{facilities.length}</div>
                    <div className="dash-stat-label">Total Facilities</div>
                  </div>
                  <div className="dash-stat">
                    <Calendar size={24} />
                    <div className="dash-stat-value">{ledger.length}</div>
                    <div className="dash-stat-label">Completed Shifts</div>
                  </div>
                </div>
              </section>

              <section className="dash-section">
                <h2>Revenue by Role</h2>
                {Object.keys(revenueByRole).length === 0 ? (
                  <p className="empty-state">No completed shifts yet.</p>
                ) : (
                  <div className="shift-list">
                    {Object.entries(revenueByRole).map(([role, data]) => (
                      <div key={role} className="shift-card">
                        <div className="shift-info">
                          <h3>{role}</h3>
                          <p>{data.count} shifts · {data.hours.toFixed(1)} hours total</p>
                        </div>
                        <div className="shift-pay" style={{ fontSize: '1.2rem' }}>
                          ${data.revenue.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="dash-section">
                <h2>Top Facilities by Revenue</h2>
                {topFacilities.length === 0 ? (
                  <p className="empty-state">No facility activity yet.</p>
                ) : (
                  <div className="shift-list">
                    {topFacilities.map((f, i) => (
                      <div key={i} className="shift-card">
                        <div className="shift-info">
                          <h3>{i+1}. {f.name}</h3>
                          <p>{f.shifts} completed shifts</p>
                        </div>
                        <div className="shift-pay" style={{ fontSize: '1.2rem' }}>
                          ${f.revenue.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'revenue' && (
            <section className="dash-section">
              <div className="section-head">
                <h1>Revenue Ledger</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: '0.5rem 0.85rem', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}>
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '0.5rem 0.85rem', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}>
                    <option value="all">All Roles</option>
                    <option value="RN">RN</option>
                    <option value="LPN">LPN</option>
                    <option value="CNA">CNA</option>
                  </select>
                  <button className="secondary-btn" onClick={exportCSV}>
                    <Download size={16} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="stat-cards">
                <div className="dash-stat">
                  <div className="dash-stat-value">${totalRevenue.toFixed(0)}</div>
                  <div className="dash-stat-label">Platform Revenue</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-value">${totalBilled.toFixed(0)}</div>
                  <div className="dash-stat-label">Total Billed Facilities</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-value">${totalNursePaid.toFixed(0)}</div>
                  <div className="dash-stat-label">Total Paid to Nurses</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-value">${avgFeePerHour}</div>
                  <div className="dash-stat-label">Avg Fee per Hour</div>
                </div>
              </div>

              <h2>Transaction Log ({filtered.length})</h2>
              {filtered.length === 0 ? (
                <p className="empty-state">No revenue transactions in this period.</p>
              ) : (
                <div className="shift-list">
                  {filtered.map(r => (
                    <div key={r.id} className="shift-card">
                      <div className="shift-info">
                        <h3>{r.facilities?.facility_name} → {r.nurses?.first_name} {r.nurses?.last_name}</h3>
                        <p>{r.role_type} · {r.specialty} · {r.hours_worked}h · {new Date(r.shift_date).toLocaleDateString()}</p>
                        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                          Nurse paid: ${r.total_nurse_pay} · Platform fee: ${r.total_platform_revenue} · Billed facility: ${r.total_facility_charge}
                        </p>
                      </div>
                      <div className="shift-pay" style={{ fontSize: '1.1rem', color: '#0A7E8C' }}>
                        +${parseFloat(r.total_platform_revenue).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'nurses' && (
            <section className="dash-section">
              <h1>All Nurses ({nurses.length})</h1>
              <div className="shift-list">
                {nurses.map(n => (
                  <div key={n.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{n.first_name} {n.last_name}</h3>
                      <p>{n.license_type} · {n.license_state} · {n.years_experience} years</p>
                      <p style={{ fontSize: '0.85rem' }}>
                        Reliability: {n.reliability_score}% · Rating: {n.star_rating || '—'} ·
                        {n.total_shifts_worked || 0} completed
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        {n.email} · Joined {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {n.suspended_until && (
                      <span className="status-badge status-denied">Suspended</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'facilities' && (
            <section className="dash-section">
              <h1>All Facilities ({facilities.length})</h1>
              <div className="shift-list">
                {facilities.map(f => (
                  <div key={f.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{f.facility_name}</h3>
                      <p>{f.facility_type} · {f.city}, {f.state}</p>
                      <p style={{ fontSize: '0.85rem' }}>
                        Contact: {f.contact_first_name} {f.contact_last_name} ({f.contact_title})
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        {f.email} · Joined {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'shifts' && (
            <section className="dash-section">
              <h1>All Shifts ({shifts.length})</h1>
              <div className="shift-list">
                {shifts.map(s => (
                  <div key={s.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{s.facilities?.facility_name} · {s.unit}</h3>
                      <p>{s.required_role} · {new Date(s.shift_date).toLocaleDateString()} · {s.start_time.slice(0,5)}-{s.end_time.slice(0,5)}</p>
                      <p className="shift-pay">${s.nurse_pay_rate}/hr nurse · ${s.bill_rate}/hr bill</p>
                      {s.nurses && <p style={{ color: '#0A7E8C' }}>Assigned: {s.nurses.first_name} {s.nurses.last_name}</p>}
                    </div>
                    <span className={`status-badge status-${s.status}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboardPage