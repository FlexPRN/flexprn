import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Set a hard timeout so users never see infinite spin
    const failsafeTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check took too long — proceeding as logged out')
        setLoading(false)
      }
    }, 5000) // 5 second max

    async function init() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        // If there's any session error (invalid/expired tokens), clear them
        if (error) {
          console.warn('Session error, clearing tokens:', error.message)
          await clearBadSession()
          if (mounted) {
            clearTimeout(failsafeTimeout)
            setLoading(false)
          }
          return
        }

        await handleSession(session)
      } catch (err) {
        console.error('Auth init error:', err)
        await clearBadSession()
        if (mounted) {
          clearTimeout(failsafeTimeout)
          setLoading(false)
        }
      }
    }

    async function clearBadSession() {
      try {
        // Sign out clears all local tokens
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        // If even signOut fails, manually clear local storage
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              localStorage.removeItem(key)
            }
          })
        } catch (e2) {
          // ignore
        }
      }
      if (mounted) {
        setUser(null)
        setUserType(null)
        setProfile(null)
      }
    }

    async function handleSession(session) {
      if (!mounted) return

      if (!session?.user) {
        setUser(null)
        setUserType(null)
        setProfile(null)
        clearTimeout(failsafeTimeout)
        setLoading(false)
        return
      }

      setUser(session.user)
      const type = session.user.user_metadata?.user_type
      setUserType(type)

      try {
        if (type === 'nurse') {
          const { data } = await supabase
            .from('nurses')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (mounted) setProfile(data)
        } else if (type === 'facility') {
          const { data } = await supabase
            .from('facilities')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (mounted) setProfile(data)
        } else {
          // No user_type in metadata — try both tables as fallback
          const { data: nurseData } = await supabase
            .from('nurses')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (nurseData) {
            if (mounted) {
              setUserType('nurse')
              setProfile(nurseData)
            }
          } else {
            const { data: facData } = await supabase
              .from('facilities')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle()
            if (mounted) {
              if (facData) {
                setUserType('facility')
                setProfile(facData)
              }
            }
          }
        }
      } catch (err) {
        console.error('Profile load error:', err)
      }

      clearTimeout(failsafeTimeout)
      if (mounted) setLoading(false)
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle specific events
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        await handleSession(session)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null)
          setUserType(null)
          setProfile(null)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(failsafeTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }
    window.location.href = '/'
  }

  return { user, userType, profile, loading, signOut }
}