import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, User, Award, FileText, Upload, Trash2, Check,
  AlertTriangle, ArrowLeft, Save, Plus, CreditCard, AlertCircle
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import { SPECIALTIES, CERTS } from '../constants/specialties'

const DOC_TYPES = [
  { value: 'resume', label: 'Resume / CV' },
  { value: 'recommendation', label: 'Letter of Recommendation' },
  { value: 'cert_card', label: 'Certification Card' },
  { value: 'license_copy', label: 'License Copy' },
  { value: 'id', label: 'Government ID' },
  { value: 'drug_screen', label: 'Drug Screen Results' },
  { value: 'tb_test', label: 'TB Test' },
  { value: 'vaccinations', label: 'Vaccination Records' },
  { value: 'other', label: 'Other' }
]

function NurseProfilePage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone: '', bio: '', years_experience: '', city: '', state: ''
  })
  const [specialties, setSpecialties] = useState([])
  const [certifications, setCertifications] = useState([])
  const [documents, setDocuments] = useState([])
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [showCertForm, setShowCertForm] = useState(false)
  const [newCert, setNewCert] = useState({
    cert_type: 'BLS', cert_number: '', issued_date: '', expiration_date: '', issuing_organization: ''
  })
  const [uploadType, setUploadType] = useState('resume')
  const [uploading, setUploading] = useState(false)

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    account_holder_name: '',
    account_type: 'checking',
    routing_number: '',
    account_number: '',
    bank_name: ''
  })

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/signin')
    }
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        years_experience: profile.years_experience || '',
        city: profile.city || '',
        state: profile.state || ''
      })
      setSpecialties(profile.specialties || [])
      loadCertifications()
      loadDocuments()
      loadPaymentInfo()
    }
  }, [user, profile, loading])

  async function loadCertifications() {
    const { data } = await supabase.from('nurse_certifications').select('*').eq('nurse_id', profile.id).order('expiration_date', { ascending: true })
    setCertifications(data || [])
  }

  async function loadDocuments() {
    const { data } = await supabase.from('nurse_documents').select('*').eq('nurse_id', profile.id).order('uploaded_at', { ascending: false })
    setDocuments(data || [])
  }

  async function loadPaymentInfo() {
    const { data } = await supabase.from('nurse_payment_info').select('*').eq('nurse_id', profile.id).maybeSingle()
    setPaymentInfo(data)
  }

  async function saveBasicInfo() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('nurses').update({
      ...formData,
      updated_at: new Date().toISOString()
    }).eq('id', profile.id)

    if (error) setMessage('Error: ' + error.message)
    else setMessage('✓ Saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function saveSpecialties() {
    setSaving(true)
    const { error } = await supabase.from('nurses').update({ specialties, updated_at: new Date().toISOString() }).eq('id', profile.id)
    if (error) setMessage('Error: ' + error.message)
    else setMessage('✓ Specialties saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  function toggleSpecialty(spec) {
    if (specialties.includes(spec)) setSpecialties(specialties.filter(s => s !== spec))
    else setSpecialties([...specialties, spec])
  }

  async function addCertification(e) {
    e.preventDefault()
    const certData = {
      nurse_id: profile.id,
      cert_type: newCert.cert_type,
      cert_number: newCert.cert_number || null,
      issued_date: newCert.issued_date || null,
      expiration_date: newCert.expiration_date,
      issuing_organization: newCert.issuing_organization || null
    }
    const { error } = await supabase.from('nurse_certifications').insert(certData)
    if (error) alert('Error: ' + error.message)
    else {
      setShowCertForm(false)
      setNewCert({ cert_type: 'BLS', cert_number: '', issued_date: '', expiration_date: '', issuing_organization: '' })
      loadCertifications()
    }
  }

  async function deleteCertification(id) {
    if (!confirm('Delete this certification?')) return
    await supabase.from('nurse_certifications').delete().eq('id', id)
    loadCertifications()
  }

  async function uploadDocument(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return }
    setUploading(true)
    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('nurse-documents').upload(fileName, file)
    if (uploadError) { alert('Upload error: ' + uploadError.message); setUploading(false); return }
    const { error: dbError } = await supabase.from('nurse_documents').insert({
      nurse_id: profile.id, document_type: uploadType, document_name: file.name, file_path: fileName, file_size: file.size
    })
    if (dbError) alert('DB error: ' + dbError.message)
    else { setMessage('✓ Uploaded!'); loadDocuments() }
    setUploading(false)
    setTimeout(() => setMessage(''), 3000)
    e.target.value = ''
  }

  async function deleteDocument(doc) {
    if (!confirm('Delete this document?')) return
    await supabase.storage.from('nurse-documents').remove([doc.file_path])
    await supabase.from('nurse_documents').delete().eq('id', doc.id)
    loadDocuments()
  }

  async function downloadDocument(doc) {
    const { data } = await supabase.storage.from('nurse-documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function savePaymentInfo(e) {
    e.preventDefault()
    if (!paymentForm.routing_number || paymentForm.routing_number.length !== 9) {
      alert('Routing number must be 9 digits')
      return
    }
    if (!paymentForm.account_number || paymentForm.account_number.length < 4) {
      alert('Please enter a valid account number')
      return
    }

    setSaving(true)
    const data = {
      nurse_id: profile.id,
      account_holder_name: paymentForm.account_holder_name,
      account_type: paymentForm.account_type,
      routing_number_last4: paymentForm.routing_number.slice(-4),
      account_number_last4: paymentForm.account_number.slice(-4),
      bank_name: paymentForm.bank_name,
      setup_complete: true,
      updated_at: new Date().toISOString()
    }

    const { error } = paymentInfo
      ? await supabase.from('nurse_payment_info').update(data).eq('nurse_id', profile.id)
      : await supabase.from('nurse_payment_info').insert(data)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      await supabase.from('nurses').update({ payment_setup: true }).eq('id', profile.id)
      setMessage('✓ Payment info saved!')
      setPaymentForm({ account_holder_name: '', account_type: 'checking', routing_number: '', account_number: '', bank_name: '' })
      loadPaymentInfo()
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  function getCertStatus(expirationDate) {
    const today = new Date()
    const exp = new Date(expirationDate)
    const days = Math.floor((exp - today) / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: 'EXPIRED', class: 'cert-expired' }
    if (days < 30) return { label: `${days} days left`, class: 'cert-warning' }
    if (days < 90) return { label: `${days} days left`, class: 'cert-soon' }
    return { label: 'Active', class: 'cert-active' }
  }

  function completionPercent() {
    let score = 0
    if (profile?.first_name && profile?.last_name) score += 10
    if (profile?.phone) score += 10
    if (profile?.bio) score += 10
    if (profile?.city && profile?.state) score += 10
    if (specialties.length > 0) score += 15
    if (certifications.length > 0) score += 15
    if (documents.length >= 2) score += 15
    if (paymentInfo?.setup_complete) score += 15
    return score
  }

  const profileComplete = completionPercent() >= 80

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
            <h1>My Profile</h1>
            <p className="dash-subtitle">Build out your profile to get matched to more shifts</p>
          </div>
          <div className="completion-widget">
            <div className="completion-bar-bg">
              <div className="completion-bar-fill" style={{ width: `${completionPercent()}%` }}></div>
            </div>
            <span>{completionPercent()}% complete</span>
          </div>
        </div>

        {!profileComplete && (
          <div className="hardstop-warning">
            <AlertCircle size={24} />
            <div>
              <strong>Profile Incomplete</strong>
              <p>You must complete your profile to 80% before you can apply to shifts. Currently {completionPercent()}%.</p>
            </div>
          </div>
        )}

        {message && <div className={message.includes('Error') ? 'error-message' : 'success-toast'}>{message}</div>}

        <div className="profile-tabs">
          <button className={activeTab === 'basic' ? 'tab active' : 'tab'} onClick={() => setActiveTab('basic')}><User size={16} /> Basic</button>
          <button className={activeTab === 'specialties' ? 'tab active' : 'tab'} onClick={() => setActiveTab('specialties')}><Award size={16} /> Specialties</button>
          <button className={activeTab === 'certs' ? 'tab active' : 'tab'} onClick={() => setActiveTab('certs')}><Check size={16} /> Certifications</button>
          <button className={activeTab === 'documents' ? 'tab active' : 'tab'} onClick={() => setActiveTab('documents')}><FileText size={16} /> Documents</button>
          <button className={activeTab === 'payment' ? 'tab active' : 'tab'} onClick={() => setActiveTab('payment')}><CreditCard size={16} /> Payment</button>
        </div>

        {activeTab === 'basic' && (
          <div className="profile-section">
            <h2>Basic Information</h2>
            <div className="form-row">
              <div className="form-field"><label>First Name</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} /></div>
              <div className="form-field"><label>Last Name</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} /></div>
            </div>
            <div className="form-field"><label>Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="form-row">
              <div className="form-field"><label>City</label><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} /></div>
              <div className="form-field"><label>State</label><input type="text" placeholder="KY" maxLength={2} value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} /></div>
            </div>
            <div className="form-field">
              <label>Years of Experience</label>
              <select value={formData.years_experience} onChange={(e) => setFormData({...formData, years_experience: e.target.value})}>
                <option value="">Select range</option><option value="0-1">Less than 1 year</option>
                <option value="1-3">1-3 years</option><option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option><option value="10+">10+ years</option>
              </select>
            </div>
            <div className="form-field"><label>Bio</label><textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} rows="5" placeholder="Tell facilities about your background..." /></div>
            <button className="primary-btn" onClick={saveBasicInfo} disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save Basic Info'}</button>
          </div>
        )}

        {activeTab === 'specialties' && (
          <div className="profile-section">
            <h2>Specialty Experience</h2>
            <p className="section-help">Select all that apply</p>
            <div className="specialty-grid">
              {SPECIALTIES.map(spec => (
                <button key={spec} type="button" className={specialties.includes(spec) ? 'specialty-chip selected' : 'specialty-chip'} onClick={() => toggleSpecialty(spec)}>
                  {specialties.includes(spec) && <Check size={14} />}{spec}
                </button>
              ))}
            </div>
            <button className="primary-btn" onClick={saveSpecialties} disabled={saving} style={{ marginTop: '1.5rem' }}><Save size={18} /> {saving ? 'Saving...' : 'Save'}</button>
          </div>
        )}

        {activeTab === 'certs' && (
          <div className="profile-section">
            <div className="section-head">
              <div><h2>Certifications</h2><p className="section-help">Track credentials and expirations</p></div>
              <button className="primary-btn" onClick={() => setShowCertForm(!showCertForm)}><Plus size={18} /> Add</button>
            </div>
            {showCertForm && (
              <form className="inline-form" onSubmit={addCertification}>
                <div className="form-row">
                  <div className="form-field"><label>Type</label><select value={newCert.cert_type} onChange={(e) => setNewCert({...newCert, cert_type: e.target.value})}>{CERTS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div className="form-field"><label>Cert # (optional)</label><input type="text" value={newCert.cert_number} onChange={(e) => setNewCert({...newCert, cert_number: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Issued Date</label><input type="date" value={newCert.issued_date} onChange={(e) => setNewCert({...newCert, issued_date: e.target.value})} /></div>
                  <div className="form-field"><label>Expiration *</label><input type="date" value={newCert.expiration_date} onChange={(e) => setNewCert({...newCert, expiration_date: e.target.value})} required /></div>
                </div>
                <div className="form-field"><label>Issuing Organization</label><input type="text" value={newCert.issuing_organization} onChange={(e) => setNewCert({...newCert, issuing_organization: e.target.value})} /></div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="primary-btn">Save</button>
                  <button type="button" className="secondary-btn" onClick={() => setShowCertForm(false)}>Cancel</button>
                </div>
              </form>
            )}
            {certifications.length === 0 ? <p className="empty-state">No certifications added.</p> : (
              <div className="cert-list">
                {certifications.map(cert => {
                  const s = getCertStatus(cert.expiration_date)
                  return (
                    <div key={cert.id} className="cert-card">
                      <div className="cert-info">
                        <h3>{cert.cert_type}</h3>
                        <p>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</p>
                        {cert.issuing_organization && <p>{cert.issuing_organization}</p>}
                      </div>
                      <div className="cert-actions">
                        <span className={`cert-status ${s.class}`}>
                          {s.class === 'cert-expired' || s.class === 'cert-warning' ? <AlertTriangle size={14} /> : <Check size={14} />}{s.label}
                        </span>
                        <button className="icon-btn" onClick={() => deleteCertification(cert.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="profile-section">
            <h2>Document Vault</h2>
            <p className="section-help">Upload resume, certs, ID, drug screens, TB tests</p>
            <div className="upload-area">
              <div className="upload-row">
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <label className="primary-btn upload-btn">
                  <Upload size={18} /> {uploading ? 'Uploading...' : 'Choose File'}
                  <input type="file" onChange={uploadDocument} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </label>
              </div>
              <p className="upload-hint">Max 10MB. PDF, Word, or images.</p>
            </div>
            {documents.length === 0 ? <p className="empty-state">No documents uploaded.</p> : (
              <div className="doc-list">
                {documents.map(doc => (
                  <div key={doc.id} className="doc-card">
                    <FileText size={24} className="doc-icon" />
                    <div className="doc-info">
                      <h3>{doc.document_name}</h3>
                      <p>{DOC_TYPES.find(d => d.value === doc.document_type)?.label} · {(doc.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="doc-actions">
                      <button className="secondary-btn small-btn" onClick={() => downloadDocument(doc)}>View</button>
                      <button className="icon-btn" onClick={() => deleteDocument(doc)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="profile-section">
            <h2>Payment Information</h2>
            <p className="section-help">Set up direct deposit for shift payments. Information is encrypted and only last 4 digits are stored.</p>

            {paymentInfo?.setup_complete ? (
              <div className="payment-display">
                <div className="payment-display-icon">
                  <CreditCard size={32} />
                </div>
                <div>
                  <strong>Direct Deposit Active</strong>
                  <p>{paymentInfo.bank_name} · {paymentInfo.account_type}</p>
                  <p>Account ending in •••• {paymentInfo.account_number_last4}</p>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                    Updated: {new Date(paymentInfo.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="secondary-btn" onClick={() => setPaymentInfo(null)}>Update</button>
              </div>
            ) : (
              <form className="signup-form" onSubmit={savePaymentInfo}>
                <div className="form-field">
                  <label>Account Holder Name (as it appears on account)</label>
                  <input type="text" value={paymentForm.account_holder_name} onChange={(e) => setPaymentForm({...paymentForm, account_holder_name: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Bank Name</label>
                  <input type="text" value={paymentForm.bank_name} onChange={(e) => setPaymentForm({...paymentForm, bank_name: e.target.value})} placeholder="e.g., Chase, Bank of America" required />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Account Type</label>
                    <select value={paymentForm.account_type} onChange={(e) => setPaymentForm({...paymentForm, account_type: e.target.value})}>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Routing Number (9 digits)</label>
                    <input type="text" maxLength={9} pattern="[0-9]{9}" value={paymentForm.routing_number} onChange={(e) => setPaymentForm({...paymentForm, routing_number: e.target.value.replace(/\D/g, '')})} required />
                  </div>
                </div>
                <div className="form-field">
                  <label>Account Number</label>
                  <input type="text" value={paymentForm.account_number} onChange={(e) => setPaymentForm({...paymentForm, account_number: e.target.value.replace(/\D/g, '')})} required />
                  <span className="form-hint">Only the last 4 digits will be displayed</span>
                </div>
                <button type="submit" className="primary-btn submit-btn" disabled={saving}>
                  <CreditCard size={18} /> {saving ? 'Saving...' : 'Save Payment Info'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NurseProfilePage