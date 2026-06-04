// Vaccine catalog + compliance rules
export const VACCINE_TYPES = {
  mmr: {
    label: 'MMR (Measles, Mumps, Rubella)',
    short: 'MMR',
    requiresTiter: true,
    titerImmune: 'positive', // positive titer = lifetime immunity
    expirationYears: null, // lifetime if titer positive
    docTypes: 'Vaccination record OR titer/antibody test'
  },
  tdap: {
    label: 'Tdap (Tetanus, Diphtheria, Pertussis)',
    short: 'Tdap',
    requiresTiter: false,
    expirationYears: 10,
    docTypes: 'Vaccination record'
  },
  hep_b: {
    label: 'Hepatitis B',
    short: 'Hep B',
    requiresTiter: true,
    titerImmune: 'positive',
    expirationYears: null,
    docTypes: 'Vaccination series + titer/antibody test'
  },
  varicella: {
    label: 'Varicella (Chickenpox)',
    short: 'Varicella',
    requiresTiter: true,
    titerImmune: 'positive',
    expirationYears: null,
    docTypes: 'Vaccination record OR titer/antibody test'
  },
  flu: {
    label: 'Influenza (Flu)',
    short: 'Flu',
    requiresTiter: false,
    expirationYears: null, // seasonal — special logic
    seasonal: true,
    docTypes: 'Current season vaccination card'
  },
  tb_screen: {
    label: 'TB Screening (PPD or QuantiFERON)',
    short: 'TB',
    requiresTiter: false,
    expirationYears: 1,
    docTypes: 'Test results within last 12 months'
  },
  covid: {
    label: 'COVID-19',
    short: 'COVID',
    requiresTiter: false,
    expirationYears: null, // facility-dependent
    docTypes: 'Vaccination card'
  }
}

export const VACCINE_KEYS = Object.keys(VACCINE_TYPES)

// Compute the expiration date for an immunization
export function calculateExpirationDate(vaccineType, administeredDate, titerResult) {
  if (!administeredDate) return null
  const v = VACCINE_TYPES[vaccineType]
  if (!v) return null
  const admin = new Date(administeredDate)

  // Titer-based immunity: lifetime if positive
  if (v.requiresTiter && titerResult === v.titerImmune) {
    return null // no expiration
  }

  // Flu: expires Aug 31 of the next flu season after administration
  if (v.seasonal) {
    const adminYear = admin.getFullYear()
    const adminMonth = admin.getMonth() // 0-indexed (0 = Jan)
    // If admin was Sept-Dec, season ends Aug 31 next year
    // If admin was Jan-Aug, season ends Aug 31 this year
    const expYear = adminMonth >= 8 ? adminYear + 1 : adminYear
    return new Date(expYear, 7, 31).toISOString().split('T')[0] // Aug 31
  }

  // Fixed expiration years
  if (v.expirationYears) {
    const exp = new Date(admin)
    exp.setFullYear(exp.getFullYear() + v.expirationYears)
    return exp.toISOString().split('T')[0]
  }

  return null
}

// Determine compliance status given today's date
export function getComplianceStatus(immunization) {
  if (!immunization || immunization.status === 'missing') return { label: 'Missing', color: '#DC2626', emoji: '⛔' }
  if (immunization.status === 'pending_upload') return { label: 'Awaiting Upload', color: '#94a3b8', emoji: '📋' }
  if (immunization.status === 'ai_extracted') return { label: 'AI Verified — Pending Review', color: '#F59E0B', emoji: '🤖' }

  // Check expiration
  if (immunization.expiration_date) {
    const exp = new Date(immunization.expiration_date)
    const now = new Date()
    const daysUntil = (exp - now) / (1000 * 60 * 60 * 24)
    if (daysUntil < 0) return { label: 'Expired', color: '#DC2626', emoji: '❌' }
    if (daysUntil < 60) return { label: `Expiring in ${Math.floor(daysUntil)}d`, color: '#F59E0B', emoji: '⚠️' }
  }

  if (immunization.status === 'verified') return { label: 'Compliant', color: '#15803D', emoji: '✅' }
  return { label: 'Recorded', color: '#0A7E8C', emoji: '✓' }
}

// Overall compliance summary
export function getOverallCompliance(immunizations) {
  const total = VACCINE_KEYS.length
  let compliant = 0
  for (const key of VACCINE_KEYS) {
    const imm = immunizations.find(i => i.vaccine_type === key)
    const status = getComplianceStatus(imm)
    if (['Compliant', 'Recorded'].includes(status.label)) compliant++
  }
  return { compliant, total, percentage: Math.round((compliant / total) * 100) }
}