import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, Building2, ArrowLeft, FileCheck, Shield, DollarSign, BookOpen, MapPin, Edit, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AddressAutocomplete from '../components/AddressAutocomplete'

const FACILITY_AGREEMENTS = [
  {
    key: 'msa',
    title: 'Master Service Agreement',
    icon: FileCheck,
    summary: 'Governs the staffing relationship between your facility and Flexprn. Establishes tiered platform fee structure (Standard/Mid/Specialty/Premium) based on role and specialty, Net 7 payment terms via ACH, and service expectations.'
  },
  {
    key: 'terms',
    title: 'Platform Terms & Conditions',
    icon: BookOpen,
    summary: 'General terms of use for the Flexprn platform including acceptable use, account responsibilities, and dispute resolution procedures.'
  },
  {
    key: 'hipaa_baa',
    title: 'HIPAA Business Associate Agreement (BAA)',
    icon: Shield,
    summary: 'Required for healthcare data handling. Establishes Flexprn as a Business Associate under HIPAA, defining permitted uses and breach notification procedures.'
  },
  {
    key: 'payment_stipulations',
    title: 'Payment Terms & Cancellation Policy',
    icon: DollarSign,
    summary: 'Payment Net 7 days via ACH. Cancellation policy: if a shift is cancelled before 50% complete, facility pays the full scheduled shift; if cancelled after 50% complete, facility pays hours worked plus 2 hours. Conversion fees $1,500-$7,500 sliding scale.'
  },
  {
    key: 'non_solicitation',
    title: 'Non-Solicitation Agreement',
    icon: FileCheck,
    summary: 'You agree not to directly hire or arrange shifts outside the platform with any nurse connected through Flexprn for 18 months without paying the conversion fee.'
  }
]

function FacilitySignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddressEdit, setShowAddressEdit] = useState(true)
  const [formData, setFormData] = useState({
    facilityName: '', facilityType: '', contactFirstName: '', contactLastName: '',
    title: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    latitude: null, longitude: null,
    password: ''
  })
  const [agreementsAccepted, setAgreementsAccepted] = useState({})

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  function handleAddressSelected(addr) {
    setFormData({
      ...formData,
      address: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      latitude: addr.latitude,
      longitude: addr.longitude
    })
    setShowAddressEdit(false)
    setError('')
  }

  function proceedToAgreements(e) {
    e.preventDefault()
    setError('')
    if (!formData.latitude || !formData.longitude) {
      setError('Please search and select your facility address — GPS verification is required.')
      return
    }
    setStep(2)
  }

  function toggleAgreement(key) {
    setAgreementsAccepted({ ...agreementsAccepted, [key]: !agreementsAccepted[key] })
  }

  const allAgreed = FACILITY_AGREEMENTS.every(a => agreementsAccepted[a.key])
  const addressVerified = !!formData.latitude && !!formData.longitude

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    if (!allAgreed) {
      setError('All agreements must be accepted to continue')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { user_type: 'facility' } }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Account creation failed')

      const { error: profileError } = await supabase.from('facilities').insert({
        user_id: authData.user.id,
        facility_name: formData.facilityName,
        facility_type: formData.facilityType,
        contact_first_name: formData.contactFirstName,
        contact_last_name: formData.contactLastName,
        contact_title: formData.title,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        latitude: formData.latitude,
        longitude: formData.longitude,
        geocoded_at: new Date().toISOString()
      })

      if (profileError) throw profileError

      const signed = FACILITY_AGREEMENTS.map(a => ({
        user_id: authData.user.id,
        user_type: 'facility',
        agreement_type: a.key
      }))
      await supabase.from('signed_agreements').insert(signed)

      // Send welcome email (fire and forget)
      const { sendEmail, welcomeFacilityEmail } = await import('../utils/email')
      const emailContent = welcomeFacilityEmail(formData.facilityName, formData.contactFirstName)
      sendEmail(formData.email, emailContent.subject, emailContent.html)

      alert('Account created! Check your email for next steps.')
      navigate('/signin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Header />
      <main className="main signup-main">
        <div className="signup-container">
          <div className="signup-header">
            <div className="signup-icon"><Building2 size={32} /></div>
            <h1>{step === 1 ? 'Create Your Facility Account' : 'Required Agreements'}</h1>
            <p>{step === 1 ? 'No setup fees. Step 1 of 2.' : 'Step 2 of 2 — Review and accept all agreements'}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {step === 1 && (
            <form className="signup-form" onSubmit={proceedToAgreements}>
              <div className="form-section-label">Facility Information</div>
              <div className="form-field"><label>Facility Legal Name</label><input type="text" name="facilityName" value={formData.facilityName} onChange={handleChange} required /></div>
              <div className="form-field">
                <label>Facility Type</label>
                <select name="facilityType" value={formData.facilityType} onChange={handleChange} required>
                  <option value="">Select type</option>
                  <option value="hospital">Hospital</option>
                  <option value="ltc">Long-Term Care</option>
                  <option value="snf">Skilled Nursing Facility</option>
                  <option value="rehab">Rehabilitation Center</option>
                  <option value="assisted_living">Assisted Living</option>
                  <option value="clinic">Clinic</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* ============ VERIFIED ADDRESS ============ */}
              <div className="form-section-label">Facility Address</div>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '0.75rem', marginTop: '-0.5rem' }}>
                Search your address below — GPS verification is required so nurses can clock in onsite.
              </p>

              {addressVerified && !showAddressEdit && (
                <div style={{
                  background: 'linear-gradient(135deg, #F0F7F9 0%, #E0F4F6 100%)',
                  border: '2px solid #0A7E8C',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  <div style={{
                    background: '#0A7E8C',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'white'
                  }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#0A7E8C', display: 'block', marginBottom: '0.15rem' }}>
                      ✓ Verified Address
                    </strong>
                    <div style={{ color: '#1B3A6B', fontSize: '0.95rem' }}>{formData.address}</div>
                    <div style={{ color: '#1B3A6B', fontSize: '0.95rem' }}>
                      {formData.city}, {formData.state} {formData.zip}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                      GPS: {formData.latitude?.toFixed(6)}, {formData.longitude?.toFixed(6)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowAddressEdit(true)}
                    style={{ flexShrink: 0 }}
                  >
                    <Edit size={14} /> Change
                  </button>
                </div>
              )}

              {(!addressVerified || showAddressEdit) && (
                <div className="form-field">
                  <AddressAutocomplete
                    onSelect={handleAddressSelected}
                    placeholder="Start typing facility name or street address..."
                  />
                  <span className="form-hint" style={{ marginTop: '0.5rem' }}>
                    Try typing the hospital name (e.g., "Saint Elizabeth Healthcare Falmouth") or street address. Select the matching option from the dropdown.
                  </span>
                </div>
              )}
              {/* ============ END VERIFIED ADDRESS ============ */}

              <div className="form-section-label">Primary Contact</div>
              <div className="form-row">
                <div className="form-field"><label>First Name</label><input type="text" name="contactFirstName" value={formData.contactFirstName} onChange={handleChange} required /></div>
                <div className="form-field"><label>Last Name</label><input type="text" name="contactLastName" value={formData.contactLastName} onChange={handleChange} required /></div>
              </div>
              <div className="form-field"><label>Title / Role</label><input type="text" name="title" placeholder="e.g., Director of Nursing" value={formData.title} onChange={handleChange} required /></div>
              <div className="form-row">
                <div className="form-field"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
                <div className="form-field"><label>Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} required /></div>
              </div>
              <div className="form-field"><label>Password</label><input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} /><span className="form-hint">At least 8 characters</span></div>

              <button type="submit" className="primary-btn submit-btn" disabled={!addressVerified}>
                {addressVerified ? 'Continue to Agreements' : 'Verify Address to Continue'} <ArrowRight size={18} />
              </button>
              <p className="form-footer">Already have an account? <Link to="/signin">Sign in</Link></p>
            </form>
          )}

          {step === 2 && (
            <form className="signup-form" onSubmit={handleFinalSubmit}>
              <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                As a healthcare facility using Flexprn, the following agreements must be accepted. These establish the legal framework for our staffing services.
              </p>

              {FACILITY_AGREEMENTS.map(a => {
                const Icon = a.icon
                return (
                  <div key={a.key} className="agreement-card" onClick={() => toggleAgreement(a.key)}>
                    <div className="agreement-checkbox">
                      <input type="checkbox" checked={!!agreementsAccepted[a.key]} onChange={() => toggleAgreement(a.key)} />
                    </div>
                    <div className="agreement-icon"><Icon size={20} /></div>
                    <div className="agreement-content">
                      <h4>{a.title}</h4>
                      <p>{a.summary}</p>
                    </div>
                  </div>
                )
              })}

              <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '1rem' }}>
                By creating an account, you confirm you have authority to bind your facility to these agreements. Full document text is available in your dashboard for download.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
                <button type="submit" className="primary-btn submit-btn" disabled={loading || !allAgreed} style={{ flex: 1 }}>
                  {loading ? 'Creating...' : 'Create Account'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default FacilitySignupPage