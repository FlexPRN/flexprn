import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Building2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../constants/permissions'

function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState(null)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [mode, setMode] = useState('signup')

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', title: '', phone: '', password: ''
  })

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.')
      setLoading(false)
      return
    }
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    setLoading(true)
    const { data, error: invErr } = await supabase
      .from('facility_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (invErr || !data) {
      setError('Invitation not found. The link may be invalid or expired.')
      setLoading(false)
      return
    }

    if (data.status !== 'pending') {
      setError(`This invitation has already been ${data.status}.`)
      setLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setError('This invitation has expired. Please ask the facility to send a new one.')
      setLoading(false)
      return
    }

    setInvitation(data)

    const { data: fac } = await supabase
      .from('facilities')
      .select('id, facility_name, facility_type, city, state')
      .eq('id', data.facility_id)
      .maybeSingle()

    setFacility(fac)
    setLoading(false)
  }

  async function handleAccept(e) {
    e.preventDefault()
    setAccepting(true)
    setError('')

    try {
      let userId = null

      if (mode === 'signup') {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: invitation.email,
          password: formData.password,
          options: { data: { user_type: 'facility_member' } }
        })
        if (authErr) throw authErr
        if (!authData.user) throw new Error('Account creation failed')
        userId = authData.user.id
      } else {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: formData.password
        })
        if (authErr) throw authErr
        userId = authData.user.id
      }

      // Create facility_members row
      const { error: memberErr } = await supabase.from('facility_members').insert({
        facility_id: invitation.facility_id,
        user_id: userId,
        role: invitation.role,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: invitation.email,
        title: formData.title,
        phone: formData.phone,
        status: 'active',
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString()
      })

      if (memberErr) throw memberErr

      await supabase
        .from('facility_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      alert(`✓ Welcome to ${facility.facility_name}! You're now signed in.`)
      navigate('/facility/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <Header />
        <main className="main signup-main">
          <div className="signup-container">
            <p style={{ textAlign: 'center' }}>Loading invitation...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="app">
        <Header />
        <main className="main signup-main">
          <div className="signup-container">
            <div className="hardstop-warning">
              <AlertCircle size={24} />
              <div>
                <strong>Invitation Error</strong>
                <p>{error}</p>
                <Link to="/" className="primary-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>Go to Home</Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="app">
      <Header />
      <main className="main signup-main">
        <div className="signup-container">
          <div className="signup-header">
            <div className="signup-icon"><Building2 size={32} /></div>
            <h1>You're Invited!</h1>
            <p>Join <strong>{facility?.facility_name}</strong> as a <strong>{ROLE_LABELS[invitation.role]}</strong></p>
          </div>

          <div style={{ background: '#F0F7F9', border: '2px solid #0A7E8C', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0A7E8C', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={20} />
              <strong>{ROLE_LABELS[invitation.role]}</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1B3A6B' }}>{ROLE_DESCRIPTIONS[invitation.role]}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={mode === 'signup' ? 'primary-btn' : 'secondary-btn'}
              onClick={() => setMode('signup')}
              style={{ flex: 1 }}
            >
              I'm New
            </button>
            <button
              type="button"
              className={mode === 'signin' ? 'primary-btn' : 'secondary-btn'}
              onClick={() => setMode('signin')}
              style={{ flex: 1 }}
            >
              I Already Have an Account
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="signup-form" onSubmit={handleAccept}>
            <div className="form-field">
              <label>Email</label>
              <input type="email" value={invitation.email} disabled />
              <span className="form-hint">This email was invited and cannot be changed.</span>
            </div>

            {mode === 'signup' && (
              <>
                <div className="form-row">
                  <div className="form-field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label>Title / Job Role</label>
                  <input
                    type="text"
                    placeholder="e.g., Charge Nurse, House Supervisor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
              {mode === 'signup' && <span className="form-hint">At least 8 characters</span>}
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={accepting}>
              {accepting ? 'Joining team...' : `Join ${facility?.facility_name}`} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AcceptInvitationPage