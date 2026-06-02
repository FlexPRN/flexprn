import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, ArrowLeft, User, Award, FileText, Check, AlertTriangle,
  Star, TrendingUp, Clock, Phone, Mail, Calendar, Shield
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'

function NursePoolDetailPage() {
  const navigate = useNavigate()
  const { nurseId } = useParams()
  const { user, profile, loading, signOut } = useAuth()
  const [nurse, setNurse] = useState(null)
  const [certifications, setCertifications] = useState([])
  const [documents, setDocuments] = useState([])
  const [poolStatus, setPoolStatus] = useState(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/signin')
    }
    if (profile && nurseId) {
      loadNurseData()
    }
  }, [user, profile, loading, nurseId])

  async function loadNurseData() {
    setLoadingData(true)

    // Load nurse profile
    const { data: nurseData } = await supabase
      .from('nurses')
      .select('*')
      .eq('id', nurseId)
      .single()

    setNurse(nurseData)

    // Load pool relationship
    const { data: poolData } = await supabase
      .from('float_pool')
      .select('*')
      .eq('nurse_id', nurseId)
      .eq('facility_id', profile.id)
      .maybeSingle()

    setPoolStatus(poolData)

    // Load certifications
    const { data: certs } = await supabase
      .from('nurse_certifications')
      .select('*')
      .eq('nurse_id', nurseId)
      .order('expiration_date', { ascending: true })

    setCertifications(certs || [])

    // Load documents
    const { data: docs } = await supabase
      .from('nurse_documents')
      .select('*')
      .eq('nurse_id', nurseId)
      .order('uploaded_at', { ascending: false })

    setDocuments(docs || [])

    setLoadingData(false)
  }

  async function viewDocument(doc) {
    const { data } = await supabase.storage
      .from('nurse-documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function updatePoolStatus(newStatus) {
    if (newStatus === 'dnr' && !confirm('Mark this nurse as Do Not Return? They will be removed from your float pool privately.')) return
    if (newStatus === 'denied' && !confirm('Deny this nurse?')) return

    const { error } = await supabase
      .from('float_pool')
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq('id', poolStatus.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Status updated to ${newStatus}`)
      loadNurseData()
    }
  }

  function getCertStatus(expirationDate) {
    const today = new Date()
    const exp = new Date(expirationDate)
    const daysUntilExpiry = Math.floor((exp - today) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return { label: 'EXPIRED', class: 'cert-expired' }
    if (daysUntilExpiry < 30) return { label: `${daysUntilExpiry} days left`, class: 'cert-warning' }
    if (daysUntilExpiry < 90) return { label: `${daysUntilExpiry} days left`, class: 'cert-soon' }
    return { label: 'Active', class: 'cert-active' }
  }

  const DOC_TYPE_LABELS = {
    resume: 'Resume / CV',
    recommendation: 'Letter of Recommendation',
    cert_card: 'Certification Card',
    license_copy: 'License Copy',
    id: 'Government ID',
    drug_screen: 'Drug Screen Results',
    tb_test: 'TB Test',
    vaccinations: 'Vaccination Records',
    other: 'Other'
  }

  if (loading || loadingData) return <div className="dashboard-loading">Loading...</div>
  if (!profile || !nurse) return null

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/facility/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{profile.facility_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate('/facility/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="nurse-detail-header">
          <div className="nurse-detail-avatar">
            {nurse.first_name?.[0]}{nurse.last_name?.[0]}
          </div>
          <div className="nurse-detail-info">
            <h1>{nurse.first_name} {nurse.last_name}</h1>
            <p className="nurse-detail-meta">
              {nurse.license_type} · {nurse.license_state} · License #{nurse.license_number}
            </p>
            <p className="nurse-detail-meta">
              {nurse.years_experience} years experience
            </p>
            {poolStatus && (
              <span className={`status-badge status-${poolStatus.status}`} style={{ marginTop: '0.5rem' }}>
                {poolStatus.status}
              </span>
            )}
          </div>
          {poolStatus && poolStatus.status === 'approved' && (
            <div className="nurse-detail-actions">
              <button className="deny-btn" onClick={() => updatePoolStatus('dnr')}>
                Mark Do Not Return
              </button>
            </div>
          )}
          {poolStatus && poolStatus.status === 'pending' && (
            <div className="nurse-detail-actions">
              <button className="approve-btn" onClick={() => updatePoolStatus('approved')}>
                <Check size={16} /> Approve
              </button>
              <button className="deny-btn" onClick={() => updatePoolStatus('denied')}>
                Deny
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="stat-cards" style={{ marginBottom: '2rem' }}>
          <div className="dash-stat">
            <TrendingUp size={24} />
            <div className="dash-stat-value">{nurse.reliability_score}%</div>
            <div className="dash-stat-label">Reliability Score</div>
          </div>
          <div className="dash-stat">
            <Star size={24} />
            <div className="dash-stat-value">{nurse.star_rating || '—'}</div>
            <div className="dash-stat-label">Star Rating</div>
          </div>
          <div className="dash-stat">
            <Clock size={24} />
            <div className="dash-stat-value">{nurse.total_shifts_worked}</div>
            <div className="dash-stat-label">Shifts Completed</div>
          </div>
          <div className="dash-stat">
            <Check size={24} />
            <div className="dash-stat-value">{certifications.length}</div>
            <div className="dash-stat-label">Active Credentials</div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="profile-section">
          <h2>Contact Information</h2>
          <div className="contact-grid">
            <div className="contact-item">
              <Mail size={18} />
              <span>{nurse.email}</span>
            </div>
            {nurse.phone && (
              <div className="contact-item">
                <Phone size={18} />
                <span>{nurse.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {nurse.bio && (
          <div className="profile-section">
            <h2>About</h2>
            <p style={{ color: '#475569', lineHeight: '1.6' }}>{nurse.bio}</p>
          </div>
        )}

        {/* Specialties */}
        {nurse.specialties && nurse.specialties.length > 0 && (
          <div className="profile-section">
            <h2>Specialties</h2>
            <div className="specialty-grid">
              {nurse.specialties.map(spec => (
                <span key={spec} className="specialty-chip selected">
                  <Check size={14} />
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        <div className="profile-section">
          <h2>Certifications ({certifications.length})</h2>
          {certifications.length === 0 ? (
            <p className="empty-state">No certifications on file</p>
          ) : (
            <div className="cert-list">
              {certifications.map(cert => {
                const status = getCertStatus(cert.expiration_date)
                return (
                  <div key={cert.id} className="cert-card">
                    <div className="cert-info">
                      <h3>{cert.cert_type}</h3>
                      <p>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</p>
                      {cert.issuing_organization && <p>{cert.issuing_organization}</p>}
                    </div>
                    <span className={`cert-status ${status.class}`}>
                      {status.class === 'cert-expired' || status.class === 'cert-warning' ? <AlertTriangle size={14} /> : <Check size={14} />}
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="profile-section">
          <h2>Documents ({documents.length})</h2>
          {documents.length === 0 ? (
            <p className="empty-state">No documents on file</p>
          ) : (
            <div className="doc-list">
              {documents.map(doc => (
                <div key={doc.id} className="doc-card">
                  <FileText size={24} className="doc-icon" />
                  <div className="doc-info">
                    <h3>{doc.document_name}</h3>
                    <p>{DOC_TYPE_LABELS[doc.document_type] || doc.document_type} · {(doc.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button className="secondary-btn small-btn" onClick={() => viewDocument(doc)}>View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NursePoolDetailPage