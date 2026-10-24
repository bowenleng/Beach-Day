// UV-only scoring for now. More factors (tide, rip currents, crowds, weather) go here later.

// Ideal UV for each sun preference
const IDEAL_UV = { sun: 8, balanced: 5, shade: 2 }

export function scoreBeach(uv, preference) {
  const distance = Math.abs(uv - IDEAL_UV[preference])
  return Math.max(0, Math.round(100 - distance * 12))
}

export function scoreColor(score) {
  if (score >= 75) return '#22b07d'
  if (score >= 50) return '#f2b134'
  return '#ef6b5b'
}

export function uvLabel(uv) {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very high'
  return 'Extreme'
}

export function uvWarning(uv) {
  if (uv >= 11) return 'Extreme UV: avoid midday sun and reapply sunscreen often.'
  if (uv >= 8) return 'Very high UV: unprotected skin can burn in under 15 minutes.'
  return null
}
