// Address autocomplete + geocoding via Mapbox (free tier: 100k/month)

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

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

export const MAX_CLOCK_DISTANCE_METERS = 150