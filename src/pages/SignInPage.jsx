import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, LogIn } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'

function SignInPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      console.log('Sign in successful, user:', data.user)

      const userType = data.user?.user_metadata?.user_type

      if (userType === 'nurse') {
        navigate('/nurse/dashboard')
      } else if (userType === 'facility') {
        navigate('/facility/dashboard')
      } else {
        const { data: nurseProfile } = await supabase
          .from('nurses')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (nurseProfile) {
          navigate('/nurse/dashboard')
        } else {
          const { data: facilityProfile } = await supabase
            .from('facilities')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (facilityProfile) {
            navigate('/facility/dashboard')
          } else {
            setError('Account exists but no profile found. Please sign up again.')
          }
        }
      }
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
        <div className="signup-container signin-container">
          <div className="signup-header">
            <div className="signup-icon"><LogIn size={32} /></div>
            <h1>Welcome Back</h1>
            <p>Sign in to your Flexprn account</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label>Password</label>
                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
            </button>

            <p className="form-footer">
              New to Flexprn?{' '}
              <Link to="/signup/nurse">Join as a Nurse</Link>
              {' or '}
              <Link to="/signup/facility">Join as a Facility</Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SignInPage