import { travelFrom, weatherText } from './data.js'

export const PREFERENCE_OPTIONS = {
  crowds: [
    { id: 'quiet', label: 'Quiet' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'lively', label: 'Lively' },
  ],
  sun: [
    { id: 'low', label: 'Low UV' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'seeking', label: 'Sun-seeking' },
  ],
  swimming: [
    { id: 'none', label: 'Not swimming' },
    { id: 'gentle', label: 'Gentle' },
    { id: 'confident', label: 'Confident' },
  ],
}

export const DEFAULT_PREFS = { crowds: 'quiet', sun: 'low', swimming: 'gentle' }

export const FACTORS = [
  { id: 'swimming', label: 'Swimming', weight: 0.35 },
  { id: 'crowds', label: 'Crowds', weight: 0.25 },
  { id: 'uv', label: 'UV comfort', weight: 0.15 },
  { id: 'weather', label: 'Weather', weight: 0.15 },
  { id: 'travel', label: 'Travel', weight: 0.1 },
]

const IDEAL_UV = { low: 2, balanced: 5, seeking: 8 }
const IDEAL_CROWD = { quiet: 0, balanced: 0.45, lively: 0.8 }

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
const avg = (values) => {
  const v = values.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i)

function ripRisk(waveFt, periodS, bay) {
  if (bay) return 'Low'
  const index = waveFt + (periodS >= 8 ? 1 : 0)
  if (index < 2.5) return 'Low'
  if (index < 4) return 'Moderate'
  return 'High'
}

function crowdLabel(level) {
  if (level < 0.3) return 'Quiet'
  if (level < 0.55) return 'Moderate'
  return 'Busy'
}

// Boil the hourly forecast down to what matters for one time window at the beach
export function summarize(beach, timeWindow) {
  const h = beach.hourly
  const hours = range(timeWindow.start, timeWindow.end)
  const pick = (series) => hours.map((i) => series[i])

  const codes = pick(h.weather_code)
  const worstCode = Math.max(...codes)
  const waveFt = avg(pick(h.wave_ft)) ?? 0
  const periodS = avg(pick(h.wave_period_s)) ?? 0
  const crowd = avg(pick(h.crowd))
  const crowdPeakHour = hours.reduce((best, i) => (h.crowd[i] > h.crowd[best] ? i : best), hours[0])
  const uvs = pick(h.uv)
  const highUvHour = hours.find((i) => h.uv[i] >= 6)

  const tideNow = beach.tides.hourly[timeWindow.start]
  const tideNext = beach.tides.hourly[timeWindow.start + 1]
  const startTime = `${String(timeWindow.start).padStart(2, '0')}:00`
  const nextExtreme = beach.tides.extremes.find((e) => e.time > startTime)

  return {
    tempF: Math.round(avg(pick(h.temp_f))),
    condition: weatherText(worstCode >= 61 ? worstCode : Math.round(avg(codes))),
    thunder: codes.some((c) => c >= 95),
    rainChance: Math.max(...pick(h.rain_chance).map((v) => v ?? 0)),
    windMph: Math.round(avg(pick(h.wind_mph))),
    peakUv: Math.max(...uvs),
    highUvHour,
    waveFt: Math.round(waveFt * 10) / 10,
    ripRisk: ripRisk(waveFt, periodS, beach.bay),
    waterF: Math.round(avg(pick(h.water_f))),
    crowd,
    crowdLabel: crowdLabel(crowd),
    crowdPeakHour,
    tide: tideNow != null ? { height: tideNow, rising: tideNext > tideNow, next: nextExtreme } : null,
  }
}

export function scoreParts(m, prefs, minutes) {
  let swimming
  if (prefs.swimming === 'none') {
    swimming = 100 - Math.max(0, m.waveFt - 5) * 5
  } else if (prefs.swimming === 'gentle') {
    swimming = 100 - Math.max(0, m.waveFt - 1.5) * 30
    swimming -= { Low: 0, Moderate: 15, High: 40 }[m.ripRisk]
    if (m.waterF < 70) swimming -= 15
  } else {
    swimming = 100 - Math.max(0, m.waveFt - 4) * 25
    swimming -= { Low: 0, Moderate: 5, High: 25 }[m.ripRisk]
    if (m.waterF < 66) swimming -= 10
  }

  const crowds = 100 - Math.abs(m.crowd - IDEAL_CROWD[prefs.crowds]) * 120
  const uv = 100 - Math.abs(m.peakUv - IDEAL_UV[prefs.sun]) * 12

  let weather = 100 - m.rainChance * 0.8
  weather -= Math.max(0, 72 - m.tempF) * 3 + Math.max(0, m.tempF - 96) * 3
  weather -= Math.max(0, m.windMph - 18) * 2
  if (m.thunder) weather -= 30

  const travel = 100 - minutes / 3

  return { swimming: clamp(swimming), crowds: clamp(crowds), uv: clamp(uv), weather: clamp(weather), travel: clamp(travel) }
}

export function totalScore(parts) {
  return clamp(FACTORS.reduce((sum, f) => sum + parts[f.id] * f.weight, 0))
}

export function fitLabel(score) {
  if (score >= 80) return 'Great fit'
  if (score >= 60) return 'Mixed fit'
  return 'Poor fit'
}

export function rankBeaches(beaches, prefs, timeWindow, origin) {
  return beaches
    .map((beach) => {
      const metrics = summarize(beach, timeWindow)
      const travel = travelFrom(origin, beach)
      const parts = scoreParts(metrics, prefs, travel.minutes)
      return { ...beach, metrics, travel, parts, score: totalScore(parts) }
    })
    .sort((a, b) => b.score - a.score)
}

export function safetyNotes(m, prefs) {
  const notes = []
  if (m.thunder) notes.push('Thunderstorms possible. Leave the beach if you hear thunder.')
  if (m.ripRisk === 'High') notes.push('High rip current risk. Stay out of the water or swim only near a lifeguard.')
  else if (m.ripRisk === 'Moderate' && prefs.swimming !== 'none')
    notes.push('Moderate rip current risk. Swim near a lifeguard and check posted flags.')
  if (m.peakUv >= 8) notes.push('Very high UV. Unprotected skin can burn in under 15 minutes.')
  if (!notes.length && prefs.swimming !== 'none')
    notes.push('Low risk is not no risk. Swim near a lifeguard and check posted conditions before entering the water.')
  return notes
}
