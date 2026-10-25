import { compass, estimateTravel, formatDuration, shortHour, weatherText } from './data.js'

// `title` is only shown on hover, for choices whose label alone could be unclear
export const PREFERENCE_OPTIONS = {
  crowds: [
    { id: 'quiet', label: 'Quiet' },
    { id: 'balanced', label: 'Normal' },
    { id: 'lively', label: 'Lively' },
  ],
  sun: [
    { id: 'low', label: 'Gentle', title: 'UV 0-3' },
    { id: 'medium', label: 'Sunny', title: 'UV 4-6' },
    { id: 'high', label: 'Strong', title: 'UV 7 and up' },
  ],
  swimming: [
    { id: 'none', label: 'Staying dry' },
    { id: 'wading', label: 'Wading' },
    { id: 'swimming', label: 'Swimming' },
  ],
  waves: [
    { id: 'calm', label: 'Calm', title: 'Under 1 ft' },
    { id: 'some', label: 'Some', title: 'About 1-3 ft' },
    { id: 'big', label: 'Big', title: '3 ft and up' },
  ],
  drive: [
    { id: '1', label: '1 hour', minutes: 60 },
    { id: '2', label: '2 hours', minutes: 120 },
    { id: '3', label: '3 hours', minutes: 180 },
    { id: 'any', label: 'any distance', minutes: Infinity },
  ],
}

export const DEFAULT_PREFS = { crowds: 'quiet', sun: 'low', swimming: 'swimming', waves: 'calm', drive: '3' }

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

const DRIVE_GRACE = 10
export const driveLimit = (prefs) => PREFERENCE_OPTIONS.drive.find((o) => o.id === prefs.drive).minutes

// Internal weights. The UI explains the score in words instead of showing these.
const FACTORS = [
  { id: 'water', weight: 0.3 },
  { id: 'crowds', weight: 0.2 },
  { id: 'sun', weight: 0.15 },
  { id: 'weather', weight: 0.15 },
  { id: 'travel', weight: 0.2 },
]

// NWS alerts that mean "stay out of the water"
const WATER_ALERTS = /rip current|beach hazards|high surf|coastal flood|storm surge|hurricane|tropical storm/i
// NWS alerts that make the whole beach day a bad idea
const DAY_ALERTS = /warning|hurricane|tropical storm|tornado|extreme heat/i
// NWS alerts serious enough that the water is effectively closed
const CLOSED_ALERTS = /hurricane|tropical storm warning|storm surge/i

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

// --- Time windows ---------------------------------------------------------------------------------

// The part of a window still ahead of you. nowHour is the current coast hour (e.g. 13.5) when the
// day is today, otherwise null.
export function remainingWindow(timeWindow, nowHour) {
  if (nowHour == null || nowHour <= timeWindow.start) return { ...timeWindow, live: false }
  return { ...timeWindow, start: Math.min(timeWindow.end, Math.ceil(nowHour)), live: true }
}

// A window is worth planning if at least two hours of it are left
export const windowViable = (timeWindow, nowHour) => nowHour == null || timeWindow.end - nowHour >= 2

// --- Conditions -----------------------------------------------------------------------------------

function crowdLabel(level) {
  if (level < 0.3) return 'Quiet'
  if (level < 0.55) return 'Moderate'
  return 'Busy'
}

// "3 to 4 feet" -> "3–4 ft"; 1.3 -> "1–2 ft"
export function waveText(waves) {
  if (waves.nws) {
    const nums = waves.nws.match(/\d+/g)
    if (nums) return nums.length > 1 ? `${nums[0]}–${nums[1]} ft` : `${nums[0]} ft`
  }
  if (waves.ft < 1) return 'Under 1 ft'
  const lo = Math.floor(waves.ft)
  return `${lo}–${lo + 1} ft`
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

// Boil the hourly forecast down to one time window at the beach, keeping track of where every
// number came from. Live sensor readings never replace the forecast; while the window is under
// way they ride along in `live` so the page can show them next to it.
export function summarize(beach, timeWindow) {
  const h = beach.hourly
  const hours = range(timeWindow.start, Math.max(timeWindow.end, timeWindow.start + 1))
  const pick = (series) => hours.map((i) => series[i])
  const nws = beach.surf?.forecast

  const codes = pick(h.weather_code)
  const worstCode = Math.max(...codes)
  const uvs = pick(h.uv)

  const waves = {
    ft: Math.round((avg(pick(h.wave_ft)) ?? 0) * 10) / 10,
    period: avg(pick(h.wave_period_s)) ?? 0,
    nws: nws?.surf_height,
    kind: nws?.surf_height ? 'official' : 'forecast',
    source: nws?.surf_height
      ? `NWS ${beach.surf.office_name} Surf Zone Forecast`
      : beach.bay ? 'Open-Meteo marine model (bay-adjusted)' : 'Open-Meteo marine model',
  }
  const water = { f: Math.round(avg(pick(h.water_f)) ?? 0), kind: 'forecast', source: 'Open-Meteo marine model' }
  const wind = {
    mph: Math.round(avg(pick(h.wind_mph))),
    dir: compass(avg(pick(h.wind_dir)) ?? 0),
    kind: 'forecast',
    source: 'Open-Meteo forecast',
  }

  const obs = timeWindow.live ? beach.observed : null
  const live = obs && {
    water: obs.water && { f: Math.round(obs.water.f), time: obs.water.time, source: `NOAA station ${obs.station}`, url: obs.station_url },
    wind: obs.wind && { mph: obs.wind.mph, gust: obs.wind.gust_mph, dir: obs.wind.direction, time: obs.wind.time, source: `NOAA station ${obs.station}`, url: obs.station_url },
    waves: obs.waves && { ft: obs.waves.wave_ft, time: obs.waves.time, source: `NDBC buoy ${obs.waves.station}`, url: obs.waves.url },
  }

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
    hours: { start: timeWindow.start, end: timeWindow.end },
    tempF: Math.round(avg(pick(h.temp_f))),
    condition: weatherText(worstCode >= 61 ? worstCode : Math.round(avg(codes))),
    thunder: codes.some((c) => c >= 95) || nwsThunder,
    rainChance: Math.max(...pick(h.rain_chance).map((v) => v ?? 0)),
    peakUv: Math.round(Math.max(...uvs)),
    highUvHour: hours.find((i) => h.uv[i] >= 6),
    waves,
    water,
    wind,
    live,
    rip: ripRisk(beach, waves, alerts),
    crowd,
    crowdLabel: crowdLabel(crowd),
    crowdPeakHour,
    tide,
    alerts,
    waterQuality: beach.water_quality,
    sun: beach.sun,
  }
}

// --- Lifeguard flags ------------------------------------------------------------------------------
// The flag colors are the app's status colors and are used for nothing else.

export const FLAGS = {
  green: { label: 'Low hazard', text: 'Calm conditions, still swim with care' },
  yellow: { label: 'Medium hazard', text: 'Moderate surf or currents' },
  red: { label: 'High hazard', text: 'Dangerous surf or strong currents' },
  'double-red': { label: 'Water closed', text: 'Water closed to the public' },
  purple: { label: 'Marine life', text: 'Dangerous marine life (jellyfish, stingrays)' },
}

const RIP_FLAG = { Low: 'green', Moderate: 'yellow', High: 'red' }
const QUALITY_FLAG = { Low: 'green', Medium: 'yellow', High: 'red' }

// One flag per condition; null where the condition isn't a hazard (crowds, tide, daylight)
export const conditionFlags = (m) => ({
  weather: m.thunder ? 'red' : m.rainChance >= 40 || m.tempF >= 98 ? 'yellow' : 'green',
  wind: m.wind.mph >= 25 ? 'red' : m.wind.mph >= 15 ? 'yellow' : 'green',
  sun: m.peakUv >= 8 ? 'red' : m.peakUv >= 6 ? 'yellow' : 'green',
  waves: m.waves.ft >= 5 ? 'red' : m.waves.ft >= 3 ? 'yellow' : 'green',
  water: m.water.f < 62 ? 'red' : m.water.f < 70 ? 'yellow' : 'green',
  rip: RIP_FLAG[m.rip.level] || 'yellow',
  quality: m.waterQuality ? QUALITY_FLAG[m.waterQuality.level] : null,
})

// The flag a lifeguard would most likely fly, from the forecast. Not the official posted flag.
export function beachFlag(m) {
  if (m.alerts.some((a) => CLOSED_ALERTS.test(a.event))) return 'double-red'
  if (m.rip.level === 'High' || m.waterQuality?.level === 'High' || m.alerts.some((a) => WATER_ALERTS.test(a.event))) return 'red'
  if (m.rip.level === 'Moderate' || m.waterQuality?.level === 'Medium' || m.thunder || m.waves.ft >= 4) return 'yellow'
  return 'green'
}

// --- Scoring --------------------------------------------------------------------------------------

// Hours you'd actually get on the sand. Today, you can't arrive before now + the drive.
export function beachHours(timeWindow, minutes, nowHour) {
  const arrive = nowHour == null ? timeWindow.start : Math.max(timeWindow.start, nowHour + minutes / 60)
  return timeWindow.end - arrive
}

export function scoreParts(m, prefs, minutes, hours) {
  // Water: how well the waves match what you want, minus hazards that matter more the more you're in the water
  const ft = m.waves.ft
  const waveMiss = {
    calm: Math.max(0, ft - 1) * 30,
    some: Math.max(0, 1 - ft) * 25 + Math.max(0, ft - 3) * 25,
    big: Math.max(0, 3 - ft) * 25 + Math.max(0, ft - 7) * 15,
  }[prefs.waves]
  const hazards = WATER_HAZARDS[prefs.swimming]
  let water = 100 - waveMiss * (prefs.swimming === 'none' ? 0.5 : 1)
  water -= hazards.rip[m.rip.level] ?? 0
  water -= hazards.bacteria[m.waterQuality?.level] ?? 0
  if (m.water.f < 70) water -= hazards.cold
  if (m.alerts.some((a) => WATER_ALERTS.test(a.event))) water -= hazards.alert

  const crowds = 100 - Math.abs(m.crowd - IDEAL_CROWD[prefs.crowds]) * 120
  const sun = 100 - Math.abs(m.peakUv - IDEAL_UV[prefs.sun]) * 12

  let weather = 100 - m.rainChance * 0.8
  weather -= Math.max(0, 72 - m.tempF) * 3 + Math.max(0, m.tempF - 96) * 3
  weather -= Math.max(0, m.wind.mph - 18) * 2
  if (m.thunder) weather -= 30
  if (m.alerts.some((a) => DAY_ALERTS.test(a.event))) weather -= 40

  // Drive time against time on the sand: two hours there and back for a five-hour window is fine,
  // seven hours each way for five hours of beach is not
  const ratio = (2 * minutes) / 60 / Math.max(hours, 0.5)
  const travel = 100 - Math.max(0, ratio - 0.3) * 50

  return { water: clamp(water), crowds: clamp(crowds), sun: clamp(sun), weather: clamp(weather), travel: clamp(travel) }
}

function totalScore(parts, minutes, hours) {
  const weighted = FACTORS.reduce((sum, f) => sum + parts[f.id] * f.weight, 0)
  // Spending more time in the car than on the sand is rarely worth it, however nice the beach
  const extraHours = Math.max(0, (2 * minutes) / 60 - hours)
  return clamp(weighted - Math.min(30, extraHours * 5))
}

// great / mixed / poor
export function fitTone(score) {
  if (score >= 75) return 'great'
  if (score >= 60) return 'mixed'
  return 'poor'
}

export const FIT_TEXT = { great: 'Great day', mixed: 'Decent day', poor: 'Rough day' }

// Ranks every beach you can reasonably reach. Beaches past your drive limit, or that you'd reach
// after the window closes, come back separately so the page can say why they're missing.
export function rankBeaches(beaches, prefs, timeWindow, origin, routes, nowHour) {
  // A little grace, since drive times are estimates and a 68-minute drive still feels like an hour
  const limit = driveLimit(prefs) + DRIVE_GRACE
  const ranked = []
  const tooFar = []
  for (const beach of beaches) {
    const metrics = summarize(beach, timeWindow)
    const travel = routes?.[beach.id] || estimateTravel(origin, beach)
    const hours = beachHours(timeWindow, travel.minutes, nowHour)
    const parts = scoreParts(metrics, prefs, travel.minutes, hours)
    const entry = { ...beach, metrics, travel, hours, parts, flag: beachFlag(metrics), score: totalScore(parts, travel.minutes, hours) }
    if (travel.minutes > limit) tooFar.push({ ...entry, why: 'far' })
    else if (hours < 1) tooFar.push({ ...entry, why: 'late' })
    else ranked.push(entry)
  }
  // Ties go to the shorter drive
  ranked.sort((a, b) => b.score - a.score || a.travel.minutes - b.travel.minutes)
  tooFar.sort((a, b) => a.travel.minutes - b.travel.minutes)
  ranked.forEach((b, i) => (b.rank = i + 1))
  return { ranked, tooFar }
}

// --- Plain-language explanations ------------------------------------------------------------------

// Short phrases for what's good and what's not about a beach, best first. Crowd phrases say
// "likely"/"probably" because crowds are an estimate.
export function explain(beach, prefs) {
  const m = beach.metrics
  const p = beach.parts
  const good = []
  const bad = []
  const wet = prefs.swimming !== 'none'
  const waves = waveText(m.waves)

  if (wet && m.rip.level === 'High') bad.push({ w: 9, text: 'high rip risk' })
  else if (wet && m.rip.level === 'Low') good.push({ w: 4, text: 'low rip risk' })
  if (m.waterQuality?.level === 'High') bad.push({ w: 8, text: 'bacteria advisory' })
  else if (wet && m.waterQuality?.level === 'Medium') bad.push({ w: 4, text: 'some bacteria' })
  else if (wet && m.waterQuality?.level === 'Low') good.push({ w: 1, text: 'clean water tests' })

  const waveFit = {
    calm: m.waves.ft < 1 ? 'good' : m.waves.ft <= 2 ? 'ok' : 'bad',
    some: m.waves.ft < 1 ? 'bad' : m.waves.ft <= 3.5 ? 'good' : 'bad',
    big: m.waves.ft >= 3 ? 'good' : m.waves.ft >= 2 ? 'ok' : 'bad',
  }[prefs.waves]
  if (waveFit === 'good') {
    good.push({ w: 6, text: { calm: 'flat, calm water', some: `${waves} waves to play in`, big: `real surf, ${waves}` }[prefs.waves] })
  } else if (waveFit === 'bad') {
    bad.push({ w: 5, text: m.waves.ft < 1 || (prefs.waves === 'big' && m.waves.ft < 3) ? 'not much surf' : `choppier water (${waves})` })
  }
  if (m.water.f >= 78) good.push({ w: wet ? 4 : 1, text: 'warm water' })
  else if (wet && m.water.f >= 72) good.push({ w: 2, text: 'comfortable water' })
  else if (wet && m.water.f < 70) bad.push({ w: 4, text: `chilly water (${m.water.f}°)` })

  if (p.crowds >= 75) good.push({ w: 5, text: { quiet: 'likely quiet', balanced: 'probably a normal crowd', lively: 'probably lively' }[prefs.crowds] })
  else if (p.crowds < 50) bad.push({ w: 4, text: prefs.crowds === 'lively' ? 'probably sleepy' : 'probably busy' })

  if (p.sun >= 80) good.push({ w: 3, text: { low: 'gentle sun', medium: 'good sun', high: 'strong sun for tanning' }[prefs.sun] })
  else if (p.sun < 55) bad.push({ w: 3, text: m.peakUv > IDEAL_UV[prefs.sun] ? 'strong sun' : 'not much sun' })

  if (m.thunder) bad.push({ w: 7, text: 'storms possible' })
  else if (m.rainChance >= 40) bad.push({ w: 5, text: `${m.rainChance}% chance of rain` })
  if (m.wind.mph >= 20) bad.push({ w: 4, text: `windy (${m.wind.mph} mph)` })
  else if (m.wind.mph <= 10) good.push({ w: 4, text: 'calm wind' })
  else if (m.wind.mph <= 14) good.push({ w: 1.5, text: 'a light breeze' })
  if (m.tempF < 68) bad.push({ w: 3, text: `cool, around ${m.tempF}°` })
  else if (!m.thunder && m.rainChance < 20 && m.tempF <= 92)
    good.push({ w: 2, text: /sunny/i.test(m.condition) ? `sunny and ${m.tempF}°` : `no rain, ${m.tempF}°` })

  const mins = beach.travel.minutes
  if (mins <= 75) good.push({ w: 5, text: `only ${formatDuration(mins)} away` })
  else if (p.travel >= 55) good.push({ w: 2, text: `${aboutHours(mins)} away` })
  else bad.push({ w: 6, text: `long drive (${formatDuration(mins)})` })

  const byWeight = (a, b) => b.w - a.w
  return { good: good.sort(byWeight).map((x) => x.text), bad: bad.sort(byWeight).map((x) => x.text) }
}

// 130 -> "about 2 hours", 160 -> "about 2½ hours"
function aboutHours(minutes) {
  const h = Math.round(minutes / 30) / 2
  if (h <= 1) return 'about an hour'
  return `about ${h % 1 ? `${Math.floor(h)}½` : h} hours`
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// "Flat, calm water, likely quiet, only 1 hr away." plus the tradeoffs, kept separate so the
// page can phrase them as "But: strong sun, long drive."
export function pitch(beach, prefs, goodCount = 3, badCount = 2) {
  const { good, bad } = explain(beach, prefs)
  const pros = good.slice(0, goodCount)
  return {
    reason: pros.length ? `${capitalize(pros.join(', '))}.` : 'Nothing stands out, good or bad.',
    tradeoffs: bad.slice(0, badCount),
  }
}

const SHORT_NAMES = {
  'south-padre': 'South Padre',
  'boca-chica': 'Boca Chica',
  'padre-ns': 'Padre Island Seashore',
  'mustang-island': 'Mustang Island',
  'port-aransas': 'Port Aransas',
  rockport: 'Rockport',
  matagorda: 'Matagorda',
  surfside: 'Surfside',
}
export const shortName = (beach) => SHORT_NAMES[beach.id] || beach.name

export function headline(beach) {
  const name = shortName(beach)
  const tone = fitTone(beach.score)
  if (tone === 'great') return `${name}'s your best bet.`
  if (tone === 'mixed') return `${name} is your best shot.`
  return `Tough day for it. ${name} comes closest.`
}

// One line about the rip current, for anyone getting in the water (or when it's dangerous anyway)
export function ripLine(m, prefs) {
  const alert = m.alerts.find((a) => WATER_ALERTS.test(a.event))
  if (alert) return `${alert.event} in effect. Stay out of the water unless a lifeguard says otherwise.`
  if (prefs.swimming === 'none' && m.rip.level !== 'High') return null
  const by = m.rip.kind === 'official' ? 'per the NWS' : 'our estimate'
  return {
    Low: `Rip current risk is low (${by}). Still swim near a lifeguard.`,
    Moderate: `Moderate rip current risk (${by}). Swim near a lifeguard and check the posted flag.`,
    High: `High rip current risk (${by}). Best to stay out of the water.`,
  }[m.rip.level]
}

// A gentle note when preferences pull against each other, or against the time window
export function prefConflict(prefs, timeWindow, top) {
  if (prefs.swimming === 'none' && prefs.waves === 'big')
    return 'Staying dry and big waves don\'t really go together, so waves count for less.'
  if (prefs.waves === 'big' && prefs.swimming !== 'none')
    return 'Big waves usually mean stronger rip currents. Check the rip risk before you go in.'
  if (prefs.sun === 'low' && top && top.metrics.peakUv >= 6 && timeWindow.start < 15 && timeWindow.end > 11)
    return `Gentle sun is hard to find around midday. Mornings or after ${shortHour(15)} are easier on skin.`
  return null
}

// Most important first. Every entry is shown regardless of the score.
export function safetyNotes(m, prefs) {
  const notes = []
  for (const a of m.alerts) notes.push({ level: /warning/i.test(a.event) ? 'danger' : 'warn', text: a.headline || a.event })
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
