// src/constants/permissions.js

// ============================================
// ROLE PERMISSIONS — controls what each role can do
// ============================================

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COORDINATOR: 'coordinator',
  SUPERVISOR: 'supervisor'
}

export const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Nurse Manager',
  coordinator: 'Staffing Coordinator',
  supervisor: 'Charge / House Supervisor'
}

export const ROLE_DESCRIPTIONS = {
  admin: 'Full access. Manages team, billing, facility settings, and signs agreements. Typically the DON or facility director.',
  manager: 'Can post unlimited shifts, manage float pool, view revenue. Typically a unit manager.',
  coordinator: 'Can post shifts and manage float pool. No financial data access. Typically HR / staffing coordinator.',
  supervisor: 'Can post urgent/critical shifts within a pre-approved bill rate cap. Typically a charge nurse or house supervisor.'
}

export const PERMISSIONS = {
  admin: {
    canPostShifts: true,
    canPostAnyUrgency: true,
    canManageTeam: true,
    canManagePool: true,
    canApprovePool: true,
    canViewRevenue: true,
    canEditFacility: true,
    canSignAgreements: true,
    hasMaxBillRateCap: false
  },
  manager: {
    canPostShifts: true,
    canPostAnyUrgency: true,
    canManageTeam: false,
    canManagePool: true,
    canApprovePool: true,
    canViewRevenue: true,
    canEditFacility: false,
    canSignAgreements: false,
    hasMaxBillRateCap: false
  },
  coordinator: {
    canPostShifts: true,
    canPostAnyUrgency: true,
    canManageTeam: false,
    canManagePool: true,
    canApprovePool: true,
    canViewRevenue: false,
    canEditFacility: false,
    canSignAgreements: false,
    hasMaxBillRateCap: false
  },
  supervisor: {
    canPostShifts: true,
    canPostAnyUrgency: false,        // urgent/critical only
    canManageTeam: false,
    canManagePool: false,
    canApprovePool: false,
    canViewRevenue: false,
    canEditFacility: false,
    canSignAgreements: false,
    hasMaxBillRateCap: true          // capped by facility's max_supervisor_bill_rate
  }
}

export function getPermissions(role) {
  return PERMISSIONS[role] || {}
}

export function canUserPostShift({ role, urgency, billRate, maxSupervisorBillRate }) {
  const perms = getPermissions(role)
  if (!perms.canPostShifts) return { allowed: false, reason: 'Your role does not allow posting shifts.' }

  if (!perms.canPostAnyUrgency && urgency === 'standard') {
    return {
      allowed: false,
      reason: 'Supervisors can only post urgent or critical shifts. Standard shifts require a Manager or Coordinator.'
    }
  }

  if (perms.hasMaxBillRateCap && Number(billRate) > Number(maxSupervisorBillRate)) {
    return {
      allowed: false,
      reason: `Bill rate $${Number(billRate).toFixed(2)}/hr exceeds your role's cap of $${Number(maxSupervisorBillRate).toFixed(2)}/hr. Ask a Manager to post this shift.`
    }
  }

  return { allowed: true }
}