import { UserCheck, Users, Bell, CheckCircle2 } from 'lucide-react'

function HowItWorksSection() {
  const steps = [
    {
      icon: <UserCheck size={28} />,
      number: '01',
      title: 'Build your profile',
      description: 'Nurses upload credentials, certifications, license info, and experience tags. License is verified in real-time.'
    },
    {
      icon: <Users size={28} />,
      number: '02',
      title: 'Join a facility\'s float pool',
      description: 'Apply to hospitals you want to work with. Facilities review and approve nurses into their personal pool.'
    },
    {
      icon: <Bell size={28} />,
      number: '03',
      title: 'Get matched to shifts',
      description: 'When a facility posts a shift, qualified pool members get instant notifications. Accept with one tap.'
    },
    {
      icon: <CheckCircle2 size={28} />,
      number: '04',
      title: 'Work and get paid',
      description: 'Clock in via the app, work the shift, and get paid weekly. Guaranteed full shift pay if sent home early.'
    }
  ]

  return (
    <section id="how" className="how-section">
      <div className="section-header">
        <div className="eyebrow">How It Works</div>
        <h2>Same-day staffing in 4 simple steps</h2>
      </div>
      <div className="steps">
        {steps.map((step) => (
          <div key={step.number} className="step">
            <div className="step-icon">{step.icon}</div>
            <div className="step-number">{step.number}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HowItWorksSection