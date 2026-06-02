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

export const ROLES = ['RN', 'LPN', 'CNA']

export const CERTS = ['BLS', 'ACLS', 'PALS', 'NRP', 'TNCC', 'ENPC', 'NIHSS', 'CCRN', 'CEN', 'CPN', 'RNC-OB']

// Suggested pay ranges per role (just for hints, not enforced)
export const ROLE_PAY_GUIDE = {
  RN: { min: 35, max: 75, typical: 45 },
  LPN: { min: 25, max: 50, typical: 32 },
  CNA: { min: 18, max: 32, typical: 22 }
}