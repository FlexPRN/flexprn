// Address autocomplete + geocoding via Mapbox (free tier: 100k/month)

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia'
}

// Get autocomplete suggestions as user types
export async function searchAddresses(query) {
  if (!query || query.length < 3) return []
  if (!MAPBOX_TOKEN) {
    console.error('VITE_MAPBOX_TOKEN missing from .env.local')
    return []
  }

  const encoded = encodeURIComponent(query)

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?` +
      `access_token=${MAPBOX_TOKEN}&country=US&types=address,poi&limit=5&autocomplete=true`
    )

    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()

    return data.features.map(f => ({
      fullAddress: f.place_name,
      streetAddress: f.address ? `${f.address} ${f.text}` : f.text,
      placeText: f.text,
      latitude: f.center[1],
      longitude: f.center[0],
      context: f.context || []
    }))
  } catch (err) {
    console.error('Address search error:', err)
    return []
  }
}

// Extract city/state/zip from a Mapbox feature's context
export function parseAddressContext(suggestion) {
  const result = {
    streetAddress: suggestion.streetAddress || '',
    city: '',
    state: '',
    zip: ''
  }

  suggestion.context.forEach(ctx => {
    if (ctx.id.startsWith('place')) result.city = ctx.text
    else if (ctx.id.startsWith('region')) result.state = ctx.short_code?.replace('US-', '') || ctx.text
    else if (ctx.id.startsWith('postcode')) result.zip = ctx.text
  })

  return result
}

// ============================================
// FORWARD GEOCODING — for manually-entered addresses
// Tries: full address → ZIP → city+state → state alone
// Returns { latitude, longitude, accuracy } where accuracy = 'exact' | 'city' | 'state' | null
// ============================================
export async function forwardGeocode(streetAddress, city, state, zip) {
  if (!MAPBOX_TOKEN) {
    console.error('VITE_MAPBOX_TOKEN missing from .env.local')
    return { latitude: null, longitude: null, accuracy: null }
  }

  const stateUpper = state?.toUpperCase()
  const stateFullName = STATE_NAMES[stateUpper] || state

  console.log('🌍 Forward geocoding:', { streetAddress, city, state, zip })

  // Try 1: Full address with full state name (no type filter — let Mapbox decide)
  if (streetAddress && city && state) {
    const fullQuery = `${streetAddress}, ${city}, ${stateFullName} ${zip || ''}`.trim()
    const result = await tryGeocode(fullQuery, null)
    if (result) {
      console.log('✓ Geocoded at exact level')
      return { ...result, accuracy: 'exact' }
    }
  }

  // Try 2: ZIP code alone (very reliable for US)
  if (zip) {
    const result = await tryGeocode(zip, ['postcode'])
    if (result) {
      console.log('✓ Geocoded at ZIP level')
      return { ...result, accuracy: 'city' }
    }
  }

  // Try 3: City + State full name
  if (city && state) {
    const cityQuery = `${city}, ${stateFullName}`
    const result = await tryGeocode(cityQuery, ['place'])
    if (result) {
      console.log('✓ Geocoded at city level')
      return { ...result, accuracy: 'city' }
    }
  }

  // Try 4: State only (last resort, full name)
  if (state) {
    const result = await tryGeocode(stateFullName, ['region'])
    if (result) {
      console.log('✓ Geocoded at state level')
      return { ...result, accuracy: 'state' }
    }
  }

  console.error('✗ All geocoding attempts failed')
  return { latitude: null, longitude: null, accuracy: null }
}

async function tryGeocode(query, types) {
  if (!query) return null
  const encoded = encodeURIComponent(query)
  const typesParam = types && types.length > 0 ? `&types=${types.join(',')}` : ''
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=US${typesParam}&limit=1`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Geocode HTTP ${response.status} for: "${query}"`)
      return null
    }
    const data = await response.json()
    if (!data.features || data.features.length === 0) {
      console.log(`  No results for: "${query}"`)
      return null
    }

    const feature = data.features[0]
    return {
      latitude: feature.center[1],
      longitude: feature.center[0]
    }
  } catch (err) {
    console.error('Geocoding error:', err)
    return null
  }
}

// Calculate distance in meters between two GPS coordinates (Haversine)
export function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (deg) => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Get user's current GPS position
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support GPS. Use Chrome, Safari, or Firefox.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      (error) => {
        let message = 'Could not get your location. '
        if (error.code === 1) message += 'Please allow location access in your browser settings.'
        else if (error.code === 2) message += 'Location unavailable. Make sure GPS is enabled.'
        else if (error.code === 3) message += 'Location request timed out. Try again.'
        else message += error.message
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(2)}km`
}

// ============================================
// CLOCK-IN DISTANCE LIMITS by address verification accuracy
// ============================================
export const MAX_CLOCK_DISTANCE_METERS = 150
export const CLOCK_DISTANCE_CITY_LEVEL = 500
export const CLOCK_DISTANCE_STATE_LEVEL = 2000

export function getClockInRadius(accuracy) {
  if (accuracy === 'city') return CLOCK_DISTANCE_CITY_LEVEL
  if (accuracy === 'state') return CLOCK_DISTANCE_STATE_LEVEL
  return MAX_CLOCK_DISTANCE_METERS
}