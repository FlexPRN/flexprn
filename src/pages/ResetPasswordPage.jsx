import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/signin'), 3000)
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
            <div className="signup-icon"><Lock size={32} /></div>
            <h1>Set New Password</h1>
            <p>Choose a strong password for your account</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {success ? (
            <div className="success-message">
              <CheckCircle2 size={48} className="success-icon" />
              <h3>Password updated!</h3>
              <p>Redirecting you to sign in...</p>
            </div>
          ) : validSession && (
            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <span className="form-hint">At least 8 characters</span>
              </div>

              <div className="form-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button type="submit" className="primary-btn submit-btn" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'} <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordPage