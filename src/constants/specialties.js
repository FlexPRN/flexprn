// src/constants/specialties.js

// ============================================
// SPECIALTIES — used in shift posting and nurse profile
// ============================================
export const SPECIALTIES = [
  'ICU',
  'Med-Surg',
  'TCU',
  'PCU',
  'PACU',
  'OR/Surgery',
  'Cath Lab',
  'Float Pool',
  'Assisted Living',
  'Emergency/ER',
  'Telemetry',
  'L&D',
  'Postpartum',
  'NICU',
  'Pediatrics',
  'PICU',
  'Oncology',
  'Hospice',
  'Cardiac/CVICU',
  'Neuro/NSICU',
  'Trauma',
  'CRRT',
  'ECMO',
  'Impella',
  'Charge Nurse',
  'Psych/Behavioral Health',
  'Rehab',
  'Long-Term Care',
  'Home Health',
  'Dialysis',
  'OB Triage'
]

// ============================================
// ROLES — only RN/LPN/CNA per Flexprn scope
// ============================================
export const ROLES = ['RN', 'LPN', 'CNA']

// ============================================
// CERTIFICATIONS
// ============================================
export const CERTS = ['BLS', 'ACLS', 'PALS', 'NRP', 'TNCC', 'ENPC', 'NIHSS', 'CCRN', 'CEN', 'CPN', 'RNC-OB']

// ============================================
// ROLE PAY GUIDE — suggested pay ranges per role (just for hints, not enforced)
// ============================================
export const ROLE_PAY_GUIDE = {
  RN: { min: 35, max: 75, typical: 45 },
  LPN: { min: 25, max: 50, typical: 32 },
  CNA: { min: 18, max: 32, typical: 22 }
}

// ============================================
// PRICING TIERS — Flexprn platform fee structure
// Flat-dollar markup added on top of nurse pay rate
//
// TIER ACTIVATION LOGIC:
//   - Tier is determined by the SHIFT'S PRIMARY SPECIALTY only
//   - Skills listed as "preferred" or "additional" do NOT trigger higher tiers
//   - Example: ICU shift with CRRT as a preferred skill = SPECIALTY tier ($22 RN)
//   - Example: Dedicated CRRT shift (specialty = "CRRT") = PREMIUM tier ($28 RN)
// ============================================
export const PRICING_TIERS = {
  STANDARD:  { CNA: 8,  LPN: 11, RN: 15 },
  MID:       { CNA: 8,  LPN: 13, RN: 18 },
  SPECIALTY: { CNA: 8,  LPN: 15, RN: 22 },
  PREMIUM:   { CNA: 8,  LPN: 15, RN: 28 },  // CRRT, ECMO, Impella — dedicated specialty assignments only
}

// ============================================
// URGENCY MULTIPLIER — added on top of base platform fee
// ============================================
export const URGENCY_MULTIPLIER = {
  standard: 0,  // >48 hr notice
  urgent:   2,  // <48 hr notice
  critical: 4,  // same-day, <24 hr notice
}

// ============================================
// SPECIALTY TIER MAP — categorizes each specialty into a pricing tier
// (Every specialty above MUST exist in this map. Default fallback is STANDARD.)
// ============================================
export const SPECIALTY_TIER_MAP = {
  // STANDARD TIER (lower-acuity / longer-term / general settings)
  'Med-Surg':                  'STANDARD',
  'Float Pool':                'STANDARD',
  'Assisted Living':           'STANDARD',
  'Hospice':                   'STANDARD',
  'Rehab':                     'STANDARD',
  'Long-Term Care':            'STANDARD',
  'Home Health':               'STANDARD',
  'Postpartum':                'STANDARD',
  'Pediatrics':                'STANDARD',
  'Psych/Behavioral Health':   'STANDARD',
  'Charge Nurse':              'STANDARD',

  // MID TIER (step-down acuity, telemetry, specialty support)
  'TCU':                       'MID',
  'PCU':                       'MID',
  'PACU':                      'MID',
  'Telemetry':                 'MID',
  'Oncology':                  'MID',
  'Dialysis':                  'MID',
  'OB Triage':                 'MID',

  // SPECIALTY TIER (high-acuity, specialty-skill units)
  'ICU':                       'SPECIALTY',
  'OR/Surgery':                'SPECIALTY',
  'Cath Lab':                  'SPECIALTY',
  'Emergency/ER':              'SPECIALTY',
  'L&D':                       'SPECIALTY',
  'NICU':                      'SPECIALTY',
  'PICU':                      'SPECIALTY',
  'Cardiac/CVICU':             'SPECIALTY',
  'Neuro/NSICU':               'SPECIALTY',
  'Trauma':                    'SPECIALTY',

  // PREMIUM TIER (specialty modalities — only when this IS the primary assignment)
  'CRRT':                      'PREMIUM',
  'ECMO':                      'PREMIUM',
  'Impella':                   'PREMIUM',
}

// ============================================
// HELPER FUNCTIONS — import these into any form/page that needs pricing
// ============================================

/**
 * Returns the per-hour platform fee for a given role, specialty, and urgency.
 * @param {string} role - 'RN' | 'LPN' | 'CNA'
 * @param {string} specialty - One of SPECIALTIES (must match exactly)
 * @param {string} urgency - 'standard' | 'urgent' | 'critical'
 * @returns {number} Platform fee in dollars per hour
 */
export function getPlatformFee(role, specialty, urgency = 'standard') {
  if (!role) return 0
  const roleKey = String(role).toUpperCase().trim()
  const tier = SPECIALTY_TIER_MAP[specialty] || 'STANDARD'
  const baseFee = PRICING_TIERS[tier]?.[roleKey] ?? PRICING_TIERS.STANDARD[roleKey] ?? 0
  const urgencyFee = URGENCY_MULTIPLIER[String(urgency).toLowerCase()] ?? 0
  return baseFee + urgencyFee
}

/**
 * Returns the total bill rate (what the facility pays per hour).
 * @param {string} role - 'RN' | 'LPN' | 'CNA'
 * @param {string} specialty - One of SPECIALTIES
 * @param {number} nursePayRate - Hourly pay rate going to the nurse
 * @param {string} urgency - 'standard' | 'urgent' | 'critical'
 * @returns {number} Total bill rate per hour (nurse pay + platform fee)
 */
export function getBillRate(role, specialty, nursePayRate, urgency = 'standard') {
  const fee = getPlatformFee(role, specialty, urgency)
  return Number(nursePayRate || 0) + fee
}

/**
 * Returns the tier name for a given specialty.
 * @param {string} specialty
 * @returns {string} 'STANDARD' | 'MID' | 'SPECIALTY' | 'PREMIUM'
 */
export function getSpecialtyTier(specialty) {
  return SPECIALTY_TIER_MAP[specialty] || 'STANDARD'
}

/**
 * Returns a human-readable tier label for the UI.
 * @param {string} specialty
 * @returns {string}
 */
export function getSpecialtyTierLabel(specialty) {
  const tier = getSpecialtyTier(specialty)
  return {
    STANDARD:  'Standard',
    MID:       'Mid-Acuity',
    SPECIALTY: 'High-Acuity Specialty',
    PREMIUM:   'Premium Specialty Modality',
  }[tier]
}