import { Heart, Zap, Handshake } from 'lucide-react'

function AboutSection() {
  return (
    <section id="about" className="about-section">
      <div className="about-content">
        <div className="eyebrow about-eyebrow">Our Story</div>
        <h2>Built by ED nurses who lived the problem</h2>
        <p className="about-text">
          Flexprn was created by emergency department nurses who watched their hospitals
          hemorrhage money to staffing agencies — while the nurses themselves saw only a
          fraction of what the agency charged. We knew there had to be a better way.
        </p>
        <p className="about-text">
          We built Flexprn to put control back where it belongs: in the hands of the
          hospitals managing their float pools and the nurses doing the actual work.
          No agency middleman. No hidden margins. Just direct, transparent staffing.
        </p>
        <div className="values">
          <div className="value">
            <div className="value-icon"><Heart size={28} /></div>
            <strong>Patient safety first</strong>
            <p>Every nurse vetted, every shift accountable</p>
          </div>
          <div className="value">
            <div className="value-icon"><Zap size={28} /></div>
            <strong>Speed when it matters</strong>
            <p>Same-day coverage from your approved pool</p>
          </div>
          <div className="value">
            <div className="value-icon"><Handshake size={28} /></div>
            <strong>Fair to everyone</strong>
            <p>Transparent pay for nurses, lower costs for hospitals</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection