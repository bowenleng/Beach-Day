export const API_URL = 'http://127.0.0.1:8000'

export const FORECAST_DAYS = 7

export const ORIGINS = [
  { id: 'houston', name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { id: 'austin', name: 'Austin', lat: 30.2672, lon: -97.7431 },
  { id: 'san-antonio', name: 'San Antonio', lat: 29.4241, lon: -98.4936 },
  { id: 'dallas', name: 'Dallas', lat: 32.7767, lon: -96.797 },
  { id: 'corpus-christi', name: 'Corpus Christi', lat: 27.8006, lon: -97.3964 },
  { id: 'mcallen', name: 'McAllen', lat: 26.2034, lon: -98.23 },
  { id: 'brownsville', name: 'Brownsville', lat: 25.9017, lon: -97.4975 },
  { id: 'galveston', name: 'Galveston', lat: 29.3013, lon: -94.7977 },
]

export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', start: 8, end: 12 },
  { id: 'midday', label: 'Midday', start: 10, end: 15 },
  { id: 'afternoon', label: 'Afternoon', start: 12, end: 17 },
  { id: 'evening', label: 'Late day', start: 15, end: 19 },
  { id: 'full', label: 'Full day', start: 9, end: 18 },
]

export function formatHour(hour) {
  const h = hour % 12 || 12
  return `${h}:00 ${hour < 12 ? 'am' : 'pm'}`
}

export function shortHour(hour) {
  return `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`
}

// "14:36" -> "2:36 pm"
export function formatClock(time) {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export function forecastDays() {
  const today = new Date()
  return Array.from({ length: FORECAST_DAYS }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { iso, index: i, date: d }
  })
}

export function formatDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Straight-line distance padded for roads, at highway-ish speeds. Illustrative only.
export function travelFrom(origin, beach) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(beach.lat - origin.lat)
  const dLon = toRad(beach.lon - origin.lon)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(origin.lat)) * Math.cos(toRad(beach.lat)) * Math.sin(dLon / 2) ** 2
  const straightMiles = 3959 * 2 * Math.asin(Math.sqrt(a))
  const miles = straightMiles * 1.25
  const minutes = Math.round(10 + (miles / 55) * 60)
  return { miles: Math.round(miles), minutes }
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

// WMO weather codes used by Open-Meteo
export function weatherText(code) {
  if (code === 0) return 'Sunny'
  if (code === 1) return 'Mostly sunny'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Foggy'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed'
}
