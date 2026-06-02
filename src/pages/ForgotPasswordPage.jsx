import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import Footer from '../components/Footer'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      setSuccess(true)
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
            <div className="signup-icon"><KeyRound size={32} /></div>
            <h1>Reset Your Password</h1>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {success ? (
            <div className="success-message">
              <CheckCircle2 size={48} className="success-icon" />
              <h3>Check your email</h3>
              <p>We've sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.</p>
              <p className="success-hint">Didn't receive it? Check your spam folder or try again in a few minutes.</p>
              <Link to="/signin" className="primary-btn submit-btn">Back to Sign In</Link>
            </div>
          ) : (
            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <button type="submit" className="primary-btn submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight size={18} />
              </button>

              <p className="form-footer">
                Remember your password? <Link to="/signin">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPasswordPage