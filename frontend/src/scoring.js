import { compass, estimateTravel, weatherText } from './data.js'

// Each option's hint explains in plain words what picking it does to the ranking
export const PREFERENCE_OPTIONS = {
  crowds: [
    { id: 'quiet', label: 'Quiet', hint: 'Emptier beaches rank higher' },
    { id: 'balanced', label: 'Normal', hint: 'A typical amount of people is fine' },
    { id: 'lively', label: 'Lively', hint: 'Busy, social beaches rank higher' },
  ],
  sun: [
    { id: 'low', label: 'Low', hint: 'UV 0-3: hazy or gentler sun' },
    { id: 'medium', label: 'Medium', hint: 'UV 4-6: sunny, but not the harshest' },
    { id: 'high', label: 'High', hint: 'UV 7+: strong sun. Sunscreen and shade still matter' },
  ],
  swimming: [
    { id: 'none', label: 'Staying dry', hint: 'Water conditions barely affect the score' },
    { id: 'wading', label: 'Wading', hint: 'Rip currents and bacteria count' },
    { id: 'swimming', label: 'Swimming', hint: 'Rip currents, bacteria and cold water count most' },
  ],
  waves: [
    { id: 'calm', label: 'Calm', hint: 'Under 1 ft, flat and easy' },
    { id: 'some', label: 'Some', hint: 'About 1-3 ft, fun to splash in' },
    { id: 'big', label: 'Big', hint: '3 ft and up, good for boogie boarding' },
  ],
}

export const DEFAULT_PREFS = { crowds: 'quiet', sun: 'low', swimming: 'swimming', waves: 'calm' }

// Older saved preferences used different options; map them over and fill in anything missing
const OLD_PREFS = {
  sun: { balanced: 'medium', seeking: 'high' },
  swimming: { gentle: 'swimming', confident: 'swimming' },
}

export function normalizePrefs(saved) {
  const prefs = { ...DEFAULT_PREFS }
  if (saved?.swimming === 'confident' && !saved.waves) prefs.waves = 'some'
  for (const key of Object.keys(PREFERENCE_OPTIONS)) {
    const value = OLD_PREFS[key]?.[saved?.[key]] ?? saved?.[key]
    if (PREFERENCE_OPTIONS[key].some((o) => o.id === value)) prefs[key] = value
  }
  return prefs
}

export const FACTORS = [
  { id: 'swimming', label: 'Water', weight: 0.35 },
  { id: 'crowds', label: 'Crowds', weight: 0.25 },
  { id: 'uv', label: 'UV comfort', weight: 0.15 },
  { id: 'weather', label: 'Weather', weight: 0.15 },
  { id: 'travel', label: 'Travel', weight: 0.1 },
]

// NWS alerts that mean "stay out of the water"
const WATER_ALERTS = /rip current|beach hazards|high surf|coastal flood|storm surge|hurricane|tropical storm/i
// NWS alerts that make the whole beach day a bad idea
const DAY_ALERTS = /warning|hurricane|tropical storm|tornado|extreme heat/i

const IDEAL_UV = { low: 2, medium: 5, high: 8 }
const IDEAL_CROWD = { quiet: 0, balanced: 0.45, lively: 0.8 }

// How much each water hazard costs, by how much time you'll spend in the water
const WATER_HAZARDS = {
  none: { rip: { High: 10 }, bacteria: {}, cold: 0, alert: 10 },
  wading: { rip: { Moderate: 8, High: 35 }, bacteria: { Medium: 10, High: 35 }, cold: 8, alert: 25 },
  swimming: { rip: { Moderate: 15, High: 50 }, bacteria: { Medium: 15, High: 45 }, cold: 15, alert: 30 },
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
const avg = (values) => {
  const v = values.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i)

function crowdLabel(level) {
  if (level < 0.3) return 'Quiet'
  if (level < 0.55) return 'Moderate'
  return 'Busy'
}

function ripRisk(beach, waves, alerts) {
  const official = beach.surf?.forecast?.rip_risk
  if (official) {
    const level = ['High', 'Moderate', 'Low'].find((l) => official.startsWith(l)) || official
    return {
      level,
      kind: 'official',
      source: `NWS ${beach.surf.office_name} Surf Zone Forecast`,
      issued: beach.surf.issued,
      url: beach.surf.url,
    }
  }
  const ripAlert = alerts.find((a) => /rip current|beach hazards/i.test(a.event))
  if (ripAlert) {
    return { level: 'High', kind: 'official', source: `NWS ${ripAlert.event}`, issued: ripAlert.onset, url: ripAlert.url }
  }
  if (beach.bay) {
    return { level: 'Low', kind: 'estimate', source: 'Bay beach: not covered by NWS surf forecasts' }
  }
  const index = waves.ft + (waves.period >= 8 ? 1 : 0)
  return {
    level: index < 2.5 ? 'Low' : index < 4 ? 'Moderate' : 'High',
    kind: 'estimate',
    source: beach.surf
      ? 'No NWS rip forecast this far out; estimated from waves'
      : 'NWS isn\'t issuing a surf forecast here right now; estimated from waves',
  }
}

// Boil the hourly data down to what matters for one time window at the beach, keeping track of
// where every number came from
export function summarize(beach, timeWindow, isToday) {
  const h = beach.hourly
  const hours = range(timeWindow.start, timeWindow.end)
  const pick = (series) => hours.map((i) => series[i])
  const obs = isToday ? beach.observed : null
  const nws = beach.surf?.forecast

  const codes = pick(h.weather_code)
  const worstCode = Math.max(...codes)
  const uvs = pick(h.uv)

  const modelWave = avg(pick(h.wave_ft)) ?? 0
  const waves = obs?.waves
    ? { ft: obs.waves.wave_ft, period: obs.waves.period_s, kind: 'measured', source: `NDBC buoy ${obs.waves.station}`, time: obs.waves.time, url: obs.waves.url }
    : { ft: Math.round(modelWave * 10) / 10, period: avg(pick(h.wave_period_s)) ?? 0, kind: 'forecast', source: beach.bay ? 'Open-Meteo marine model (bay-adjusted)' : 'Open-Meteo marine model' }

  const water = obs?.water
    ? { f: Math.round(obs.water.f), kind: 'measured', source: `NOAA station ${obs.station}`, time: obs.water.time, url: obs.station_url }
    : { f: Math.round(avg(pick(h.water_f)) ?? 0), kind: 'forecast', source: 'Open-Meteo marine model' }

  const modelWind = Math.round(avg(pick(h.wind_mph)))
  const wind = obs?.wind
    ? { mph: obs.wind.mph, gust: obs.wind.gust_mph, dir: obs.wind.direction, kind: 'measured', source: `NOAA station ${obs.station}`, time: obs.wind.time, url: obs.station_url }
    : { mph: modelWind, dir: compass(avg(pick(h.wind_dir)) ?? 0), kind: 'forecast', source: 'Open-Meteo forecast' }

  const crowd = avg(pick(h.crowd))
  const crowdPeakHour = hours.reduce((best, i) => (h.crowd[i] > h.crowd[best] ? i : best), hours[0])

  const tides = beach.tides
  const startTime = `${String(timeWindow.start).padStart(2, '0')}:00`
  const tide = tides && {
    height: tides.hourly[timeWindow.start],
    rising: tides.hourly[timeWindow.start + 1] > tides.hourly[timeWindow.start],
    next: tides.extremes.find((e) => e.time > startTime),
    station: tides.station,
    url: tides.url,
  }

  const alerts = beach.alerts || []
  const nwsThunder = nws?.thunder && !/^none/i.test(nws.thunder)

  return {
    tempF: Math.round(avg(pick(h.temp_f))),
    condition: weatherText(worstCode >= 61 ? worstCode : Math.round(avg(codes))),
    thunder: codes.some((c) => c >= 95) || nwsThunder,
    rainChance: Math.max(...pick(h.rain_chance).map((v) => v ?? 0)),
    peakUv: Math.max(...uvs),
    highUvHour: hours.find((i) => h.uv[i] >= 6),
    waves,
    water,
    wind,
    rip: ripRisk(beach, waves, alerts),
    surfHeight: nws?.surf_height,
    crowd,
    crowdLabel: crowdLabel(crowd),
    crowdPeakHour,
    tide,
    alerts,
    waterQuality: beach.water_quality,
    sun: beach.sun,
  }
}

export function scoreParts(m, prefs, minutes) {
  // Water: how well the waves match what you want, minus hazards that matter more the more you're in the water
  const ft = m.waves.ft
  const waveMiss = {
    calm: Math.max(0, ft - 1) * 30,
    some: Math.max(0, 1 - ft) * 25 + Math.max(0, ft - 3) * 25,
    big: Math.max(0, 3 - ft) * 25 + Math.max(0, ft - 7) * 15,
  }[prefs.waves]
  const hazards = WATER_HAZARDS[prefs.swimming]
  let swimming = 100 - waveMiss * (prefs.swimming === 'none' ? 0.5 : 1)
  swimming -= hazards.rip[m.rip.level] ?? 0
  swimming -= hazards.bacteria[m.waterQuality?.level] ?? 0
  if (m.water.f < 70) swimming -= hazards.cold
  if (m.alerts.some((a) => WATER_ALERTS.test(a.event))) swimming -= hazards.alert

  const crowds = 100 - Math.abs(m.crowd - IDEAL_CROWD[prefs.crowds]) * 120
  const uv = 100 - Math.abs(m.peakUv - IDEAL_UV[prefs.sun]) * 12

  let weather = 100 - m.rainChance * 0.8
  weather -= Math.max(0, 72 - m.tempF) * 3 + Math.max(0, m.tempF - 96) * 3
  weather -= Math.max(0, m.wind.mph - 18) * 2
  if (m.thunder) weather -= 30
  if (m.alerts.some((a) => DAY_ALERTS.test(a.event))) weather -= 40

  const travel = 100 - minutes / 3

  return { swimming: clamp(swimming), crowds: clamp(crowds), uv: clamp(uv), weather: clamp(weather), travel: clamp(travel) }
}

export function totalScore(parts) {
  return clamp(FACTORS.reduce((sum, f) => sum + parts[f.id] * f.weight, 0))
}

// great / mixed / poor, used for labels and the map pin colors
export function fitTone(score) {
  if (score >= 75) return 'great'
  if (score >= 60) return 'mixed'
  return 'poor'
}

export function fitLabel(score) {
  return { great: 'Great fit', mixed: 'Mixed fit', poor: 'Poor fit' }[fitTone(score)]
}

export function rankBeaches(beaches, prefs, timeWindow, origin, routes, isToday) {
  return beaches
    .map((beach) => {
      const metrics = summarize(beach, timeWindow, isToday)
      const travel = routes?.[beach.id] || estimateTravel(origin, beach)
      const parts = scoreParts(metrics, prefs, travel.minutes)
      return { ...beach, metrics, travel, parts, score: totalScore(parts) }
    })
    .sort((a, b) => b.score - a.score)
}

// Most important first. Every entry is shown regardless of the score.
export function safetyNotes(m, prefs) {
  const notes = []
  for (const a of m.alerts) notes.push({ level: /warning/i.test(a.event) ? 'danger' : 'warn', text: a.headline || a.event })
  if (m.rip.level === 'High' && !m.alerts.some((a) => /rip current/i.test(a.event)))
    notes.push({ level: 'danger', text: 'High rip current risk. Stay out of the water or swim only near a lifeguard.' })
  else if (m.rip.level === 'Moderate' && prefs.swimming !== 'none')
    notes.push({ level: 'warn', text: 'Moderate rip current risk. Swim near a lifeguard and check posted flags.' })
  if (m.waterQuality?.level === 'High')
    notes.push({ level: 'danger', text: `Bacteria advisory: swimming not recommended near ${m.waterQuality.name}.` })
  else if (m.waterQuality?.level === 'Medium')
    notes.push({ level: 'warn', text: `Elevated bacteria near ${m.waterQuality.name}. Avoid swallowing water; skip it with open cuts.` })
  if (m.thunder) notes.push({ level: 'warn', text: 'Thunderstorms possible. Leave the beach if you hear thunder.' })
  if (m.peakUv >= 8) notes.push({ level: 'warn', text: 'Very high UV. Unprotected skin can burn in under 15 minutes.' })
  if (!notes.length && prefs.swimming !== 'none')
    notes.push({ level: 'info', text: 'Low risk is not no risk. Swim near a lifeguard and check posted flags before entering the water.' })
  return notes
}
