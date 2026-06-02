import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Building2, ArrowLeft, Save, MapPin, User, CheckCircle2, AlertCircle, Edit } from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import AddressAutocomplete from '../components/AddressAutocomplete'

function FacilityProfilePage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('facility')
  const [geocoded, setGeocoded] = useState(false)
  const [showAddressEdit, setShowAddressEdit] = useState(false)

  const [formData, setFormData] = useState({
    facility_name: '', facility_type: '', address: '', city: '', state: '', zip: '',
    phone: '', contact_first_name: '', contact_last_name: '', contact_title: '',
    latitude: null, longitude: null
  })

  useEffect(() => {
    if (!loading && (!user || !profile)) navigate('/signin')
    if (profile) {
      setFormData({
        facility_name: profile.facility_name || '',
        facility_type: profile.facility_type || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zip: profile.zip || '',
        phone: profile.phone || '',
        contact_first_name: profile.contact_first_name || '',
        contact_last_name: profile.contact_last_name || '',
        contact_title: profile.contact_title || '',
        latitude: profile.latitude,
        longitude: profile.longitude
      })
      setGeocoded(!!profile.latitude && !!profile.longitude)
    }
  }, [user, profile, loading])

  function handleAddressSelected(addr) {
    setFormData({
      ...formData,
      address: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      latitude: addr.latitude,
      longitude: addr.longitude
    })
    setShowAddressEdit(false)
    setMessage(`✓ Address selected. Click "Save Facility Info" to confirm.`)
    setTimeout(() => setMessage(''), 4000)
  }

  async function saveFacilityInfo() {
    if (!formData.latitude || !formData.longitude) {
      setMessage('Error: Please use the address search to select your address with GPS verification.')
      return
    }

    setSaving(true)
    setMessage('Saving...')

    const { error } = await supabase
      .from('facilities')
      .update({
        facility_name: formData.facility_name,
        facility_type: formData.facility_type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        phone: formData.phone,
        latitude: formData.latitude,
        longitude: formData.longitude,
        geocoded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage(`✓ Facility info saved! GPS verification enabled.`)
      setGeocoded(true)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 5000)
  }

  async function saveContactInfo() {
    setSaving(true)
    const { error } = await supabase
      .from('facilities')
      .update({
        contact_first_name: formData.contact_first_name,
        contact_last_name: formData.contact_last_name,
        contact_title: formData.contact_title,
        phone: formData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) setMessage('Error: ' + error.message)
    else setMessage('✓ Contact info saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/facility/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <span>{profile.facility_name}</span>
          <button onClick={signOut} className="signout-btn"><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate('/facility/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div className="profile-header">
          <div>
            <h1>Facility Profile</h1>
            <p className="dash-subtitle">Keep your facility information up to date</p>
          </div>
        </div>

        {!geocoded && (
          <div className="hardstop-warning">
            <AlertCircle size={24} />
            <div>
              <strong>Address Not Verified</strong>
              <p>Your facility address must be verified via GPS coordinates for nurses to clock in. Search and select your address below.</p>
            </div>
          </div>
        )}

        {message && <div className={message.includes('Error') ? 'error-message' : 'success-toast'}>{message}</div>}

        <div className="profile-tabs">
          <button className={activeTab === 'facility' ? 'tab active' : 'tab'} onClick={() => setActiveTab('facility')}>
            <Building2 size={16} /> Facility Info
          </button>
          <button className={activeTab === 'contact' ? 'tab active' : 'tab'} onClick={() => setActiveTab('contact')}>
            <User size={16} /> Primary Contact
          </button>
        </div>

        {activeTab === 'facility' && (
          <div className="profile-section">
            <h2>Facility Information</h2>

            <div className="form-field">
              <label>Facility Legal Name *</label>
              <input type="text" value={formData.facility_name} onChange={(e) => setFormData({...formData, facility_name: e.target.value})} required />
            </div>

            <div className="form-field">
              <label>Facility Type *</label>
              <select value={formData.facility_type} onChange={(e) => setFormData({...formData, facility_type: e.target.value})} required>
                <option value="">Select type</option>
                <option value="hospital">Hospital</option>
                <option value="ltc">Long-Term Care</option>
                <option value="snf">Skilled Nursing Facility</option>
                <option value="rehab">Rehabilitation Center</option>
                <option value="assisted_living">Assisted Living</option>
                <option value="clinic">Clinic</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-field">
              <label>Phone Number</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#1B3A6B' }}>Address *</h3>
            <p className="section-help">Start typing your facility address — autocomplete will suggest matches with verified GPS coordinates.</p>

            {!showAddressEdit && geocoded && (
              <div className="payment-display" style={{ background: 'linear-gradient(135deg, #F0F7F9 0%, #E0F4F6 100%)', borderColor: '#0A7E8C' }}>
                <div className="payment-display-icon" style={{ background: '#0A7E8C' }}>
                  <MapPin size={32} />
                </div>
                <div>
                  <strong style={{ color: '#0A7E8C' }}>Verified Address</strong>
                  <p style={{ color: '#1B3A6B' }}>{formData.address}</p>
                  <p style={{ color: '#1B3A6B' }}>{formData.city}, {formData.state} {formData.zip}</p>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem' }}>
                    GPS: {formData.latitude?.toFixed(6)}, {formData.longitude?.toFixed(6)}
                  </p>
                </div>
                <button className="secondary-btn" onClick={() => setShowAddressEdit(true)}>
                  <Edit size={16} /> Change
                </button>
              </div>
            )}

            {(showAddressEdit || !geocoded) && (
              <div className="form-field">
                <AddressAutocomplete
                  onSelect={handleAddressSelected}
                  placeholder="Start typing facility name or street address..."
                />
                <span className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Try typing the hospital name (e.g., "Saint Elizabeth Healthcare Falmouth") or street address. Select the matching option from the dropdown.
                </span>
              </div>
            )}

            {formData.latitude && (
              <button className="primary-btn" onClick={saveFacilityInfo} disabled={saving} style={{ marginTop: '1rem' }}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save Facility Info'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="profile-section">
            <h2>Primary Contact</h2>
            <p className="section-help">The main person we contact for staffing matters</p>

            <div className="form-row">
              <div className="form-field">
                <label>First Name</label>
                <input type="text" value={formData.contact_first_name} onChange={(e) => setFormData({...formData, contact_first_name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input type="text" value={formData.contact_last_name} onChange={(e) => setFormData({...formData, contact_last_name: e.target.value})} />
              </div>
            </div>

            <div className="form-field">
              <label>Title / Role</label>
              <input type="text" placeholder="e.g., Director of Nursing" value={formData.contact_title} onChange={(e) => setFormData({...formData, contact_title: e.target.value})} />
            </div>

            <div className="form-field">
              <label>Email (read-only)</label>
              <input type="email" value={profile.email} disabled />
              <span className="form-hint">Contact support to change email</span>
            </div>

            <button className="primary-btn" onClick={saveContactInfo} disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Contact Info'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilityProfilePage