import { Check, X } from 'lucide-react'

function ComparisonTable() {
  const rows = [
    { label: 'Agency markup', us: 'Flat $15/hr personnel fee', them: '20-40% hidden markup' },
    { label: 'Pricing transparency', us: 'Full itemized invoices', them: 'Black-box bill rate' },
    { label: 'Float pool control', us: 'You approve every nurse', them: 'Agency assigns' },
    { label: 'Same-day coverage', us: 'Real-time from approved pool', them: '24-72 hour fill time' },
    { label: 'Backup nurse option', us: 'Standby coverage included', them: 'Not available' },
    { label: 'Conversion to permanent hire', us: '$1,500 - $7,500 sliding scale', them: '$10,000 - $25,000' },
    { label: 'Guaranteed shift pay', us: 'Full pay if sent home early', them: 'Pay only for hours worked' }
  ]

  return (
    <section id="why" className="why-section">
      <div className="section-header">
        <div className="eyebrow">The Difference</div>
        <h2>Flexprn vs. Traditional Agencies</h2>
      </div>
      <div className="comparison-table">
        <div className="comp-row comp-header">
          <div className="comp-cell"></div>
          <div className="comp-cell comp-us-header">Flexprn</div>
          <div className="comp-cell comp-them-header">Traditional Agency</div>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="comp-row">
            <div className="comp-cell comp-label">{row.label}</div>
            <div className="comp-cell comp-us-cell">
              <Check size={18} className="check-icon" />
              <span>{row.us}</span>
            </div>
            <div className="comp-cell comp-them-cell">
              <X size={18} className="x-icon" />
              <span>{row.them}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ComparisonTable