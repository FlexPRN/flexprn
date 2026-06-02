import { DollarSign, TrendingDown, Zap } from 'lucide-react'

function StatsSection() {
  return (
    <section className="stats-section">
      <div className="stat-card">
        <div className="stat-icon"><DollarSign size={28} /></div>
        <div className="stat-number">$0</div>
        <div className="stat-label">Agency markup on nurse pay</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TrendingDown size={28} /></div>
        <div className="stat-number">30-45%</div>
        <div className="stat-label">Average savings vs. agency</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><Zap size={28} /></div>
        <div className="stat-number">Same Day</div>
        <div className="stat-label">Coverage available</div>
      </div>
    </section>
  )
}

export default StatsSection