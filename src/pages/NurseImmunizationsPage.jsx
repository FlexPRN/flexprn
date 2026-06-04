import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ArrowLeft, Upload, Sparkles, Trash2, Save, ShieldCheck } from 'lucide-react'
import { useAuth } from '../useAuth'
import { supabase } from '../supabaseClient'
import {
  VACCINE_TYPES, VACCINE_KEYS,
  calculateExpirationDate, getComplianceStatus, getOverallCompliance
} from '../constants/immunizations'

function NurseImmunizationsPage() {
  const navigate = useNavigate()
  const { user, profile, loading, signOut } = useAuth()
  const [immunizations, setImmunizations] = useState([])
  const [editing, setEditing] = useState({}) // {vaccineType: {date, titer, file}}
  const [scanning, setScanning] = useState({}) // {vaccineType: boolean}

  useEffect(() => {
    if (!loading && (!user || !profile)) navigate('/signin')
    if (profile) loadImmunizations()
  }, [profile, loading])

  async function loadImmunizations() {
    const { data } = await supabase.from('nurse_immunizations').select('*').eq('nurse_id', profile.id)
    setImmunizations(data || [])
  }

  function setEditField(vt, field, value) {
    setEditing(prev => ({ ...prev, [vt]: { ...prev[vt], [field]: value } }))
  }

  async function uploadDocument(vaccineType, file) {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${vaccineType}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('immunizations').upload(path, file, { upsert: true })
    if (error) { alert('Upload failed: ' + error.message); return null }
    return path
  }

  async function save(vaccineType) {
    const edit = editing[vaccineType] || {}
    const existing = immunizations.find(i => i.vaccine_type === vaccineType)
    const administered = edit.administered_date || existing?.administered_date
    const titer = edit.titer_result !== undefined ? edit.titer_result : existing?.titer_result
    let docUrl = existing?.document_url

    if (edit.file) {
      docUrl = await uploadDocument(vaccineType, edit.file)
      if (!docUrl) return
    }

    const expDate = calculateExpirationDate(vaccineType, administered, titer)

    const payload = {
      nurse_id: profile.id,
      vaccine_type: vaccineType,
      administered_date: administered || null,
      titer_result: titer || null,
      expiration_date: expDate,
      document_url: docUrl || null,
      status: administered || docUrl ? 'verified' : 'pending_upload',
      updated_at: new Date().toISOString()
    }

    if (existing) {
      await supabase.from('nurse_immunizations').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('nurse_immunizations').insert(payload)
    }

    setEditing(prev => ({ ...prev, [vaccineType]: undefined }))
    loadImmunizations()
  }

  async function runAiScan(vaccineType) {
    const existing = immunizations.find(i => i.vaccine_type === vaccineType)
    if (!existing?.document_url) {
      alert('Upload a document first, then save, then run AI scan.')
      return
    }
    setScanning(prev => ({ ...prev, [vaccineType]: true }))
    try {
      const { data, error } = await supabase.functions.invoke('scan-immunization', {
        body: { immunizationId: existing.id, vaccineType, documentPath: existing.document_url }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      alert(`✓ AI scan complete!\n\nExtracted date: ${data.administered_date || 'not found'}\nTiter: ${data.titer_result || 'N/A'}\nConfidence: ${Math.round((data.confidence || 0) * 100)}%`)
      loadImmunizations()
    } catch (err) {
      alert('AI scan failed: ' + err.message)
    } finally {
      setScanning(prev => ({ ...prev, [vaccineType]: false }))
    }
  }

  async function deleteImmunization(vaccineType) {
    if (!confirm('Delete this immunization record?')) return
    const existing = immunizations.find(i => i.vaccine_type === vaccineType)
    if (existing) {
      await supabase.from('nurse_immunizations').delete().eq('id', existing.id)
      loadImmunizations()
    }
  }

  if (loading) return <div className="dashboard-loading">Loading...</div>
  if (!profile) return null

  const compliance = getOverallCompliance(immunizations)

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate('/nurse/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <button className="signout-btn" onClick={() => navigate('/nurse/dashboard')}><ArrowLeft size={16} /> Dashboard</button>
          <button className="signout-btn" onClick={signOut}><LogOut size={16} /> Sign Out</button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1B3A6B 0%, #0A7E8C 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <ShieldCheck size={48} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Immunizations</h1>
            <p style={{ margin: '0.3rem 0 0', opacity: 0.9 }}>
              Compliance: <strong>{compliance.compliant}/{compliance.total}</strong> ({compliance.percentage}%)
            </p>
          </div>
        </div>

        <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Keep your immunization records up to date. Upload documentation for each vaccine; you can run an AI scan to auto-extract dates and titer results.
        </p>

        {VACCINE_KEYS.map(vt => {
          const vaccine = VACCINE_TYPES[vt]
          const existing = immunizations.find(i => i.vaccine_type === vt)
          const status = getComplianceStatus(existing)
          const edit = editing[vt] || {}
          const isEditing = editing[vt] !== undefined

          return (
            <div key={vt} style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: '#1B3A6B', fontSize: '1.05rem' }}>{vaccine.label}</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>{vaccine.docTypes}</p>
                </div>
                <span style={{
                  background: status.color,
                  color: 'white',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  {status.emoji} {status.label}
                </span>
              </div>

              {!isEditing && existing && (
                <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                  {existing.administered_date && <div>📅 Administered: <strong>{new Date(existing.administered_date).toLocaleDateString()}</strong></div>}
                  {existing.titer_result && <div>🧪 Titer: <strong>{existing.titer_result}</strong></div>}
                  {existing.expiration_date && <div>⏱ Expires: <strong>{new Date(existing.expiration_date).toLocaleDateString()}</strong></div>}
                  {!existing.expiration_date && existing.administered_date && <div>♾ <em>No expiration (titer-based immunity)</em></div>}
                  {existing.document_url && <div style={{ color: '#0A7E8C' }}>📎 Document on file</div>}
                </div>
              )}

              {isEditing ? (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Date Administered</label>
                    <input type="date" value={edit.administered_date || existing?.administered_date || ''} onChange={e => setEditField(vt, 'administered_date', e.target.value)} />
                  </div>
                  {vaccine.requiresTiter && (
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Titer / Antibody Result</label>
                      <select value={edit.titer_result !== undefined ? edit.titer_result : (existing?.titer_result || '')} onChange={e => setEditField(vt, 'titer_result', e.target.value || null)}>
                        <option value="">— Not tested —</option>
                        <option value="positive">Positive (immune)</option>
                        <option value="negative">Negative (not immune)</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  )}
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Upload Document (PDF or Image)</label>
                    <input type="file" accept=".pdf,image/*" onChange={e => setEditField(vt, 'file', e.target.files[0])} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button className="primary-btn" onClick={() => save(vt)}><Save size={14} /> Save</button>
                    <button className="secondary-btn" onClick={() => setEditing(prev => ({ ...prev, [vt]: undefined }))}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button className="secondary-btn small-btn" onClick={() => setEditing(prev => ({ ...prev, [vt]: {} }))}>
                    <Upload size={14} /> {existing ? 'Update' : 'Add Record'}
                  </button>
                  {existing?.document_url && (
                    <button className="secondary-btn small-btn" onClick={() => runAiScan(vt)} disabled={scanning[vt]} style={{ background: '#FDF6E3', color: '#92400E', borderColor: '#FBBF24' }}>
                      <Sparkles size={14} /> {scanning[vt] ? 'Scanning…' : 'AI Scan'}
                    </button>
                  )}
                  {existing && (
                    <button className="deny-btn small-btn" onClick={() => deleteImmunization(vt)}><Trash2 size={14} /> Delete</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}

export default NurseImmunizationsPage