import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSession(session) {
    if (!session?.user) {
      setUser(null)
      setUserType(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setUser(session.user)
    const type = session.user.user_metadata?.user_type
    setUserType(type)

    if (type === 'nurse') {
      const { data } = await supabase.from('nurses').select('*').eq('user_id', session.user.id).single()
      setProfile(data)
    } else if (type === 'facility') {
      const { data } = await supabase.from('facilities').select('*').eq('user_id', session.user.id).single()
      setProfile(data)
    }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return { user, userType, profile, loading, signOut }
}