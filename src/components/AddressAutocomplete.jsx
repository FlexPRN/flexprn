import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, Edit3, AlertCircle, Loader2 } from 'lucide-react'
import { searchAddresses, parseAddressContext, forwardGeocode } from '../utils/geo'

/**
 * AddressAutocomplete
 * Two modes:
 *   1. SEARCH mode (default) — Mapbox autocomplete dropdown
 *   2. MANUAL mode — fallback when user can't find their address
 *
 * Calls onSelect({ streetAddress, city, state, zip, latitude, longitude, accuracy })
 * where accuracy is 'exact' | 'city' | 'state'
 */
function AddressAutocomplete({ onSelect, placeholder = 'Start typing your address...' }) {
  const [mode, setMode] = useState('search')          // 'search' | 'manual'
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchedYet, setSearchedYet] = useState(false)
  const [searchCount, setSearchCount] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState('')

  const [manual, setManual] = useState({
    streetAddress: '',
    city: '',
    state: '',
    zip: ''
  })

  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // ===== SEARCH mode: debounced Mapbox lookup =====
  useEffect(() => {
    if (mode !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(query)
      setSuggestions(results)
      setSearching(false)
      setSearchedYet(true)
      setShowSuggestions(true)
      setSearchCount(prev => prev + 1)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, mode])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectSuggestion(suggestion) {
    const parsed = parseAddressContext(suggestion)
    onSelect({
      streetAddress: parsed.streetAddress,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      accuracy: 'exact'
    })
    setQuery(suggestion.fullAddress)
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setManualError('')

    if (!manual.streetAddress || !manual.city || !manual.state) {
      setManualError('Please fill in street address, city, and state at minimum.')
      return
    }

    setManualSubmitting(true)
    const result = await forwardGeocode(manual.streetAddress, manual.city, manual.state, manual.zip)
    setManualSubmitting(false)

    if (!result.latitude || !result.longitude) {
      setManualError('Could not locate this address on the map. Please double-check spelling, or try searching above.')
      return
    }

    onSelect({
      streetAddress: manual.streetAddress,
      city: manual.city,
      state: manual.state,
      zip: manual.zip,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy
    })
  }

  // ====== RENDER ======
  if (mode === 'manual') {
    return (
      <div style={{ background: '#FEF9F0', border: '2px solid #FBBF24', borderRadius: '10px', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#92400E' }}>
          <Edit3 size={18} />
          <strong>Manual Address Entry</strong>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#92400E', marginTop: 0, marginBottom: '1rem' }}>
          Enter your address manually. We'll try to verify GPS coordinates from city/zip.
          Note: clock-in geofence will be wider for non-verified addresses.
        </p>

        <div className="form-field">
          <label>Street Address *</label>
          <input
            type="text"
            placeholder="e.g., 768 KY-1054"
            value={manual.streetAddress}
            onChange={(e) => setManual({ ...manual, streetAddress: e.target.value })}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>City *</label>
            <input
              type="text"
              value={manual.city}
              onChange={(e) => setManual({ ...manual, city: e.target.value })}
              required
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>State *</label>
            <input
              type="text"
              maxLength={2}
              placeholder="KY"
              value={manual.state}
              onChange={(e) => setManual({ ...manual, state: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>ZIP</label>
            <input
              type="text"
              value={manual.zip}
              onChange={(e) => setManual({ ...manual, zip: e.target.value })}
            />
          </div>
        </div>

        {manualError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {manualError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={handleManualSubmit}
            disabled={manualSubmitting}
          >
            {manualSubmitting ? (
              <><Loader2 size={16} className="spin" /> Verifying...</>
            ) : (
              'Save Address'
            )}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setMode('search'); setManualError('') }}
          >
            Back to search
          </button>
        </div>
      </div>
    )
  }

  // ===== SEARCH mode UI =====
  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={18}
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}
        />
        {searching && (
          <Loader2
            size={18}
            className="spin"
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#0A7E8C' }}
          />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          marginTop: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 10,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F1F5F9' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <MapPin size={16} style={{ color: '#0A7E8C', flexShrink: 0, marginTop: '2px' }} />
              <span>{s.fullAddress}</span>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && !searching && searchedYet && suggestions.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          marginTop: '4px',
          padding: '0.75rem 1rem',
          color: '#64748B',
          fontSize: '0.9rem',
          zIndex: 10
        }}>
          No matches found. Try a different format or partial address.
        </div>
      )}

      {/* Manual entry fallback link — appears after 2+ failed searches OR always after first search */}
      {searchedYet && (
        <div style={{ marginTop: '0.6rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setMode('manual'); setShowSuggestions(false) }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0A7E8C',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            Can't find your address? Enter it manually →
          </button>
        </div>
      )}

      {/* CSS for the spinner */}
      <style>{`
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default AddressAutocomplete