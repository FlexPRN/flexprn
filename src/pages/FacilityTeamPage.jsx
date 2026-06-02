import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, ArrowLeft, Users, UserPlus, Mail, Shield,
  X, Check, Trash2, AlertCircle, ChevronDown
} from 'lucide-react'
import { useAuth } from '../useAuth'
import { useFacilityMember } from '../useFacilityMember'
import { supabase } from '../supabaseClient'
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../constants/permissions'

function FacilityTeamPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { member, permissions, facility, loading: memberLoading } = useFacilityMember()

  const [team, setTeam] = useState([])
  const [invitations, setInvitations] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'manager' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [supervisorCap, setSupervisorCap] = useState('')

  useEffect(() => {
    if (!memberLoading && !member) navigate('/signin')
    if (facility) {
      loadTeam()
      loadInvitations()
      setSupervisorCap(facility.max_supervisor_bill_rate || 90)
    }
  }, [member, facility, memberLoading])

  async function loadTeam() {
    const { data } = await supabase
      .from('facility_members')
      .select('*')
      .eq('facility_id', facility.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: true })
    setTeam(data || [])
  }

  async function loadInvitations() {
    const { data } = await supabase
      .from('facility_invitations')
      .select('*')
      .eq('facility_id', facility.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setInvitations(data || [])
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.role) return

    setSending(true)
    const { data, error } = await supabase
      .from('facility_invitations')
      .insert({
        facility_id: facility.id,
        email: inviteForm.email.toLowerCase().trim(),
        role: inviteForm.role,
        invited_by: user.id,
        invited_by_name: `${member.first_name} ${member.last_name}`
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setSending(false)
      return
    }

    // Send invitation email
    try {
      const { sendEmail } = await import('../utils/email')
      const inviteUrl = `${window.location.origin}/accept-invitation?token=${data.token}`
      const subject = `You're invited to join ${facility.facility_name} on Flexprn`
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1B3A6B;">You're invited to ${facility.facility_name}</h2>
          <p>${member.first_name} ${member.last_name} (${ROLE_LABELS[member.role]}) has invited you to join <strong>${facility.facility_name}</strong> on Flexprn as a <strong>${ROLE_LABELS[inviteForm.role]}</strong>.</p>
          <p>${ROLE_DESCRIPTIONS[inviteForm.role]}</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #0A7E8C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a>
          </div>
          <p style="color: #64748B; font-size: 0.9rem;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
        </div>
      `
      sendEmail(inviteForm.email, subject, html)
    } catch (err) {
      console.error('Email send error (non-fatal):', err)
    }

    setMessage(`✓ Invitation sent to ${inviteForm.email}`)
    setShowInviteModal(false)
    setInviteForm({ email: '', role: 'manager' })
    setSending(false)
    loadInvitations()
    setTimeout(() => setMessage(''), 5000)
  }

  async function changeRole(memberId, newRole) {
    if (!confirm(`Change this member's role to ${ROLE_LABELS[newRole]}?`)) return
    await supabase
      .from('facility_members')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', memberId)
    setMessage('✓ Role updated')
    loadTeam()
    setTimeout(() => setMessage(''), 3000)
  }

  async function removeMember(memberId, memberName) {
    if (!confirm(`Remove ${memberName} from the team? They will lose all access to ${facility.facility_name}.`)) return
    await supabase
      .from('facility_members')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', memberId)
    setMessage('✓ Member removed')
    loadTeam()
    setTimeout(() => setMessage(''), 3000)
  }

  async function revokeInvitation(invitationId) {
    if (!confirm('Revoke this pending invitation?')) return
    await supabase
      .from('facility_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
    setMessage('✓ Invitation revoked')
    loadInvitations()
    setTimeout(() => setMessage(''), 3000)
  }

  async function saveSupervisorCap() {
    const cap = parseFloat(supervisorCap)
    if (isNaN(cap) || cap < 0) {
      alert('Please enter a valid bill rate')
      return
    }
    await supabase
      .from('facilities')
      .update({ max_supervisor_bill_rate: cap })
      .eq('id', facility.id)
    setMessage(`✓ Supervisor cap set to $${cap}/hr`)
    setTimeout(() => setMessage(''), 4000)
  }

  if (memberLoading) return <div className="dashboard-loading">Loading...</div>
  if (!member) return null

  // Only admins can see this page
  if (!permissions.canManageTeam) {
    return (
      <div className="dashboard">
        <div className="profile-container">
          <div className="hardstop-warning">
            <AlertCircle size={24} />
            <div>
              <strong>Access Restricted</strong>
              <p>Only facility administrators can manage team members. Your current role is {ROLE_LABELS[member.role]}.</p>
              <button className="primary-btn" onClick={() => navigate('/facility/dashboard')} style={{ marginTop: '1rem' }}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/facility/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{facility.facility_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate('/facility/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="profile-header">
          <div>
            <h1><Users size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Team Management</h1>
            <p className="dash-subtitle">Invite team members and assign roles for {facility.facility_name}</p>
          </div>
          <button className="primary-btn" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={18} /> Invite Team Member
          </button>
        </div>

        {message && <div className="success-toast">{message}</div>}

        {/* Supervisor cap setting */}
        <div className="profile-section">
          <h2><Shield size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Supervisor Spending Cap</h2>
          <p className="section-help">Maximum bill rate (per hour) a Charge/House Supervisor can post without admin approval.</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
            <div className="form-field" style={{ flex: 1, maxWidth: '200px', marginBottom: 0 }}>
              <label>Max Bill Rate ($/hr)</label>
              <input
                type="number"
                step="5"
                value={supervisorCap}
                onChange={(e) => setSupervisorCap(e.target.value)}
              />
            </div>
            <button className="primary-btn" onClick={saveSupervisorCap}>Save Cap</button>
          </div>
        </div>

        {/* Team members list */}
        <div className="profile-section">
          <h2>Team Members ({team.length})</h2>
          {team.length === 0 ? (
            <p className="empty-state">No team members yet.</p>
          ) : (
            <div className="pool-list">
              {team.map(m => (
                <div key={m.id} className="pool-card">
                  <div style={{ flex: 1 }}>
                    <h3>
                      {m.first_name} {m.last_name}
                      {m.user_id === user.id && (
                        <span style={{ fontSize: '0.8rem', color: '#0A7E8C', fontWeight: 600, marginLeft: '0.5rem' }}>(You)</span>
                      )}
                    </h3>
                    <p>{m.email}</p>
                    {m.title && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>{m.title}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {m.user_id === user.id ? (
                      <span className={`role-badge`} style={{ background: '#1B3A6B', color: 'white' }}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    ) : (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          <option value="admin">Administrator</option>
                          <option value="manager">Nurse Manager</option>
                          <option value="coordinator">Staffing Coordinator</option>
                          <option value="supervisor">Charge / House Supervisor</option>
                        </select>
                        <button className="deny-btn small-btn" onClick={() => removeMember(m.id, `${m.first_name} ${m.last_name}`)} title="Remove member">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="profile-section">
            <h2>Pending Invitations ({invitations.length})</h2>
            <div className="pool-list">
              {invitations.map(inv => (
                <div key={inv.id} className="pool-card">
                  <div style={{ flex: 1 }}>
                    <h3><Mail size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} /> {inv.email}</h3>
                    <p>Invited as: <strong>{ROLE_LABELS[inv.role]}</strong></p>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                      Sent: {new Date(inv.created_at).toLocaleDateString()} ·
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="deny-btn small-btn" onClick={() => revokeInvitation(inv.id)}>
                    <X size={14} /> Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite modal */}
        {showInviteModal && (
          <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><UserPlus size={20} /> Invite Team Member</h2>
                <button className="icon-btn" onClick={() => setShowInviteModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={sendInvite}>
                <div className="form-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="colleague@hospital.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Role *</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Nurse Manager</option>
                    <option value="coordinator">Staffing Coordinator</option>
                    <option value="supervisor">Charge / House Supervisor</option>
                  </select>
                  <span className="form-hint" style={{ marginTop: '0.5rem', display: 'block' }}>
                    {ROLE_DESCRIPTIONS[inviteForm.role]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="primary-btn" disabled={sending}>
                    <Mail size={16} /> {sending ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setShowInviteModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilityTeamPage