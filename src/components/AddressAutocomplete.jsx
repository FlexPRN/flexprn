import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader } from 'lucide-react'
import { searchAddresses, parseAddressContext } from '../utils/geo'

function AddressAutocomplete({ onSelect, placeholder = 'Start typing your facility address...' }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const timeoutRef = useRef(null)
  const containerRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounce search - wait 300ms after user stops typing
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (query.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchAddresses(query)
      setSuggestions(results)
      setShowDropdown(true)
      setLoading(false)
      setHighlightIndex(-1)
    }, 300)

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  function handleSelect(suggestion) {
    const parsed = parseAddressContext(suggestion)
    onSelect({
      ...parsed,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      fullDisplay: suggestion.fullAddress
    })
    setQuery(suggestion.fullAddress)
    setShowDropdown(false)
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div className="address-autocomplete" ref={containerRef}>
      <div className="autocomplete-input-wrap">
        <Search size={18} className="autocomplete-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="autocomplete-input"
          autoComplete="off"
        />
        {loading && <Loader size={16} className="autocomplete-loader" />}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`autocomplete-item ${i === highlightIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <MapPin size={16} className="autocomplete-item-icon" />
              <div className="autocomplete-item-text">
                <strong>{s.placeText}</strong>
                <span>{s.fullAddress.replace(s.placeText + ', ', '')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && !loading && query.length >= 3 && suggestions.length === 0 && (
        <div className="autocomplete-dropdown">
          <div className="autocomplete-empty">
            No matches found. Try a different format or partial address.
          </div>
        </div>
      )}
    </div>
  )
}

export default AddressAutocomplete