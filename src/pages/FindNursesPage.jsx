import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Search, Filter, Eye, Send, Star,
  TrendingUp, Award, MapPin, Check, X, UserPlus
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

const SPECIALTIES = [
  'ICU', 'Emergency/ER', 'Med-Surg', 'Telemetry', 'Step-Down', 'PCU',
  'OR/Surgery', 'PACU', 'L&D', 'Postpartum', 'NICU', 'Peds', 'PICU',
  'Oncology', 'Hospice', 'Cardiac/CVICU', 'Neuro/NSICU', 'Trauma',
  'CRRT', 'ECMO', 'Impella', 'Charge Nurse', 'Psych/Behavioral Health',
  'Rehab', 'Long-Term Care', 'Dialysis', 'Cath Lab'
]

const CERTS = ['BLS', 'ACLS', 'PALS', 'NRP', 'TNCC', 'ENPC', 'NIHSS', 'CCRN', 'CEN', 'CPN', 'RNC-OB']

function FindNursesPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [allNurses, setAllNurses] = useState([])
  const [nurseCerts, setNurseCerts] = useState({})
  const [myPool, setMyPool] = useState([])
  const [sentInvites, setSentInvites] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Filters
  const [searchName, setSearchName] = useState('')
  const [filterLicenseType, setFilterLicenseType] = useState('all')
  const [filterState, setFilterState] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterMinExperience, setFilterMinExperience] = useState('all')
  const [filterMinReliability, setFilterMinReliability] = useState(0)
  const [filterMinRating, setFilterMinRating] = useState(0)
  const [filterSpecialties, setFilterSpecialties] = useState([])
  const [filterCerts, setFilterCerts] = useState([])

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/signin')
    }
    if (profile) {
      loadData()
    }
  }, [user, profile, loading])

  async function loadData() {
    const { data: nurses } = await supabase.from('nurses').select('*')
    setAllNurses(nurses || [])

    if (nurses && nurses.length > 0) {
      const nurseIds = nurses.map(n => n.id)
      const { data: certs } = await supabase
        .from('nurse_certifications')
        .select('*')
        .in('nurse_id', nurseIds)

      const certsByNurse = {}
      ;(certs || []).forEach(c => {
        if (!certsByNurse[c.nurse_id]) certsByNurse[c.nurse_id] = []
        certsByNurse[c.nurse_id].push(c)
      })
      setNurseCerts(certsByNurse)
    }

    const { data: pool } = await supabase
      .from('float_pool')
      .select('nurse_id, status')
      .eq('facility_id', profile.id)
    setMyPool(pool || [])

    const { data: invites } = await supabase
      .from('recruitment_invites')
      .select('*')
      .eq('facility_id', profile.id)
    setSentInvites(invites || [])
  }

  function toggleFilter(field, value, setter, current) {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value))
    } else {
      setter([...current, value])
    }
  }

  function getYearsAsNumber(range) {
    if (!range) return 0
    if (range === '0-1') return 0
    if (range === '1-3') return 1
    if (range === '3-5') return 3
    if (range === '5-10') return 5
    if (range === '10+') return 10
    return 0
  }

  function getMinYearsFilter(filterValue) {
    if (filterValue === 'all') return 0
    if (filterValue === '1+') return 1
    if (filterValue === '3+') return 3
    if (filterValue === '5+') return 5
    if (filterValue === '10+') return 10
    return 0
  }

  const filteredNurses = allNurses.filter(nurse => {
    if (searchName) {
      const fullName = `${nurse.first_name} ${nurse.last_name}`.toLowerCase()
      if (!fullName.includes(searchName.toLowerCase())) return false
    }
    if (filterLicenseType !== 'all' && nurse.license_type !== filterLicenseType) return false
    if (filterState && nurse.license_state?.toLowerCase() !== filterState.toLowerCase()) return false
    if (filterCity && !nurse.city?.toLowerCase().includes(filterCity.toLowerCase())) return false
    if (filterMinExperience !== 'all') {
      const min = getMinYearsFilter(filterMinExperience)
      if (getYearsAsNumber(nurse.years_experience) < min) return false
    }
    if (filterMinReliability > 0 && (nurse.reliability_score || 0) < filterMinReliability) return false
    if (filterMinRating > 0 && (nurse.star_rating || 0) < filterMinRating) return false
    if (filterSpecialties.length > 0) {
      const nurseSpecs = nurse.specialties || []
      if (!filterSpecialties.every(s => nurseSpecs.includes(s))) return false
    }
    if (filterCerts.length > 0) {
      const certs = nurseCerts[nurse.id] || []
      const today = new Date()
      const activeCertTypes = certs
        .filter(c => new Date(c.expiration_date) > today)
        .map(c => c.cert_type)
      if (!filterCerts.every(c => activeCertTypes.includes(c))) return false
    }
    return true
  })

  function getNurseStatus(nurseId) {
    const poolEntry = myPool.find(p => p.nurse_id === nurseId)
    if (poolEntry) return { type: 'pool', status: poolEntry.status }

    const invite = sentInvites.find(i => i.nurse_id === nurseId)
    if (invite) return { type: 'invite', status: invite.status }

    return null
  }

  async function sendInvite(nurseId) {
    setSending(true)
    const targetNurse = allNurses.find(n => n.id === nurseId)

    const { error } = await supabase.from('recruitment_invites').insert({
      facility_id: profile.id,
      nurse_id: nurseId,
      message: inviteMessage || null,
      status: 'pending'
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      // Send email notification to nurse
      if (targetNurse?.email) {
        const { sendEmail, invitationReceivedEmail } = await import('../utils/email')
        const emailContent = invitationReceivedEmail(targetNurse.first_name, profile.facility_name, inviteMessage)
        sendEmail(targetNurse.email, emailContent.subject, emailContent.html)
      }

      alert('✓ Invitation sent!')
      setShowInviteModal(null)
      setInviteMessage('')
      loadData()
    }
    setSending(false)
  }

  function clearFilters() {
    setSearchName('')
    setFilterLicenseType('all')
    setFilterState('')
    setFilterCity('')
    setFilterMinExperience('all')
    setFilterMinReliability(0)
    setFilterMinRating(0)
    setFilterSpecialties([])
    setFilterCerts([])
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/facility/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{profile.facility_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container" style={{ maxWidth: '1200px' }}>
        <button className="back-btn" onClick={() => navigate('/facility/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="profile-header">
          <div>
            <h1>Find Staff</h1>
            <p className="dash-subtitle">Search the platform and recruit nurses to your float pool</p>
          </div>
        </div>

        <div className="find-nurses-layout">
          <aside className="filter-sidebar">
            <div className="filter-header">
              <h3><Filter size={18} /> Filters</h3>
              <button className="clear-btn" onClick={clearFilters}>Clear All</button>
            </div>

            <div className="filter-group">
              <label>Search by Name</label>
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="First or last name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              </div>
            </div>

            <div className="filter-group">
              <label>License Type</label>
              <select value={filterLicenseType} onChange={(e) => setFilterLicenseType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="RN">RN</option>
                <option value="LPN">LPN</option>
                <option value="CNA">CNA</option>
              </select>
            </div>

            <div className="filter-group">
              <label>License State</label>
              <input type="text" placeholder="e.g., KY" value={filterState} onChange={(e) => setFilterState(e.target.value)} maxLength={2} />
            </div>

            <div className="filter-group">
              <label>City</label>
              <input type="text" placeholder="e.g., Falmouth" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} />
            </div>

            <div className="filter-group">
              <label>Min Years Experience</label>
              <select value={filterMinExperience} onChange={(e) => setFilterMinExperience(e.target.value)}>
                <option value="all">Any Experience</option>
                <option value="1+">1+ years</option>
                <option value="3+">3+ years</option>
                <option value="5+">5+ years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Min Reliability: {filterMinReliability}%</label>
              <input type="range" min="0" max="100" step="5" value={filterMinReliability} onChange={(e) => setFilterMinReliability(parseInt(e.target.value))} />
            </div>

            <div className="filter-group">
              <label>Min Rating: {filterMinRating > 0 ? `${filterMinRating}⭐` : 'Any'}</label>
              <input type="range" min="0" max="5" step="0.5" value={filterMinRating} onChange={(e) => setFilterMinRating(parseFloat(e.target.value))} />
            </div>

            <div className="filter-group">
              <label>Required Specialties</label>
              <p className="filter-hint">Nurse must have ALL selected</p>
              <div className="filter-chips">
                {SPECIALTIES.map(spec => (
                  <button key={spec} type="button" className={filterSpecialties.includes(spec) ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleFilter('specialties', spec, setFilterSpecialties, filterSpecialties)}>
                    {filterSpecialties.includes(spec) && <Check size={12} />}{spec}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Required Certifications</label>
              <p className="filter-hint">Active (non-expired) only</p>
              <div className="filter-chips">
                {CERTS.map(cert => (
                  <button key={cert} type="button" className={filterCerts.includes(cert) ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleFilter('certs', cert, setFilterCerts, filterCerts)}>
                    {filterCerts.includes(cert) && <Check size={12} />}{cert}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="results-main">
            <div className="results-header">
              <h2>{filteredNurses.length} nurse{filteredNurses.length !== 1 ? 's' : ''} found</h2>
            </div>

            {filteredNurses.length === 0 ? (
              <p className="empty-state">No nurses match your filters. Try broadening your search.</p>
            ) : (
              <div className="nurse-results">
                {filteredNurses.map(nurse => {
                  const status = getNurseStatus(nurse.id)
                  const certs = nurseCerts[nurse.id] || []
                  const activeCerts = certs.filter(c => new Date(c.expiration_date) > new Date())

                  return (
                    <div key={nurse.id} className="nurse-result-card">
                      <div className="nurse-result-avatar">
                        {nurse.first_name?.[0]}{nurse.last_name?.[0]}
                      </div>
                      <div className="nurse-result-info">
                        <div className="nurse-result-header">
                          <h3>{nurse.first_name} {nurse.last_name}</h3>
                          <span className="role-badge">{nurse.license_type}</span>
                        </div>
                        <p className="nurse-result-meta">
                          {nurse.license_state} · {nurse.years_experience} years · {nurse.city || 'Location not set'}
                        </p>
                        <div className="nurse-result-stats">
                          <span><TrendingUp size={14} /> {nurse.reliability_score}%</span>
                          <span><Star size={14} /> {nurse.star_rating || '—'}</span>
                          <span><Award size={14} /> {activeCerts.length} certs</span>
                        </div>
                        {nurse.specialties && nurse.specialties.length > 0 && (
                          <div className="nurse-result-specs">
                            {nurse.specialties.slice(0, 5).map(spec => (
                              <span key={spec} className="mini-chip">{spec}</span>
                            ))}
                            {nurse.specialties.length > 5 && (
                              <span className="mini-chip">+{nurse.specialties.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="nurse-result-actions">
                        <button className="secondary-btn small-btn" onClick={() => navigate(`/facility/nurse/${nurse.id}`)}>
                          <Eye size={16} /> View
                        </button>
                        {status ? (
                          <span className={`status-badge status-${status.status}`}>
                            {status.type === 'pool' ? status.status : `Invite ${status.status}`}
                          </span>
                        ) : (
                          <button className="primary-btn small-btn" onClick={() => setShowInviteModal(nurse)}>
                            <Send size={16} /> Invite
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>

        {showInviteModal && (
          <div className="modal-backdrop" onClick={() => setShowInviteModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><UserPlus size={20} /> Invite to Float Pool</h2>
                <button className="icon-btn" onClick={() => setShowInviteModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <p>
                Send a recruitment invite to <strong>{showInviteModal.first_name} {showInviteModal.last_name}</strong> ({showInviteModal.license_type}).
                They'll get an email and can accept to join your float pool directly — skipping the application process.
              </p>
              <div className="form-field">
                <label>Personal Message (optional)</label>
                <textarea
                  placeholder={`We saw your profile and would love to have you join our float pool at ${profile.facility_name}. Our team specializes in...`}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={5}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="primary-btn" onClick={() => sendInvite(showInviteModal.id)} disabled={sending}>
                  <Send size={18} /> {sending ? 'Sending...' : 'Send Invitation'}
                </button>
                <button className="secondary-btn" onClick={() => setShowInviteModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FindNursesPage