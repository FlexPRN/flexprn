import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Calendar, Clock, DollarSign, MapPin, Building2,
  Play, Square, Star, CheckCircle2, AlertCircle, Award, User, FileText,
  Navigation, ShieldCheck, ShieldAlert
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import { getCurrentPosition, distanceInMeters, formatDistance, MAX_CLOCK_DISTANCE_METERS } from '../utils/geo'

function ShiftDetailPage() {
  const navigate = useNavigate()
  const { shiftId } = useParams()
  const { user, profile, userType, loading, signOut } = useAuth()
  const [shift, setShift] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [nurseInfo, setNurseInfo] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [gpsStatus, setGpsStatus] = useState(null)

  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState('')

  useEffect(() => {
    if (!loading && (!user || !profile)) navigate('/signin')
    if (profile && shiftId) loadShift()
  }, [user, profile, loading, shiftId])

  async function loadShift() {
    setLoadingData(true)

    const { data: shiftData } = await supabase
      .from('shifts')
      .select('*, facilities(*)')
      .eq('id', shiftId)
      .single()

    setShift(shiftData)

    if (shiftData?.assigned_nurse_id) {
      const { data: assignData } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('shift_id', shiftId)
        .eq('nurse_id', shiftData.assigned_nurse_id)
        .maybeSingle()
      setAssignment(assignData)

      const { data: nurseData } = await supabase
        .from('nurses')
        .select('*')
        .eq('id', shiftData.assigned_nurse_id)
        .single()
      setNurseInfo(nurseData)
    }

    setLoadingData(false)
  }

  async function attemptGpsAction(actionType) {
    // actionType: 'clockin' or 'clockout'
    if (!shift.facilities?.latitude || !shift.facilities?.longitude) {
      alert('Facility GPS coordinates are missing. The facility must verify their address before clock-in is available. Please contact them.')
      return null
    }

    setGettingLocation(true)
    setGpsStatus('Getting your GPS location...')

    try {
      const pos = await getCurrentPosition()
      const distance = distanceInMeters(
        pos.latitude, pos.longitude,
        shift.facilities.latitude, shift.facilities.longitude
      )

      setGpsStatus(`Distance from facility: ${formatDistance(distance)}`)

      if (distance > MAX_CLOCK_DISTANCE_METERS) {
        const proceed = confirm(
          `⚠️ You appear to be ${formatDistance(distance)} from the facility, which is outside the ${formatDistance(MAX_CLOCK_DISTANCE_METERS)} radius.\n\n` +
          `${actionType === 'clockin' ? 'Clock-in' : 'Clock-out'} is normally not allowed from this far. You can override this if there's a valid reason (e.g., GPS accuracy issue, facility in a remote area).\n\n` +
          `Click OK to request a manual override, or Cancel to stop.`
        )

        if (!proceed) {
          setGettingLocation(false)
          setGpsStatus(null)
          return null
        }

        const reason = prompt('Required: Reason for GPS override (will be logged for facility review):')
        if (!reason || reason.trim().length < 5) {
          alert('A reason of at least 5 characters is required for override.')
          setGettingLocation(false)
          setGpsStatus(null)
          return null
        }

        setGettingLocation(false)
        return {
          latitude: pos.latitude,
          longitude: pos.longitude,
          distance,
          override: true,
          overrideReason: reason
        }
      }

      setGettingLocation(false)
      return {
        latitude: pos.latitude,
        longitude: pos.longitude,
        distance,
        override: false
      }
    } catch (err) {
      alert(err.message)
      setGettingLocation(false)
      setGpsStatus(null)
      return null
    }
  }

  async function clockIn() {
    if (!confirm('Clock in for this shift? You must be on-site at the facility.')) return

    const gps = await attemptGpsAction('clockin')
    if (!gps) return

    setProcessing(true)
    const now = new Date().toISOString()

    const baseData = {
      clock_in: now,
      status: 'clocked_in',
      clock_in_latitude: gps.latitude,
      clock_in_longitude: gps.longitude,
      clock_in_distance_meters: gps.distance,
      gps_override_clockin: gps.override,
      gps_override_reason: gps.overrideReason || null
    }

    if (!assignment) {
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({ shift_id: shiftId, nurse_id: profile.id, ...baseData })
        .select()
        .single()
      if (error) alert('Error: ' + error.message)
      else {
        setAssignment(data)
        setMessage(`✓ Clocked in! Distance from facility: ${formatDistance(gps.distance)}${gps.override ? ' (override flagged)' : ''}`)
      }
    } else {
      const { error } = await supabase
        .from('shift_assignments')
        .update(baseData)
        .eq('id', assignment.id)
      if (error) alert('Error: ' + error.message)
      else setMessage(`✓ Clocked in! Distance from facility: ${formatDistance(gps.distance)}${gps.override ? ' (override flagged)' : ''}`)
    }

    await supabase.from('shifts').update({ status: 'in_progress' }).eq('id', shiftId)

    setProcessing(false)
    setGpsStatus(null)
    setTimeout(() => setMessage(''), 5000)
    loadShift()
  }

  async function clockOut() {
    if (!confirm('Clock out and complete this shift?')) return

    const gps = await attemptGpsAction('clockout')
    if (!gps) return

    setProcessing(true)
    const now = new Date()
    const clockInTime = new Date(assignment.clock_in)
    const actualHours = ((now - clockInTime) / (1000 * 60 * 60)).toFixed(2)

    const { error } = await supabase
      .from('shift_assignments')
      .update({
        clock_out: now.toISOString(),
        actual_hours: parseFloat(actualHours),
        status: 'completed',
        clock_out_latitude: gps.latitude,
        clock_out_longitude: gps.longitude,
        clock_out_distance_meters: gps.distance,
        gps_override_clockout: gps.override,
        gps_override_reason: gps.overrideReason || assignment.gps_override_reason
      })
      .eq('id', assignment.id)

    if (error) {
      alert('Error: ' + error.message)
      setProcessing(false)
      return
    }

    await supabase.from('shifts').update({ status: 'completed' }).eq('id', shiftId)
    await supabase.rpc('update_nurse_reliability_score', { p_nurse_id: profile.id })

    setMessage(`✓ Shift completed! ${actualHours} hours worked. Please rate the facility below.`)
    setProcessing(false)
    setGpsStatus(null)
    setTimeout(() => setMessage(''), 5000)
    loadShift()
  }

  async function submitRating() {
    if (ratingValue === 0) { alert('Please select a star rating'); return }
    setProcessing(true)

    const isFacility = userType === 'facility'
    const updateData = isFacility
      ? { facility_rating: ratingValue, facility_feedback: ratingFeedback || null, ratings_submitted_facility: true }
      : { nurse_rating: ratingValue, nurse_feedback: ratingFeedback || null, ratings_submitted_nurse: true }

    const { error } = await supabase.from('shift_assignments').update(updateData).eq('id', assignment.id)
    if (error) { alert('Error: ' + error.message); setProcessing(false); return }

    if (isFacility && assignment.nurse_id) {
      await supabase.rpc('update_nurse_star_rating', { p_nurse_id: assignment.nurse_id })
    }

    setMessage('✓ Rating submitted!')
    setShowRatingModal(false)
    setRatingValue(0)
    setRatingFeedback('')
    setProcessing(false)
    setTimeout(() => setMessage(''), 4000)
    loadShift()
  }

  if (loading || loadingData) return <div className="dashboard-loading">Loading...</div>
  if (!profile || !shift) return <div className="dashboard-loading">Shift not found</div>

  const isNurse = userType === 'nurse'
  const isFacility = userType === 'facility'
  const isMyShift = isNurse && shift.assigned_nurse_id === profile.id
  const isMyFacilityShift = isFacility && shift.facility_id === profile.id

  if (!isMyShift && !isMyFacilityShift) {
    return <div className="dashboard"><div className="dashboard-loading">You don't have permission to view this shift.</div></div>
  }

  const hasClockedIn = assignment?.clock_in
  const hasClockedOut = assignment?.clock_out
  const isCompleted = assignment?.status === 'completed'
  const needsRating = isCompleted && (
    (isFacility && !assignment.ratings_submitted_facility) ||
    (isNurse && !assignment.ratings_submitted_nurse)
  )

  const homePath = isNurse ? '/nurse/dashboard' : '/facility/dashboard'
  const facilityHasCoords = !!shift.facilities?.latitude && !!shift.facilities?.longitude

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate(homePath)} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{isFacility ? profile.facility_name : `${profile.first_name} ${profile.last_name}`}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate(homePath)}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        {message && <div className="success-toast">{message}</div>}

        <div className="profile-header">
          <div>
            <h1>Shift Details</h1>
            <p className="dash-subtitle">{shift.facilities?.facility_name} · {shift.unit}</p>
          </div>
          <span className={`status-badge status-${shift.status}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>{shift.status}</span>
        </div>

        {/* GPS Warning if facility hasn't geocoded */}
        {isNurse && isMyShift && !facilityHasCoords && (shift.status === 'filled' || shift.status === 'in_progress') && (
          <div className="hardstop-warning">
            <ShieldAlert size={24} />
            <div>
              <strong>GPS Clock-In Unavailable</strong>
              <p>This facility has not yet verified their address. Clock-in requires GPS verification. Please contact the facility to update their address.</p>
            </div>
          </div>
        )}

        {gpsStatus && (
          <div className="gps-status">
            <Navigation size={20} className="gps-icon-spinning" />
            <span>{gpsStatus}</span>
          </div>
        )}

        {/* Action Card */}
        {isNurse && isMyShift && (
          <div className="action-card">
            {!hasClockedIn && (shift.status === 'filled' || shift.status === 'in_progress') && (
              <div className="action-section">
                <div>
                  <h2><ShieldCheck size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} /> Ready to start your shift?</h2>
                  <p>Clock in when you arrive at the facility. Your GPS location will be verified.</p>
                </div>
                <button
                  className="primary-btn large-btn"
                  onClick={clockIn}
                  disabled={processing || gettingLocation || !facilityHasCoords}
                >
                  <Play size={20} /> {gettingLocation ? 'Verifying GPS...' : 'Clock In'}
                </button>
              </div>
            )}

            {hasClockedIn && !hasClockedOut && (
              <div className="action-section">
                <div>
                  <h2>Shift in progress</h2>
                  <p>
                    Clocked in: {new Date(assignment.clock_in).toLocaleString()}<br/>
                    {assignment.clock_in_distance_meters !== null && (
                      <>Distance at clock-in: <strong>{formatDistance(assignment.clock_in_distance_meters)}</strong>{assignment.gps_override_clockin && <span style={{ color: '#92400E' }}> ⚠ Override</span>}</>
                    )}
                  </p>
                </div>
                <button
                  className="primary-btn large-btn"
                  onClick={clockOut}
                  disabled={processing || gettingLocation}
                >
                  <Square size={20} /> {gettingLocation ? 'Verifying GPS...' : 'Clock Out'}
                </button>
              </div>
            )}

            {hasClockedOut && (
              <div className="action-section completed">
                <CheckCircle2 size={28} style={{ color: '#15803D' }} />
                <div>
                  <h2 style={{ color: '#15803D' }}>Shift Completed</h2>
                  <p>
                    Clocked in: {new Date(assignment.clock_in).toLocaleString()}<br/>
                    Clocked out: {new Date(assignment.clock_out).toLocaleString()}<br/>
                    Total hours: <strong>{assignment.actual_hours}h</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GPS verification details (visible to both) */}
        {assignment && (assignment.clock_in_distance_meters !== null || assignment.clock_out_distance_meters !== null) && (
          <div className="profile-section">
            <h2><MapPin size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> GPS Verification</h2>
            <div className="shift-detail-grid">
              {assignment.clock_in_distance_meters !== null && (
                <div className="shift-detail-item">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Clock-In Distance</strong>
                    <p>{formatDistance(assignment.clock_in_distance_meters)}{assignment.gps_override_clockin && ' ⚠ Override'}</p>
                  </div>
                </div>
              )}
              {assignment.clock_out_distance_meters !== null && (
                <div className="shift-detail-item">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Clock-Out Distance</strong>
                    <p>{formatDistance(assignment.clock_out_distance_meters)}{assignment.gps_override_clockout && ' ⚠ Override'}</p>
                  </div>
                </div>
              )}
            </div>
            {assignment.gps_override_reason && (
              <div className="shift-notes" style={{ marginTop: '1rem' }}>
                <strong>Override Reason:</strong> {assignment.gps_override_reason}
              </div>
            )}
          </div>
        )}

        {needsRating && (
          <div className="rating-prompt">
            <Star size={24} />
            <div>
              <h3>Rate this {isFacility ? 'nurse' : 'facility'}</h3>
              <p>Your feedback helps build the Flexprn community.</p>
            </div>
            <button className="primary-btn" onClick={() => setShowRatingModal(true)}>Leave Rating</button>
          </div>
        )}

        {assignment && (assignment.facility_rating || assignment.nurse_rating) && (
          <div className="profile-section">
            <h2>Ratings & Feedback</h2>
            {assignment.facility_rating && (
              <div className="rating-display">
                <strong>Facility rated nurse:</strong>
                <div className="star-display">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={20} fill={n <= assignment.facility_rating ? '#F59E0B' : 'none'} color={n <= assignment.facility_rating ? '#F59E0B' : '#CBD5E1'} />
                  ))}
                  <span style={{ marginLeft: '0.5rem', color: '#1B3A6B', fontWeight: 700 }}>{assignment.facility_rating}/5</span>
                </div>
                {assignment.facility_feedback && <p className="feedback-text">"{assignment.facility_feedback}"</p>}
              </div>
            )}
            {assignment.nurse_rating && (
              <div className="rating-display" style={{ marginTop: '1.25rem' }}>
                <strong>Nurse rated facility:</strong>
                <div className="star-display">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={20} fill={n <= assignment.nurse_rating ? '#F59E0B' : 'none'} color={n <= assignment.nurse_rating ? '#F59E0B' : '#CBD5E1'} />
                  ))}
                  <span style={{ marginLeft: '0.5rem', color: '#1B3A6B', fontWeight: 700 }}>{assignment.nurse_rating}/5</span>
                </div>
                {assignment.nurse_feedback && <p className="feedback-text">"{assignment.nurse_feedback}"</p>}
              </div>
            )}
          </div>
        )}

        <div className="profile-section">
          <h2>Shift Information</h2>
          <div className="shift-detail-grid">
            <div className="shift-detail-item"><Calendar size={18} /><div><strong>Date</strong><p>{new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div></div>
            <div className="shift-detail-item"><Clock size={18} /><div><strong>Time</strong><p>{shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)} ({shift.scheduled_hours}h)</p></div></div>
            <div className="shift-detail-item"><Building2 size={18} /><div><strong>Unit / Specialty</strong><p>{shift.unit} · {shift.specialty || shift.shift_category}</p></div></div>
            <div className="shift-detail-item"><DollarSign size={18} /><div><strong>Pay Rate</strong><p>${shift.nurse_pay_rate}/hr · ≈ ${(shift.nurse_pay_rate * shift.scheduled_hours).toFixed(0)} total</p></div></div>
            <div className="shift-detail-item"><MapPin size={18} /><div><strong>Location</strong><p>{shift.facilities?.address}, {shift.facilities?.city}, {shift.facilities?.state}</p></div></div>
            <div className="shift-detail-item"><User size={18} /><div><strong>Role</strong><p>{shift.required_role}</p></div></div>
          </div>

          {shift.required_certifications?.length > 0 && (
            <div className="shift-requirements" style={{ marginTop: '1rem' }}>
              <strong><Award size={14} /> Required Certs:</strong>
              {shift.required_certifications.map(c => <span key={c} className="req-chip required">{c}</span>)}
            </div>
          )}
          {shift.unit_supervisor && <p style={{ marginTop: '1rem' }}><strong>Supervisor:</strong> {shift.unit_supervisor}</p>}
          {shift.parking_info && <p><strong>Parking:</strong> {shift.parking_info}</p>}
          {shift.dress_code && <p><strong>Dress Code:</strong> {shift.dress_code}</p>}
          {shift.notes && <div className="shift-notes" style={{ marginTop: '1rem' }}><strong>Notes:</strong> {shift.notes}</div>}
        </div>

        {isFacility && nurseInfo && (
          <div className="profile-section">
            <h2>Assigned Nurse</h2>
            <div className="nurse-detail-header" style={{ marginBottom: 0 }}>
              <div className="nurse-detail-avatar">{nurseInfo.first_name?.[0]}{nurseInfo.last_name?.[0]}</div>
              <div className="nurse-detail-info">
                <h1>{nurseInfo.first_name} {nurseInfo.last_name}</h1>
                <p className="nurse-detail-meta">{nurseInfo.license_type} · {nurseInfo.license_state} · {nurseInfo.years_experience} years</p>
                <p className="nurse-detail-meta">Reliability: {nurseInfo.reliability_score}% · Rating: {nurseInfo.star_rating || '—'}</p>
              </div>
              <button className="secondary-btn" onClick={() => navigate(`/facility/nurse/${nurseInfo.id}`)}>
                <FileText size={16} /> Full Profile
              </button>
            </div>
          </div>
        )}

        {showRatingModal && (
          <div className="modal-backdrop" onClick={() => setShowRatingModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h2><Star size={20} /> Rate this {isFacility ? 'nurse' : 'facility'}</h2></div>
              <p>How would you rate your experience?</p>
              <div className="star-picker">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" className="star-btn" onClick={() => setRatingValue(n)}>
                    <Star size={36} fill={n <= ratingValue ? '#F59E0B' : 'none'} color={n <= ratingValue ? '#F59E0B' : '#CBD5E1'} />
                  </button>
                ))}
              </div>
              <p style={{ textAlign: 'center', color: '#64748B', marginTop: '0.5rem' }}>
                {ratingValue === 0 ? 'Tap to rate' : ratingValue === 5 ? 'Excellent!' : ratingValue === 4 ? 'Great' : ratingValue === 3 ? 'Good' : ratingValue === 2 ? 'Below expectations' : 'Poor experience'}
              </p>
              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label>Feedback (optional)</label>
                <textarea value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} rows={4} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="primary-btn" onClick={submitRating} disabled={processing || ratingValue === 0}>
                  {processing ? 'Submitting...' : 'Submit Rating'}
                </button>
                <button className="secondary-btn" onClick={() => setShowRatingModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShiftDetailPage