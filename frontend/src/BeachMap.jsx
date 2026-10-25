import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { formatDuration } from './data.js'
import { FLAGS, shortName } from './scoring.js'

const TEXAS_COAST_BOUNDS = [
  [25.85, -97.6],
  [29.65, -94.4],
]

// Score -> marker color on one sequential turquoise scale: pale for weak matches, deep for strong
// ones. Flag colors never appear here; hazards get their own badge.
const SCALE = [
  [0, [227, 245, 242]],
  [0.5, [92, 207, 195]],
  [1, [8, 92, 96]],
]
const scoreT = (score) => Math.max(0, Math.min(1, (score - 30) / 60))

function scoreColor(score) {
  const t = scoreT(score)
  const i = t <= 0.5 ? 1 : 2
  const [a, ca] = SCALE[i - 1]
  const [b, cb] = SCALE[i]
  const k = (t - a) / (b - a)
  return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * k)).join(',')})`
}

// Dark numbers on the pale end, light numbers on the deep end
const darkText = (score) => scoreT(score) < 0.8

// Better matches are a little bigger so they pop
const radius = (beach, emphasized) => 13 + scoreT(beach.score) * 6 + (emphasized ? 2 : 0)

const FLAG_SVG = (color) =>
  `<svg class="flag flag-${color}" width="11" height="11" viewBox="0 0 14 14" aria-hidden="true"><rect class="flag-pole" x="1" y="0.5" width="1.5" height="13.5" rx="0.5"/>${
    color === 'double-red'
      ? '<rect class="flag-cloth" x="2.5" y="1" width="9.5" height="4"/><rect class="flag-cloth" x="2.5" y="6" width="9.5" height="4"/>'
      : '<rect class="flag-cloth" x="2.5" y="1" width="10" height="7"/>'
  }</svg>`

// One marker: the score circle centered on the beach, a hazard badge when the likely flag is yellow or worse, and the beach name
// (shown on hover, or always when selected) in a spot that doesn't cover another marker.
function beachIcon(beach, { r, name }, state) {
  const badge = beach.flag !== 'green' ? `<span class="map-badge" title="${FLAGS[beach.flag].label}">${FLAG_SVG(beach.flag)}</span>` : ''
  const classes = ['map-dot', darkText(beach.score) ? 'dark-text' : 'light-text', state.selected && 'selected', state.hover && 'hover']
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: 'map-marker',
    html:
      `<div class="${classes}" style="width:${2 * r}px;height:${2 * r}px;` +
      `margin:${-r}px 0 0 ${-r}px;background:${scoreColor(beach.score)};font-size:${Math.round(r * 0.8 + 3)}px">` +
      `<span class="map-score">${beach.score}</span>${badge}</div>` +
      `<span class="map-name" style="left:${name.x}px;top:${name.y}px">${shortName(beach)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

const originIcon = (label) =>
  L.divIcon({
    className: 'map-marker',
    html: `<div class="map-origin"><i></i><span style="left:${label.x}px;top:${label.y}px">${label.text}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

const townIcon = (label) =>
  L.divIcon({
    className: 'map-marker map-town-wrap',
    html: `<span class="map-town" style="left:${label.x}px;top:${label.y}px">${label.text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

const overlapArea = (a, b) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]))

// Spots for a label of size w x h around a circle of radius r at (cx, cy): right, left, above, below.
// Returns the label's top-left corner relative to the point, plus its box in map pixels.
function labelSpots(cx, cy, r, w, h) {
  const gap = 5
  return [
    [cx + r + gap, cy - h / 2],
    [cx - r - gap - w, cy - h / 2],
    [cx - w / 2, cy - r - gap - h],
    [cx - w / 2, cy + r + gap],
  ]
}

// Lays out the labels for the current zoom, in map pixels. Circles sit on their beaches and may
// overlap each other; each beach name gets the spot that covers the fewest markers (usually none),
// and town labels go only where they touch no marker or name, so a label never hides a marker.
function layoutMarkers(map, zoom, beaches, origin, emphasized) {
  const at = (p) => map.project([p.lat, p.lon], zoom)
  // What's visible right now; labels that would run off the edge count as covering something
  const view = map.getPixelBounds()
  const edge = [view.min.x + 4, view.min.y + 4, view.max.x - 4, view.max.y - 4]
  const offscreen = (b) => (b[2] - b[0]) * (b[3] - b[1]) - overlapArea(edge, b)
  const o = at(origin)
  const nodes = beaches.map((b) => {
    const p = at(b)
    return { b, x: p.x, y: p.y, r: radius(b, emphasized.has(b.id)) }
  })
  const circles = nodes.map((n) => [n.x - n.r, n.y - n.r, n.x + n.r, n.y + n.r])
  circles.push([o.x - 8, o.y - 8, o.x + 8, o.y + 8])
  const taken = [...circles]
  const place = (cx, cy, r, text, size, avoid) => {
    const w = text.length * size * 0.56 + 14
    const h = size + 10
    let best = null
    for (const [x, y] of labelSpots(cx, cy, r, w, h)) {
      const box = [x, y, x + w, y + h]
      const cost = avoid.reduce((sum, t) => sum + overlapArea(t, box), 0) + offscreen(box)
      if (!best || cost < best.cost) best = { x, y, box, cost }
      if (cost === 0) break
    }
    return best
  }

  const originName = origin.id === 'current' ? 'You' : origin.name
  const originLabel = place(o.x, o.y, 8, originName, 13.5, taken)
  taken.push(originLabel.box)

  const markers = nodes.map((n) => {
    const others = circles.filter((_, i) => i !== nodes.indexOf(n))
    const label = place(n.x, n.y, n.r, shortName(n.b), 12.5, [...others, originLabel.box])
    return { beach: n.b, r: n.r, name: { x: label.x - n.x, y: label.y - n.y }, nameBox: label.box }
  })
  for (const m of markers) if (emphasized.has(m.beach.id)) taken.push(m.nameBox)

  const towns = []
  const seen = new Set([origin.name])
  for (const n of nodes) {
    const city = n.b.city
    if (seen.has(city)) continue
    seen.add(city)
    const spot = place(n.x, n.y, n.r + 2, city, 12, taken)
    if (spot.cost > 0) continue
    taken.push(spot.box)
    towns.push({ text: city, lat: n.b.lat, lon: n.b.lon, x: spot.x - n.x, y: spot.y - n.y })
  }

  return { markers, origin: { text: originName, x: originLabel.x - o.x, y: originLabel.y - o.y }, towns }
}

function Markers({ beaches, origin, selectedId, topId, hoverId, onSelect }) {
  const map = useMap()
  // Re-run the layout after every zoom or pan
  const [, setView] = useState(0)
  useMapEvents({ moveend: () => setView((v) => v + 1) })
  const zoom = map.getZoom()
  const emphasized = new Set([selectedId, topId])
  const layout = layoutMarkers(map, zoom, beaches, origin, emphasized)

  return (
    <>
      {layout.towns.map((t) => (
        <Marker key={`town-${t.text}`} position={[t.lat, t.lon]} icon={townIcon(t)} interactive={false} keyboard={false} zIndexOffset={-200} />
      ))}
      <Marker position={[origin.lat, origin.lon]} icon={originIcon(layout.origin)} interactive={false} keyboard={false} zIndexOffset={-100} />
      {layout.markers.map((m) => {
        const b = m.beach
        const selected = b.id === selectedId
        return (
          <Marker
            key={b.id}
            position={[b.lat, b.lon]}
            icon={beachIcon(b, m, { selected, hover: b.id === hoverId })}
            zIndexOffset={selected ? 1000 : b.id === hoverId ? 900 : Math.round(b.score)}
            eventHandlers={{ click: () => onSelect(b.id) }}
            title={`${b.name}: ${b.score}${b.flag !== 'green' ? `, ${FLAGS[b.flag].label.toLowerCase()}` : ''}`}
            alt={`${b.name}, score ${b.score}`}
          />
        )
      })}
    </>
  )
}

// Zoom to the beaches you can reach (and where you're leaving from) whenever that set changes.
// With nothing in reach, the closest few beaches are shown instead.
function FitToBeaches({ points }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat},${p.lon}`).join('|')
  useEffect(() => {
    if (!key) return
    const bounds = L.latLngBounds(key.split('|').map((p) => p.split(',').map(Number)))
    map.fitBounds(bounds, { paddingTopLeft: [48, 40], paddingBottomRight: [48, 56], maxZoom: 10, animate: false })
  }, [key, map])
  return null
}

// Leaflet measures its container once; re-measure when the layout resizes it
function KeepSized() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

// Bring the selected beach into view when it's picked from the list and is off the map
function FollowSelected({ beach }) {
  const map = useMap()
  const lat = beach?.lat
  const lon = beach?.lon
  useEffect(() => {
    if (lat != null && !map.getBounds().pad(-0.1).contains([lat, lon])) map.panTo([lat, lon], { animate: true, duration: 0.6 })
  }, [lat, lon, map])
  return null
}

// Recolors the light gray base map to the palette by brightness: the mid-gray water becomes
// seafoam and the light land becomes paper, a shade lighter than the sand page around the map
function TintFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="gulf-tint" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="2.769" intercept="-1.619" />
          <feFuncG type="linear" slope="0.938" intercept="0.087" />
          <feFuncB type="linear" slope="1.177" intercept="-0.169" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

function Legend() {
  return (
    <div className="map-legend" aria-hidden="true">
      <span className="map-legend-scale">
        <i style={{ background: scoreColor(40) }} />
        <i style={{ background: scoreColor(60) }} />
        <i style={{ background: scoreColor(85) }} />
        Darker = better match
      </span>
      <span>
        <span className="map-badge">{/* same badge as on the markers */}
          <svg className="flag flag-yellow" width="11" height="11" viewBox="0 0 14 14">
            <rect className="flag-pole" x="1" y="0.5" width="1.5" height="13.5" rx="0.5" />
            <rect className="flag-cloth" x="2.5" y="1" width="10" height="7" />
          </svg>
        </span>
        Hazard
      </span>
    </div>
  )
}

export default function BeachMap({ beaches, outOfRange = [], selected, topId, hoverId, origin, onSelect }) {
  return (
    <>
      <TintFilter />
      <MapContainer bounds={TEXAS_COAST_BOUNDS} scrollWheelZoom className="map" zoomControl>
        <TileLayer
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={16}
        />
        {outOfRange.map((b) => (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lon]}
            radius={3.5}
            pathOptions={{ color: '#8a96a0', weight: 1, fillColor: '#fbf7ef', fillOpacity: 1, opacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              {b.name}: {b.why === 'late' ? 'you\'d get there after the window ends' : `${formatDuration(b.travel.minutes)}, outside your range`}
            </Tooltip>
          </CircleMarker>
        ))}
        <Markers beaches={beaches} origin={origin} selectedId={selected?.id} topId={topId} hoverId={hoverId} onSelect={onSelect} />
        <FitToBeaches points={[origin, ...(beaches.length ? beaches : outOfRange.slice(0, 4))]} />
        <FollowSelected beach={selected} />
        <KeepSized />
      </MapContainer>
      {beaches.length > 0 && <Legend />}
    </>
  )
}
