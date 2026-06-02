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
    let type = session.user.user_metadata?.user_type

    if (type === 'nurse') {
      const { data } = await supabase.from('nurses').select('*').eq('user_id', session.user.id).single()
      setUserType(type)
      setProfile(data)
    } else if (type === 'facility') {
      // Original facility owner — loads facility row
      const { data } = await supabase.from('facilities').select('*').eq('user_id', session.user.id).single()
      setUserType(type)
      setProfile(data)
    } else if (type === 'facility_member') {
      // Invited team member — find their facility via facility_members
      const { data: member } = await supabase
        .from('facility_members')
        .select('*, facilities(*)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (member?.facilities) {
        // Normalize to look like a facility profile for the rest of the app
        setUserType('facility')
        setProfile({ ...member.facilities, _member_role: member.role })
      } else {
        setUserType(null)
        setProfile(null)
      }
    } else {
      // Unknown user type — could be a facility member who hasn't been linked yet,
      // OR an existing facility owner without user_metadata.user_type set.
      // Try facility_members first, then facilities as fallback.
      const { data: member } = await supabase
        .from('facility_members')
        .select('*, facilities(*)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (member?.facilities) {
        setUserType('facility')
        setProfile({ ...member.facilities, _member_role: member.role })
      } else {
        const { data: facility } = await supabase
          .from('facilities')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (facility) {
          setUserType('facility')
          setProfile(facility)
        } else {
          setUserType(null)
          setProfile(null)
        }
      }
    }

    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return { user, userType, profile, loading, signOut }
}