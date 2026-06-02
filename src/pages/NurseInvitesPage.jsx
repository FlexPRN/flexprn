import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Mail, MapPin, Building2,
  CheckCircle2, X, Calendar
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function NurseInvitesPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [invites, setInvites] = useState([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [message, setMessage] = useState('')
  const [responding, setResponding] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (!loading && (!user || !profile)) navigate('/signin')
    if (profile) loadInvites()
  }, [user, profile, loading])

  async function loadInvites() {
    setLoadingInvites(true)

    // Step 1: get the invites (no join)
    const { data: invitesData, error: invitesError } = await supabase
      .from('recruitment_invites')
      .select('*')
      .eq('nurse_id', profile.id)

    if (invitesError) {
      console.error('Error loading invites:', invitesError)
      setInvites([])
      setLoadingInvites(false)
      return
    }

    if (!invitesData || invitesData.length === 0) {
      setInvites([])
      setLoadingInvites(false)
      return
    }

    // Step 2: get the facilities for each invite, in a single query
    const facilityIds = [...new Set(invitesData.map(i => i.facility_id))]
    const { data: facilitiesData } = await supabase
      .from('facilities')
      .select('id, facility_name, facility_type, city, state, address')
      .in('id', facilityIds)

    // Step 3: stitch them together client-side
    const facilityMap = {}
    ;(facilitiesData || []).forEach(f => { facilityMap[f.id] = f })

    const enriched = invitesData.map(inv => ({
      ...inv,
      facility: facilityMap[inv.facility_id] || null
    }))

    // Sort newest first — try created_at, fall back to id
    enriched.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return (b.id || 0) - (a.id || 0)
    })

    setInvites(enriched)
    setLoadingInvites(false)
  }

  async function respondToInvite(inviteId, accepted) {
    const invite = invites.find(i => i.id === inviteId)
    setResponding(inviteId)

    const { error } = await supabase
      .from('recruitment_invites')
      .update({
        status: accepted ? 'accepted' : 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', inviteId)

    if (error) {
      alert('Error: ' + error.message)
      setResponding(null)
      return
    }

    if (accepted) {
      // Use upsert so re-accepting an old invite doesn't fail with 409 conflict.
      // If a float_pool row with this nurse+facility already exists, update it to approved instead.
      const { error: poolError } = await supabase.from('float_pool').upsert(
        {
          nurse_id: profile.id,
          facility_id: invite.facility_id,
          status: 'approved',
          reviewed_at: new Date().toISOString()
        },
        { onConflict: 'nurse_id,facility_id' }
      )

      if (poolError) {
        console.error('Float pool upsert error (non-fatal):', poolError)
      }

      setMessage(`✓ You've joined ${invite.facility?.facility_name || 'the facility'}'s float pool! You can now see their open shifts.`)
    } else {
      setMessage('Invitation declined.')
    }

    setResponding(null)
    loadInvites()
    setTimeout(() => setMessage(''), 5000)
  }

  if (loading || loadingInvites) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  const pendingInvites = invites.filter(i => i.status === 'pending')
  const respondedInvites = invites.filter(i => i.status !== 'pending')
  const displayInvites = activeTab === 'pending' ? pendingInvites : respondedInvites

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
            <h1><Mail size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Invitations</h1>
            <p className="dash-subtitle">Facilities that have invited you to their float pool</p>
          </div>
        </div>

        {message && <div className="success-toast">{message}</div>}

        <div className="profile-tabs">
          <button
            className={activeTab === 'pending' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('pending')}
          >
            <Mail size={16} /> Pending ({pendingInvites.length})
          </button>
          <button
            className={activeTab === 'history' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('history')}
          >
            <Calendar size={16} /> History ({respondedInvites.length})
          </button>
        </div>

        <div className="profile-section">
          {displayInvites.length === 0 ? (
            <div className="empty-state">
              {activeTab === 'pending' ? (
                <>
                  <Mail size={32} style={{ color: '#94A3B8', marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 600 }}>No pending invitations right now.</p>
                  <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '0.5rem' }}>
                    When facilities invite you to their float pool, you'll see them here.
                  </p>
                </>
              ) : (
                <p>No past invitation activity yet.</p>
              )}
            </div>
          ) : (
            <div className="shift-list">
              {displayInvites.map(invite => (
                <div key={invite.id} className="shift-card-detailed">
                  <div className="shift-detail-info">
                    <div className="shift-detail-header">
                      <h3>{invite.facility?.facility_name || 'Facility'}</h3>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {invite.facility?.facility_type && (
                          <span className="role-badge">{invite.facility.facility_type}</span>
                        )}
                        {invite.status !== 'pending' && (
                          <span className={`status-badge status-${invite.status}`}>
                            {invite.status}
                          </span>
                        )}
                      </div>
                    </div>
                    {invite.facility && (
                      <p className="shift-detail-meta">
                        <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        {invite.facility.address && `${invite.facility.address}, `}
                        {invite.facility.city}, {invite.facility.state}
                      </p>
                    )}
                    {invite.message && (
                      <div className="shift-notes" style={{ marginTop: '1rem' }}>
                        <strong>Message from facility:</strong>
                        <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>"{invite.message}"</p>
                      </div>
                    )}
                    {invite.created_at && (
                      <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.75rem' }}>
                        Received: {new Date(invite.created_at).toLocaleDateString()}
                        {invite.responded_at && ` · Responded: ${new Date(invite.responded_at).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>

                  {invite.status === 'pending' && (
                    <div className="shift-accept-action" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        className="primary-btn"
                        onClick={() => respondToInvite(invite.id, true)}
                        disabled={responding === invite.id}
                      >
                        <CheckCircle2 size={16} /> {responding === invite.id ? 'Joining...' : 'Accept & Join Pool'}
                      </button>
                      <button
                        className="secondary-btn"
                        onClick={() => respondToInvite(invite.id, false)}
                        disabled={responding === invite.id}
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NurseInvitesPage