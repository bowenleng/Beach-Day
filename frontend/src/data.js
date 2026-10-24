// Set VITE_API_URL when the backend isn't running on this machine
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const ORIGINS = [
  { id: 'houston', name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { id: 'austin', name: 'Austin', lat: 30.2672, lon: -97.7431 },
  { id: 'san-antonio', name: 'San Antonio', lat: 29.4241, lon: -98.4936 },
  { id: 'dallas', name: 'Dallas', lat: 32.7767, lon: -96.797 },
  { id: 'corpus-christi', name: 'Corpus Christi', lat: 27.8006, lon: -97.3964 },
  { id: 'mcallen', name: 'McAllen', lat: 26.2034, lon: -98.23 },
  { id: 'brownsville', name: 'Brownsville', lat: 25.9017, lon: -97.4975 },
  { id: 'galveston', name: 'Galveston', lat: 29.3013, lon: -94.7977 },
  { id: 'college-station', name: 'College Station', lat: 30.60139, lon: -96.31444 },
]

export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', start: 8, end: 12 },
  { id: 'midday', label: 'Midday', start: 10, end: 15 },
  { id: 'afternoon', label: 'Afternoon', start: 12, end: 17 },
  { id: 'evening', label: 'Late day', start: 15, end: 19 },
  { id: 'full', label: 'Full day', start: 9, end: 18 },
]

// How each number on the page was produced, from most to least trustworthy
export const SOURCE_KINDS = {
  measured: { label: 'Measured', hint: 'Live reading from a sensor or buoy' },
  official: { label: 'Official', hint: 'Forecast or warning issued by the National Weather Service' },
  sampled: { label: 'Lab sample', hint: 'Water sample tested by the Texas Beach Watch program' },
  forecast: { label: 'Forecast', hint: 'Computer weather model forecast' },
  route: { label: 'Road route', hint: 'Driving route on real roads' },
  estimate: { label: 'Estimate', hint: 'Rough estimate, not live data' },
}

export function formatHour(hour) {
  const h = hour % 12 || 12
  return `${h}:00 ${hour < 12 ? 'am' : 'pm'}`
}

export function shortHour(hour) {
  return `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`
}

// "14:36" or "2026-10-24 14:36" -> "2:36 pm"
export function formatClock(time) {
  const [h, m] = time.slice(-5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// "2026-10-24" -> a local Date at noon (avoids time zone shifts when formatting)
export function parseDay(iso) {
  return new Date(`${iso}T12:00`)
}

export function formatDay(iso) {
  return parseDay(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function shortDate(iso) {
  return parseDay(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ISO timestamp -> "12 min ago" / "3 hr ago" / "Oct 21"
export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

// Straight-line distance padded for roads, at highway-ish speeds. Only used if the backend can't route.
export function estimateTravel(origin, beach) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(beach.lat - origin.lat)
  const dLon = toRad(beach.lon - origin.lon)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(origin.lat)) * Math.cos(toRad(beach.lat)) * Math.sin(dLon / 2) ** 2
  const miles = 3959 * 2 * Math.asin(Math.sqrt(a)) * 1.25
  return { miles: Math.round(miles), minutes: Math.round(10 + (miles / 55) * 60), source: 'estimate' }
}

// Degrees -> "SE"
export function compass(degrees) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return points[Math.round(((degrees % 360) + 360) % 360 / 45) % 8]
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
