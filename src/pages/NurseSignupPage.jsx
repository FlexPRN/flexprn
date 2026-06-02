import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, Stethoscope, ArrowLeft, FileCheck, Shield, Clock, Phone, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'

const AGREEMENTS = [
  {
    key: 'terms',
    title: 'Independent Contractor Terms of Service',
    icon: FileCheck,
    summary: 'You acknowledge you are a 1099 independent contractor, not an employee. Flexprn does not provide benefits, withhold taxes, or guarantee shifts.'
  },
  {
    key: 'hipaa',
    title: 'HIPAA Compliance Agreement',
    icon: Shield,
    summary: 'You agree to maintain patient confidentiality, follow HIPAA privacy rules, and report any potential breaches through the platform.'
  },
  {
    key: 'attestation',
    title: 'License & Credentials Attestation',
    icon: FileCheck,
    summary: 'You attest that all license info, certifications, and credentials uploaded are current, unrestricted, and unaltered. Misrepresentation results in immediate removal.'
  },
  {
    key: 'timekeeping',
    title: 'Time Keeping Policy',
    icon: Clock,
    summary: 'You agree to clock in within 10 minutes of shift start and clock out promptly via the platform app. Manual time adjustments require facility approval.'
  },
  {
    key: 'communications',
    title: 'Email & Phone Use Agreement',
    icon: Phone,
    summary: 'You consent to receive shift notifications, account alerts, and platform updates via email, SMS, and push notification.'
  },
  {
    key: 'cancellation',
    title: 'Shift Cancellation Policy',
    icon: X,
    summary: 'Once accepted, cancellation is only permitted for documented emergencies. Penalties apply: 1st cancellation = warning, 2nd = 14-day suspension, 3rd = 90-day suspension, no-show = immediate 90-day suspension.'
  }
]

function NurseSignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    licenseType: '', licenseNumber: '', licenseState: '',
    yearsExperience: '', password: ''
  })
  const [agreementsAccepted, setAgreementsAccepted] = useState({})

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function proceedToTerms(e) {
    e.preventDefault()
    setError('')
    setStep(2)
  }

  function toggleAgreement(key) {
    setAgreementsAccepted({ ...agreementsAccepted, [key]: !agreementsAccepted[key] })
  }

  const allAgreed = AGREEMENTS.every(a => agreementsAccepted[a.key])

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    if (!allAgreed) {
      setError('You must agree to all policies to continue')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { user_type: 'nurse' } }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Account creation failed')

      const { error: profileError } = await supabase.from('nurses').insert({
        user_id: authData.user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        license_type: formData.licenseType,
        license_number: formData.licenseNumber,
        license_state: formData.licenseState,
        years_experience: formData.yearsExperience,
        terms_signed: true
      })

      if (profileError) throw profileError

      const signedAgreements = AGREEMENTS.map(a => ({
        user_id: authData.user.id,
        user_type: 'nurse',
        agreement_type: a.key
      }))
      await supabase.from('signed_agreements').insert(signedAgreements)

      // Send welcome email (fire and forget)
      const { sendEmail, welcomeNurseEmail } = await import('../utils/email')
      const emailContent = welcomeNurseEmail(formData.firstName)
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
            <div className="signup-icon"><Stethoscope size={32} /></div>
            <h1>{step === 1 ? 'Create Your Nurse Account' : 'Review Policies'}</h1>
            <p>{step === 1 ? 'Free to join. Step 1 of 2.' : 'Step 2 of 2 — Please review and accept all policies'}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {step === 1 && (
            <form className="signup-form" onSubmit={proceedToTerms}>
              <div className="form-row">
                <div className="form-field">
                  <label>First Name</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label>Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-field">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-field">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>License Type</label>
                  <select name="licenseType" value={formData.licenseType} onChange={handleChange} required>
                    <option value="">Select type</option>
                    <option value="RN">RN</option>
                    <option value="LPN">LPN</option>
                    <option value="CNA">CNA</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>License State</label>
                  <input type="text" name="licenseState" placeholder="e.g., KY" value={formData.licenseState} onChange={handleChange} required maxLength={2} />
                </div>
              </div>

              <div className="form-field">
                <label>License Number</label>
                <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required />
              </div>

              <div className="form-field">
                <label>Years of Experience</label>
                <select name="yearsExperience" value={formData.yearsExperience} onChange={handleChange} required>
                  <option value="">Select range</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div className="form-field">
                <label>Create Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} />
                <span className="form-hint">At least 8 characters</span>
              </div>

              <button type="submit" className="primary-btn submit-btn">
                Continue to Policies <ArrowRight size={18} />
              </button>

              <p className="form-footer">
                Already have an account? <Link to="/signin">Sign in</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form className="signup-form" onSubmit={handleFinalSubmit}>
              <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Please review each policy and check the box to acknowledge. All policies are required to use Flexprn.
              </p>

              {AGREEMENTS.map(a => {
                const Icon = a.icon
                return (
                  <div key={a.key} className="agreement-card" onClick={() => toggleAgreement(a.key)}>
                    <div className="agreement-checkbox">
                      <input
                        type="checkbox"
                        checked={!!agreementsAccepted[a.key]}
                        onChange={() => toggleAgreement(a.key)}
                      />
                    </div>
                    <div className="agreement-icon">
                      <Icon size={20} />
                    </div>
                    <div className="agreement-content">
                      <h4>{a.title}</h4>
                      <p>{a.summary}</p>
                    </div>
                  </div>
                )
              })}

              <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '1rem' }}>
                By creating an account, you confirm you have read and agree to all policies above. Full text of each policy is available in your account dashboard at any time.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="primary-btn submit-btn" disabled={loading || !allAgreed} style={{ flex: 1 }}>
                  {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={18} />
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

export default NurseSignupPage