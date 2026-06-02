import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Building2, Users, Calendar, Plus, Check, X, Clock, Eye, Settings, Search } from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import {
  SPECIALTIES,
  CERTS,
  ROLES,
  ROLE_PAY_GUIDE,
  getPlatformFee,
  getBillRate,
  getSpecialtyTier,
  getSpecialtyTierLabel
} from '../constants/specialties'

function FacilityDashboardPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [floatPool, setFloatPool] = useState([])
  const [shifts, setShifts] = useState([])
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    unit: '', specialty: '', shift_date: '', additional_dates: [],
    start_time: '', end_time: '', shift_category: 'day',
    required_role: 'RN', required_specialties: [], preferred_specialties: [],
    required_certifications: ['BLS'], preferred_certifications: [],
    nurse_pay_rate: '', urgency: 'standard', backup_nurse_enabled: false,
    break_minutes: 30, dress_code: '', parking_info: '', unit_supervisor: '', notes: ''
  })

  useEffect(() => {
    if (!loading && (!user || !profile)) navigate('/signin')
    if (profile) { loadFloatPool(); loadShifts() }
  }, [user, profile, loading])

  async function loadFloatPool() {
    const { data } = await supabase.from('float_pool').select('*, nurses(id, first_name, last_name, license_type, license_state, years_experience, reliability_score, star_rating, specialties)').eq('facility_id', profile.id)
    setFloatPool(data || [])
  }

  async function loadShifts() {
    const { data } = await supabase.from('shifts').select('*, nurses:assigned_nurse_id(first_name, last_name, license_type)').eq('facility_id', profile.id).order('shift_date', { ascending: false })
    setShifts(data || [])
  }

  async function approveNurse(poolId) {
    await supabase.from('float_pool').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', poolId)
    loadFloatPool()
  }

  async function denyNurse(poolId) {
    await supabase.from('float_pool').update({ status: 'denied', reviewed_at: new Date().toISOString() }).eq('id', poolId)
    loadFloatPool()
  }

  function toggleListItem(field, value) {
    const current = shiftForm[field] || []
    if (current.includes(value)) setShiftForm({ ...shiftForm, [field]: current.filter(v => v !== value) })
    else setShiftForm({ ...shiftForm, [field]: [...current, value] })
  }

  function addExtraDate() { setShiftForm({ ...shiftForm, additional_dates: [...shiftForm.additional_dates, ''] }) }
  function updateExtraDate(i, v) { const d = [...shiftForm.additional_dates]; d[i] = v; setShiftForm({ ...shiftForm, additional_dates: d }) }
  function removeExtraDate(i) { setShiftForm({ ...shiftForm, additional_dates: shiftForm.additional_dates.filter((_, idx) => idx !== i) }) }

  async function postShift(e) {
    e.preventDefault()
    const start = new Date(`2000-01-01T${shiftForm.start_time}`)
    const end = new Date(`2000-01-01T${shiftForm.end_time}`)
    let hours = (end - start) / (1000 * 60 * 60)
    if (hours <= 0) hours += 24
    const payRate = parseFloat(shiftForm.nurse_pay_rate)
    const allDates = [shiftForm.shift_date, ...shiftForm.additional_dates.filter(d => d)]

    // Calculate platform fee based on role + specialty + urgency
    const platformFee = getPlatformFee(shiftForm.required_role, shiftForm.specialty, shiftForm.urgency)
    const billRate = payRate + platformFee

    const toInsert = allDates.map(date => ({
      facility_id: profile.id,
      unit: shiftForm.unit,
      specialty: shiftForm.specialty,
      shift_date: date,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      scheduled_hours: hours,
      shift_category: shiftForm.shift_category,
      required_role: shiftForm.required_role,
      required_specialties: shiftForm.required_specialties,
      preferred_specialties: shiftForm.preferred_specialties,
      required_certifications: shiftForm.required_certifications,
      preferred_certifications: shiftForm.preferred_certifications,
      nurse_pay_rate: payRate,
      platform_fee_rate: platformFee,
      bill_rate: billRate,
      urgency: shiftForm.urgency,
      backup_nurse_enabled: shiftForm.backup_nurse_enabled,
      break_minutes: shiftForm.break_minutes || 30,
      dress_code: shiftForm.dress_code || null,
      parking_info: shiftForm.parking_info || null,
      unit_supervisor: shiftForm.unit_supervisor || null,
      notes: shiftForm.notes || null
    }))

    const { error } = await supabase.from('shifts').insert(toInsert)
    if (error) alert('Error: ' + error.message)
    else {
      alert(`✓ Posted ${toInsert.length} shift${toInsert.length > 1 ? 's' : ''}!`)
      setShowShiftForm(false)
      setShiftForm({ unit: '', specialty: '', shift_date: '', additional_dates: [], start_time: '', end_time: '', shift_category: 'day', required_role: 'RN', required_specialties: [], preferred_specialties: [], required_certifications: ['BLS'], preferred_certifications: [], nurse_pay_rate: '', urgency: 'standard', backup_nurse_enabled: false, break_minutes: 30, dress_code: '', parking_info: '', unit_supervisor: '', notes: '' })
      loadShifts()
    }
  }

  async function cancelShift(id) {
    if (!confirm('Cancel this shift?')) return
    await supabase.from('shifts').update({ status: 'cancelled' }).eq('id', id)
    loadShifts()
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  const pendingNurses = floatPool.filter(p => p.status === 'pending')
  const approvedNurses = floatPool.filter(p => p.status === 'approved')
  const openShifts = shifts.filter(s => s.status === 'open')
  const completedShifts = shifts.filter(s => s.status === 'completed')

  const payGuide = ROLE_PAY_GUIDE[shiftForm.required_role] || { min: 0, max: 100, typical: 0 }

  // Live pricing calculations for the form preview
  const livePlatformFee = getPlatformFee(shiftForm.required_role, shiftForm.specialty, shiftForm.urgency)
  const livePayRate = parseFloat(shiftForm.nurse_pay_rate) || 0
  const liveBillRate = livePayRate + livePlatformFee
  const liveTier = shiftForm.specialty ? getSpecialtyTier(shiftForm.specialty) : null
  const liveTierLabel = shiftForm.specialty ? getSpecialtyTierLabel(shiftForm.specialty) : null

  // Estimate shift duration for total cost preview
  let liveHours = 0
  if (shiftForm.start_time && shiftForm.end_time) {
    const s = new Date(`2000-01-01T${shiftForm.start_time}`)
    const e = new Date(`2000-01-01T${shiftForm.end_time}`)
    liveHours = (e - s) / (1000 * 60 * 60)
    if (liveHours <= 0) liveHours += 24
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/facility/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{profile.facility_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="dash-container">
        <aside className="dash-sidebar">
          <h2>Dashboard</h2>
          <nav>
            <a href="#overview" className="active"><Building2 size={18} /> Overview</a>
            <a href="#shifts"><Calendar size={18} /> Shifts</a>
            <a href="#pool"><Users size={18} /> Float Pool</a>
            <a href="#pending"><Clock size={18} /> Pending ({pendingNurses.length})</a>
            <a href="/facility/find-nurses" style={{ color: '#0A7E8C', fontWeight: 600 }}><Search size={18} /> Find Staff</a>
            <a href="/facility/profile" style={{ color: '#0A7E8C', fontWeight: 600 }}><Settings size={18} /> Facility Settings</a>
          </nav>
        </aside>

        <main className="dash-main">
          <section id="overview" className="dash-section">
            <h1>{profile.facility_name}</h1>
            <p className="dash-subtitle">{profile.facility_type} · {profile.city}, {profile.state}</p>
            <div className="stat-cards">
              <div className="dash-stat"><Users size={24} /><div className="dash-stat-value">{approvedNurses.length}</div><div className="dash-stat-label">Approved Staff</div></div>
              <div className="dash-stat"><Clock size={24} /><div className="dash-stat-value">{pendingNurses.length}</div><div className="dash-stat-label">Pending Applications</div></div>
              <div className="dash-stat"><Calendar size={24} /><div className="dash-stat-value">{openShifts.length}</div><div className="dash-stat-label">Open Shifts</div></div>
              <div className="dash-stat"><Check size={24} /><div className="dash-stat-value">{completedShifts.length}</div><div className="dash-stat-label">Completed Shifts</div></div>
            </div>
          </section>

          <section id="shifts" className="dash-section">
            <div className="section-head">
              <h2>Shifts</h2>
              <button className="primary-btn" onClick={() => setShowShiftForm(!showShiftForm)}><Plus size={18} /> Post New Shift</button>
            </div>

            {showShiftForm && (
              <form className="shift-form" onSubmit={postShift}>
                <h3 style={{ color: '#1B3A6B', marginBottom: '1rem' }}>Shift Basics</h3>

                <div className="form-row">
                  <div className="form-field">
                    <label>Unit / Department *</label>
                    <input type="text" placeholder="e.g., ICU East, Med-Surg 4th Floor" value={shiftForm.unit} onChange={(e) => setShiftForm({...shiftForm, unit: e.target.value})} required />
                  </div>
                  <div className="form-field">
                    <label>Specialty *</label>
                    <select value={shiftForm.specialty} onChange={(e) => setShiftForm({...shiftForm, specialty: e.target.value})} required>
                      <option value="">Select specialty</option>
                      {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Role Required *</label>
                    <select value={shiftForm.required_role} onChange={(e) => setShiftForm({...shiftForm, required_role: e.target.value})}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Shift Category</label>
                    <select value={shiftForm.shift_category} onChange={(e) => setShiftForm({...shiftForm, shift_category: e.target.value})}>
                      <option value="day">Day</option><option value="evening">Evening</option><option value="night">Night</option><option value="weekend">Weekend</option><option value="on-call">On-Call</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Urgency</label>
                    <select value={shiftForm.urgency} onChange={(e) => setShiftForm({...shiftForm, urgency: e.target.value})}>
                      <option value="standard">Standard (&gt;48 hr notice)</option>
                      <option value="urgent">Urgent (&lt;48 hr) — +$2/hr</option>
                      <option value="critical">Critical/Stat (&lt;24 hr) — +$4/hr</option>
                    </select>
                  </div>
                </div>

                <h3 style={{ color: '#1B3A6B', marginTop: '1.5rem', marginBottom: '1rem' }}>Schedule</h3>
                <div className="form-row">
                  <div className="form-field"><label>Primary Date *</label><input type="date" value={shiftForm.shift_date} onChange={(e) => setShiftForm({...shiftForm, shift_date: e.target.value})} required /></div>
                  <div className="form-field"><label>Start Time *</label><input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({...shiftForm, start_time: e.target.value})} required /></div>
                  <div className="form-field"><label>End Time *</label><input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({...shiftForm, end_time: e.target.value})} required /></div>
                </div>
                {shiftForm.additional_dates.map((date, i) => (
                  <div key={i} className="form-row" style={{ alignItems: 'end' }}>
                    <div className="form-field"><label>Additional Date #{i + 2}</label><input type="date" value={date} onChange={(e) => updateExtraDate(i, e.target.value)} /></div>
                    <button type="button" className="deny-btn" onClick={() => removeExtraDate(i)} style={{ marginBottom: '1rem' }}><X size={16} /> Remove</button>
                  </div>
                ))}
                <button type="button" className="secondary-btn" onClick={addExtraDate} style={{ marginBottom: '1rem' }}><Plus size={16} /> Add Another Date</button>

                <h3 style={{ color: '#1B3A6B', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Required Certifications</h3>
                <div className="specialty-grid" style={{ marginBottom: '1.5rem' }}>
                  {CERTS.map(c => (
                    <button key={c} type="button" className={shiftForm.required_certifications.includes(c) ? 'specialty-chip selected' : 'specialty-chip'} onClick={() => toggleListItem('required_certifications', c)}>
                      {shiftForm.required_certifications.includes(c) && <Check size={14} />}{c}
                    </button>
                  ))}
                </div>

                <h3 style={{ color: '#1B3A6B', marginBottom: '0.5rem' }}>Preferred Certifications</h3>
                <div className="specialty-grid" style={{ marginBottom: '1.5rem' }}>
                  {CERTS.map(c => (
                    <button key={c} type="button" className={shiftForm.preferred_certifications.includes(c) ? 'specialty-chip selected' : 'specialty-chip'} onClick={() => toggleListItem('preferred_certifications', c)}>
                      {shiftForm.preferred_certifications.includes(c) && <Check size={14} />}{c}
                    </button>
                  ))}
                </div>

                <h3 style={{ color: '#1B3A6B', marginBottom: '1rem' }}>Compensation</h3>
                <div className="form-field">
                  <label>Nurse Pay Rate ($/hour) *</label>
                  <input type="number" step="0.50" placeholder={`Typical ${shiftForm.required_role}: $${payGuide.typical}/hr`} value={shiftForm.nurse_pay_rate} onChange={(e) => setShiftForm({...shiftForm, nurse_pay_rate: e.target.value})} required />
                  <span className="form-hint">
                    Suggested {shiftForm.required_role} range: ${payGuide.min}-${payGuide.max}/hr
                  </span>
                </div>

                {/* ============ LIVE PRICING BREAKDOWN ============ */}
                {shiftForm.specialty && shiftForm.required_role && (
                  <div style={{
                    background: '#f0f7f8',
                    border: '2px solid #0A7E8C',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    marginTop: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ color: '#1B3A6B', margin: 0, fontSize: '1.05rem' }}>💰 Your Pricing Breakdown</h4>
                      <span style={{
                        background: liveTier === 'PREMIUM' ? '#1B3A6B' :
                                    liveTier === 'SPECIALTY' ? '#0A7E8C' :
                                    liveTier === 'MID' ? '#15803D' : '#6b7280',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        {liveTierLabel} Tier
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nurse pay rate:</span>
                        <strong>${livePayRate.toFixed(2)}/hr</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0A7E8C' }}>
                        <span>
                          Flexprn platform fee
                          {shiftForm.urgency === 'urgent' && ' (incl. +$2 urgent)'}
                          {shiftForm.urgency === 'critical' && ' (incl. +$4 critical)'}:
                        </span>
                        <strong>+${livePlatformFee.toFixed(2)}/hr</strong>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #0A7E8C',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                        fontSize: '1.05rem',
                        color: '#1B3A6B'
                      }}>
                        <span><strong>Your total bill rate:</strong></span>
                        <strong>${liveBillRate.toFixed(2)}/hr</strong>
                      </div>
                      {liveHours > 0 && livePayRate > 0 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          background: 'white',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}>
                          <span>Total for one {liveHours}-hr shift:</span>
                          <strong style={{ color: '#1B3A6B' }}>${(liveBillRate * liveHours).toFixed(2)}</strong>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem', marginBottom: 0, fontStyle: 'italic' }}>
                      Traditional agencies typically mark up 50-100%. Flexprn's flat-fee model saves you money on every shift.
                    </p>
                  </div>
                )}
                {/* ============ END PRICING BREAKDOWN ============ */}

                <h3 style={{ color: '#1B3A6B', marginTop: '1.5rem', marginBottom: '1rem' }}>Onsite Details</h3>
                <div className="form-field"><label>Unit Supervisor</label><input type="text" placeholder="e.g., Sarah Johnson, RN — Charge Nurse" value={shiftForm.unit_supervisor} onChange={(e) => setShiftForm({...shiftForm, unit_supervisor: e.target.value})} /></div>
                <div className="form-field"><label>Dress Code</label><input type="text" placeholder="e.g., Navy scrubs" value={shiftForm.dress_code} onChange={(e) => setShiftForm({...shiftForm, dress_code: e.target.value})} /></div>
                <div className="form-field"><label>Parking</label><input type="text" placeholder="e.g., Garage B, level 2" value={shiftForm.parking_info} onChange={(e) => setShiftForm({...shiftForm, parking_info: e.target.value})} /></div>
                <div className="form-field"><label>Notes</label><textarea value={shiftForm.notes} onChange={(e) => setShiftForm({...shiftForm, notes: e.target.value})} /></div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="primary-btn">Post Shift{shiftForm.additional_dates.filter(d => d).length > 0 && `s (${shiftForm.additional_dates.filter(d => d).length + 1})`}</button>
                  <button type="button" className="secondary-btn" onClick={() => setShowShiftForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            {shifts.length === 0 ? <p className="empty-state">No shifts posted yet.</p> : (
              <div className="shift-list">
                {shifts.map(shift => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-info">
                      <h3>{shift.specialty || shift.unit} · {shift.required_role}
                        {shift.urgency === 'urgent' && <span className="urgency-badge urgent"> URGENT</span>}
                        {shift.urgency === 'critical' && <span className="urgency-badge critical"> STAT</span>}
                      </h3>
                      <p>{shift.unit} · {new Date(shift.shift_date).toLocaleDateString()} · {shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}</p>
                      <p className="shift-pay">${shift.nurse_pay_rate}/hr nurse · ${shift.bill_rate}/hr bill</p>
                      {shift.nurses && <p style={{ color: '#0A7E8C', fontWeight: 600, marginTop: '0.4rem' }}>✓ Assigned: {shift.nurses.first_name} {shift.nurses.last_name}</p>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <span className={`status-badge status-${shift.status}`}>{shift.status}</span>
                      <button className="secondary-btn small-btn" onClick={() => navigate(`/shift/${shift.id}`)}><Eye size={14} /> View</button>
                      {shift.status === 'open' && <button className="deny-btn" onClick={() => cancelShift(shift.id)}>Cancel</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="pending" className="dash-section">
            <h2>Pending Applications ({pendingNurses.length})</h2>
            {pendingNurses.length === 0 ? <p className="empty-state">No pending applications.</p> : (
              <div className="pool-list">
                {pendingNurses.map(p => (
                  <div key={p.id} className="pool-card">
                    <div>
                      <h3>{p.nurses?.first_name} {p.nurses?.last_name}</h3>
                      <p>{p.nurses?.license_type} · {p.nurses?.license_state} · {p.nurses?.years_experience} years</p>
                      <p>Reliability: {p.nurses?.reliability_score}%</p>
                    </div>
                    <div className="approve-actions">
                      <button className="secondary-btn small-btn" onClick={() => navigate(`/facility/nurse/${p.nurses?.id}`)}><Eye size={16} /> View</button>
                      <button className="approve-btn" onClick={() => approveNurse(p.id)}><Check size={16} /> Approve</button>
                      <button className="deny-btn" onClick={() => denyNurse(p.id)}><X size={16} /> Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="pool" className="dash-section">
            <h2>Your Float Pool ({approvedNurses.length})</h2>
            {approvedNurses.length === 0 ? <p className="empty-state">No approved staff yet.</p> : (
              <div className="pool-list">
                {approvedNurses.map(p => (
                  <div key={p.id} className="pool-card">
                    <div>
                      <h3>{p.nurses?.first_name} {p.nurses?.last_name}</h3>
                      <p>{p.nurses?.license_type} · {p.nurses?.years_experience} years · {p.nurses?.reliability_score}% reliability</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="status-badge status-approved">Approved</span>
                      <button className="secondary-btn small-btn" onClick={() => navigate(`/facility/nurse/${p.nurses?.id}`)}><Eye size={16} /> View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default FacilityDashboardPage