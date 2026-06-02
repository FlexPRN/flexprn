import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Calendar, Clock, DollarSign, MapPin,
  Building2, CheckCircle2, AlertCircle, Award, Mail, Eye
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function NurseShiftsPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [shifts, setShifts] = useState([])
  const [myAcceptedShifts, setMyAcceptedShifts] = useState([])
  const [invites, setInvites] = useState([])
  const [approvedFacilities, setApprovedFacilities] = useState([])
  const [activeTab, setActiveTab] = useState('available')
  const [filterRole, setFilterRole] = useState('all')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [accepting, setAccepting] = useState(null)
  const [message, setMessage] = useState('')
  const [certifications, setCertifications] = useState([])
  const [documents, setDocuments] = useState([])
  const [paymentSetup, setPaymentSetup] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/signin')
    }
    if (profile) {
      loadApprovedFacilities()
      loadInvites()
      loadProfileCompleteness()
    }
  }, [user, profile, loading])

  useEffect(() => {
    if (profile && approvedFacilities.length >= 0) {
      loadShifts()
      loadMyShifts()
    }
  }, [approvedFacilities])

  async function loadProfileCompleteness() {
    const { data: certs } = await supabase.from('nurse_certifications').select('*').eq('nurse_id', profile.id)
    setCertifications(certs || [])
    const { data: docs } = await supabase.from('nurse_documents').select('*').eq('nurse_id', profile.id)
    setDocuments(docs || [])
    const { data: pay } = await supabase.from('nurse_payment_info').select('setup_complete').eq('nurse_id', profile.id).maybeSingle()
    setPaymentSetup(pay?.setup_complete || false)
  }

  function computeCompletionPercent() {
    let score = 0
    if (profile?.first_name && profile?.last_name) score += 10
    if (profile?.phone) score += 10
    if (profile?.bio) score += 10
    if (profile?.city && profile?.state) score += 10
    if ((profile?.specialties || []).length > 0) score += 15
    if (certifications.length > 0) score += 15
    if (documents.length >= 2) score += 15
    if (paymentSetup) score += 15
    return score
  }

  const isComplete = computeCompletionPercent() >= 80
  const isSuspended = profile?.suspended_until && new Date(profile.suspended_until) > new Date()

  async function loadApprovedFacilities() {
    const { data } = await supabase.from('float_pool').select('facility_id').eq('nurse_id', profile.id).eq('status', 'approved')
    setApprovedFacilities((data || []).map(d => d.facility_id))
  }

  async function loadInvites() {
    const { data } = await supabase.from('recruitment_invites').select('*, facilities(facility_name, facility_type, city, state)').eq('nurse_id', profile.id).eq('status', 'pending')
    setInvites(data || [])
  }

  async function loadShifts() {
    if (approvedFacilities.length === 0) { setShifts([]); return }
    const { data } = await supabase.from('shifts').select('*, facilities(facility_name, city, state, address)').eq('status', 'open').in('facility_id', approvedFacilities).order('shift_date', { ascending: true })
    setShifts(data || [])
  }

  async function loadMyShifts() {
    const { data } = await supabase.from('shifts').select('*, facilities(facility_name, city, state, address)').eq('assigned_nurse_id', profile.id).order('shift_date', { ascending: false })
    setMyAcceptedShifts(data || [])
  }

  async function acceptShift(shift) {
    if (!isComplete) {
      alert('You must complete your profile to 80% before applying to shifts. Go to Edit My Profile.')
      return
    }
    if (isSuspended) {
      alert(`Your account is suspended until ${new Date(profile.suspended_until).toLocaleDateString()}. Reason: ${profile.suspension_reason}`)
      return
    }
    if (!confirm(`Accept this ${shift.required_role} shift at ${shift.facilities.facility_name} on ${shift.shift_date}?`)) return

    setAccepting(shift.id)
    const { error: shiftError } = await supabase.from('shifts').update({
      status: 'filled', assigned_nurse_id: profile.id, filled_at: new Date().toISOString()
    }).eq('id', shift.id).eq('status', 'open')

    if (shiftError) { alert('Error: ' + shiftError.message); setAccepting(null); return }

    await supabase.from('shift_assignments').insert({ shift_id: shift.id, nurse_id: profile.id, status: 'assigned' })
    await supabase.from('nurses').update({ total_shifts_accepted: (profile.total_shifts_accepted || 0) + 1 }).eq('id', profile.id)

    setMessage('✓ Shift accepted!')
    setAccepting(null)
    loadShifts()
    loadMyShifts()
    setTimeout(() => setMessage(''), 4000)
  }

  async function cancelMyShift(shift) {
    const reason = prompt('Reason for cancellation (required):')
    if (!reason) return

    const hoursBefore = (new Date(shift.shift_date + 'T' + shift.start_time) - new Date()) / (1000 * 60 * 60)
    const cancelType = hoursBefore < 2 ? 'late' : hoursBefore < 24 ? 'standard' : 'standard'

    // Count recent cancellations
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { data: recent } = await supabase.from('cancellation_log').select('*').eq('nurse_id', profile.id).gte('cancelled_at', ninetyDaysAgo.toISOString())
    const count = (recent?.length || 0) + 1

    let penalty = null
    let suspendUntil = null
    if (count === 1) penalty = 'warning'
    else if (count === 2) {
      penalty = '14_day_suspension'
      const d = new Date(); d.setDate(d.getDate() + 14)
      suspendUntil = d.toISOString().slice(0,10)
    } else if (count >= 3) {
      penalty = '90_day_suspension'
      const d = new Date(); d.setDate(d.getDate() + 90)
      suspendUntil = d.toISOString().slice(0,10)
    }

    // Log cancellation
    await supabase.from('cancellation_log').insert({
      shift_id: shift.id,
      nurse_id: profile.id,
      hours_before_shift: hoursBefore.toFixed(2),
      reason,
      cancellation_type: cancelType,
      penalty_applied: penalty
    })

    // Update nurse
    const updateData = { cancellation_count_90d: count }
    if (suspendUntil) {
      updateData.suspended_until = suspendUntil
      updateData.suspension_reason = `${count}-cancellation policy violation`
    }
    await supabase.from('nurses').update(updateData).eq('id', profile.id)

    // Reopen shift
    await supabase.from('shifts').update({ status: 'open', assigned_nurse_id: null, filled_at: null }).eq('id', shift.id)
    await supabase.from('shift_assignments').update({ status: 'cancelled' }).eq('shift_id', shift.id).eq('nurse_id', profile.id)

    let msg = `Shift cancelled. `
    if (penalty === 'warning') msg += 'This is your first cancellation in 90 days - a warning has been issued.'
    if (penalty === '14_day_suspension') msg += 'You have been suspended from accepting shifts for 14 days.'
    if (penalty === '90_day_suspension') msg += 'You have been suspended from accepting shifts for 90 days due to repeat cancellations.'

    alert(msg)
    loadMyShifts()
    loadShifts()
  }

  async function respondToInvite(inviteId, accepted) {
    const invite = invites.find(i => i.id === inviteId)
    const { error } = await supabase.from('recruitment_invites').update({ status: accepted ? 'accepted' : 'declined', responded_at: new Date().toISOString() }).eq('id', inviteId)
    if (error) { alert('Error: ' + error.message); return }
    if (accepted) {
      await supabase.from('float_pool').insert({ nurse_id: profile.id, facility_id: invite.facility_id, status: 'approved', reviewed_at: new Date().toISOString() })
      setMessage(`✓ Joined ${invite.facilities.facility_name}'s float pool!`)
    } else {
      setMessage('Invitation declined.')
    }
    loadInvites()
    loadApprovedFacilities()
    setTimeout(() => setMessage(''), 4000)
  }

  const filteredShifts = shifts.filter(s => {
    if (filterRole !== 'all' && s.required_role !== filterRole) return false
    if (filterUrgency !== 'all' && s.urgency !== filterUrgency) return false
    return true
  })

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/nurse/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{profile.first_name} {profile.last_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate('/nurse/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="profile-header">
          <div>
            <h1>Shifts</h1>
            <p className="dash-subtitle">Browse available shifts and respond to invites</p>
          </div>
        </div>

        {!isComplete && (
          <div className="hardstop-warning">
            <AlertCircle size={24} />
            <div>
              <strong>Profile Incomplete — {computeCompletionPercent()}%</strong>
              <p>Your profile must be 80% complete before you can apply to shifts. <a href="/nurse/profile" style={{ color: '#0A7E8C', fontWeight: 600 }}>Complete your profile →</a></p>
            </div>
          </div>
        )}

        {isSuspended && (
          <div className="hardstop-warning suspended">
            <AlertCircle size={24} />
            <div>
              <strong>Account Suspended</strong>
              <p>Suspended until: {new Date(profile.suspended_until).toLocaleDateString()}. Reason: {profile.suspension_reason}</p>
            </div>
          </div>
        )}

        {message && <div className="success-toast">{message}</div>}

        <div className="profile-tabs">
          <button className={activeTab === 'available' ? 'tab active' : 'tab'} onClick={() => setActiveTab('available')}>
            <Calendar size={16} /> Available ({filteredShifts.length})
          </button>
          <button className={activeTab === 'mine' ? 'tab active' : 'tab'} onClick={() => setActiveTab('mine')}>
            <CheckCircle2 size={16} /> My Shifts ({myAcceptedShifts.length})
          </button>
          <button className={activeTab === 'invites' ? 'tab active' : 'tab'} onClick={() => setActiveTab('invites')}>
            <Mail size={16} /> Invites ({invites.length})
          </button>
        </div>

        {activeTab === 'available' && (
          <div className="profile-section">
            <div className="section-head">
              <div><h2>Available Shifts</h2><p className="section-help">From facilities where you've been approved</p></div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '0.5rem 0.85rem', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}>
                  <option value="all">All Roles</option><option>RN</option><option>LPN</option><option>CNA</option>
                </select>
                <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} style={{ padding: '0.5rem 0.85rem', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}>
                  <option value="all">All Urgencies</option><option value="standard">Standard</option><option value="urgent">Urgent</option><option value="critical">STAT</option>
                </select>
              </div>
            </div>

            {approvedFacilities.length === 0 ? (
              <div className="empty-state"><AlertCircle size={32} style={{ color: '#94A3B8', marginBottom: '0.5rem' }} /><p style={{ fontWeight: 600 }}>You're not in any float pools yet.</p></div>
            ) : filteredShifts.length === 0 ? (
              <p className="empty-state">No shifts match your filters.</p>
            ) : (
              <div className="shift-list">
                {filteredShifts.map(shift => (
                  <div key={shift.id} className="shift-card-detailed">
                    <div className="shift-detail-info">
                      <div className="shift-detail-header">
                        <h3>{shift.facilities?.facility_name}</h3>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <span className="role-badge">{shift.required_role}</span>
                          {shift.urgency === 'urgent' && <span className="urgency-badge urgent">Urgent</span>}
                          {shift.urgency === 'critical' && <span className="urgency-badge critical">STAT</span>}
                        </div>
                      </div>
                      <div className="shift-detail-grid">
                        <div className="shift-detail-item"><Calendar size={16} /><span>{new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
                        <div className="shift-detail-item"><Clock size={16} /><span>{shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)} ({shift.scheduled_hours}h)</span></div>
                        <div className="shift-detail-item"><Building2 size={16} /><span>{shift.unit} · {shift.shift_category}</span></div>
                        <div className="shift-detail-item"><MapPin size={16} /><span>{shift.facilities?.city}, {shift.facilities?.state}</span></div>
                      </div>
                      <div className="shift-pay-row">
                        <DollarSign size={20} />
                        <span className="shift-pay-amount">${shift.nurse_pay_rate}/hr</span>
                        <span className="shift-pay-total">≈ ${(shift.nurse_pay_rate * shift.scheduled_hours).toFixed(0)} total</span>
                      </div>
                    </div>
                    <div className="shift-accept-action" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      <button className="primary-btn" onClick={() => acceptShift(shift)} disabled={accepting === shift.id || !isComplete || isSuspended}>
                        {accepting === shift.id ? 'Accepting...' : !isComplete ? 'Profile Incomplete' : isSuspended ? 'Suspended' : 'Accept Shift'}
                      </button>
                      <button className="secondary-btn small-btn" onClick={() => navigate(`/shift/${shift.id}`)}><Eye size={14} /> Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mine' && (
          <div className="profile-section">
            <h2>My Accepted Shifts</h2>
            <p className="section-help">Click any shift to clock in/out or rate</p>
            {myAcceptedShifts.length === 0 ? <p className="empty-state">You haven't accepted any shifts yet.</p> : (
              <div className="shift-list">
                {myAcceptedShifts.map(shift => (
                  <div key={shift.id} className="shift-card-detailed">
                    <div className="shift-detail-info">
                      <div className="shift-detail-header">
                        <h3>{shift.facilities?.facility_name}</h3>
                        <span className={`status-badge status-${shift.status}`}>{shift.status}</span>
                      </div>
                      <div className="shift-detail-grid">
                        <div className="shift-detail-item"><Calendar size={16} /><span>{new Date(shift.shift_date).toLocaleDateString()}</span></div>
                        <div className="shift-detail-item"><Clock size={16} /><span>{shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}</span></div>
                        <div className="shift-detail-item"><Building2 size={16} /><span>{shift.unit}</span></div>
                        <div className="shift-detail-item"><DollarSign size={16} /><span>${shift.nurse_pay_rate}/hr</span></div>
                      </div>
                    </div>
                    <div className="shift-accept-action" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      <button className="primary-btn" onClick={() => navigate(`/shift/${shift.id}`)}><Eye size={16} /> View / Clock</button>
                      {(shift.status === 'filled' || shift.status === 'in_progress') && (
                        <button className="deny-btn small-btn" onClick={() => cancelMyShift(shift)}>Cancel Shift</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="profile-section">
            <h2>Recruitment Invitations</h2>
            {invites.length === 0 ? <p className="empty-state">No pending invitations.</p> : (
              <div className="shift-list">
                {invites.map(invite => (
                  <div key={invite.id} className="shift-card-detailed">
                    <div className="shift-detail-info">
                      <div className="shift-detail-header"><h3>{invite.facilities?.facility_name}</h3><span className="role-badge">{invite.facilities?.facility_type}</span></div>
                      <p className="shift-detail-meta"><MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {invite.facilities?.city}, {invite.facilities?.state}</p>
                      {invite.message && <div className="shift-notes" style={{ marginTop: '1rem' }}><strong>Message:</strong><p style={{ marginTop: '0.5rem' }}>{invite.message}</p></div>}
                    </div>
                    <div className="shift-accept-action" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      <button className="primary-btn" onClick={() => respondToInvite(invite.id, true)}>Accept</button>
                      <button className="secondary-btn" onClick={() => respondToInvite(invite.id, false)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NurseShiftsPage