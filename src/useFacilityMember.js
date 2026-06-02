// src/useFacilityMember.js
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './useAuth'
import { getPermissions } from './constants/permissions'

/**
 * Returns the logged-in user's facility membership row + permissions.
 * Use alongside useAuth in any facility-side page.
 *
 *   const { member, role, permissions, facility, loading } = useFacilityMember()
 *
 *   if (permissions.canManageTeam) { ... }
 */
export function useFacilityMember() {
  const { user, profile, loading: authLoading } = useAuth()
  const [member, setMember] = useState(null)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMember() {
      if (!user) {
        setMember(null)
        setFacility(null)
        setLoading(false)
        return
      }

      // Find the member row for this user
      const { data: memberRow } = await supabase
        .from('facility_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (memberRow) {
        setMember(memberRow)
        const { data: fac } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', memberRow.facility_id)
          .maybeSingle()
        setFacility(fac || null)
      } else {
        setMember(null)
        setFacility(null)
      }

      setLoading(false)
    }

    if (!authLoading) loadMember()
  }, [user, authLoading])

  const role = member?.role || null
  const permissions = role ? getPermissions(role) : {}

  return { member, role, permissions, facility, loading: loading || authLoading }
}