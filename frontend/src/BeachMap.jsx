import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { formatDuration } from './data.js'
import { FLAGS, shortName } from './scoring.js'

const TEXAS_COAST_BOUNDS = [
  [25.85, -97.6],
  [29.65, -94.4],
]

// Each beach is a small lifeguard flag on a pole. The flag's color is the likely hazard flag and
// it carries the score. The pole's foot sits on the beach and the flag flies up and to the right,
// or to the left when a better-ranked flag is in the way.
function flagIcon(beach, selected, top, left) {
  const classes = ['map-flag', `flag-${beach.flag}`, selected && 'selected', top && 'top', left && 'left'].filter(Boolean).join(' ')
  const name = selected ? `<span class="map-flag-name">${shortName(beach)}</span>` : ''
  return L.divIcon({
    className: 'map-flag-wrap',
    html: `<div class="${classes}"><span class="map-flag-pole"></span><span class="map-flag-cloth">${beach.score}</span>${name}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

const dotIcon = L.divIcon({ className: 'map-flag-wrap', html: '<div class="map-place"><i></i></div>', iconSize: [0, 0], iconAnchor: [0, 0] })

const labelIcon = (text, at, origin) =>
  L.divIcon({
    className: 'map-flag-wrap map-label',
    html: `<span class="map-town at-${at}${origin ? ' origin' : ''}">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

// Rough pixel boxes, relative to the point, matching the CSS for flags and labels
function flagBoxes(beach, selected, top, left) {
  const pole = top ? 40 : 30
  const bottom = top ? 15 : 11
  const width = top ? 40 : 32
  const name = 12 + shortName(beach).length * 7.5
  const boxes = [
    [-3, -pole, 3, 3],
    left ? [-width, -bottom - (top ? 24 : 18), 0, -bottom] : [0, -bottom - (top ? 24 : 18), width, -bottom],
  ]
  if (selected) boxes.push(left ? [-name, -pole - 28, 0, -pole + 6] : [0, -pole - 28, name, -pole + 6])
  return boxes
}

const LABEL_SPOTS = {
  below: (w) => [-w / 2, 4, w / 2, 20],
  'below-left': (w) => [-w - 2, 4, -2, 20],
  'below-right': (w) => [6, 4, w + 6, 20],
  left: (w) => [-w - 10, -8, -10, 8],
}

const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
const overlapArea = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]))

// Lays out the flags and the town labels for the current zoom. Flags go down in rank order and fly
// to whichever side of the pole is less crowded. The base map has no labels, so towns are labeled here, each in
// the first spot that doesn't touch a flag or another label (or not at all if there's no room).
// That way no flag ever covers its own town's name.
function FlagsAndLabels({ beaches, origin, selectedId, topId, onSelect }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })

  const at = (p) => map.project([p.lat, p.lon], zoom)
  const offset = (box, pt) => [box[0] + pt.x, box[1] + pt.y, box[2] + pt.x, box[3] + pt.y]
  const free = (boxes) => !boxes.some((box) => taken.some((t) => overlaps(t, box)))
  const clash = (boxes) => boxes.reduce((sum, box) => sum + taken.reduce((n, t) => n + overlapArea(t, box), 0), 0)
  const originPt = at(origin)
  const taken = [[originPt.x - 7, originPt.y - 7, originPt.x + 7, originPt.y + 7]]

  // The selected flag and the top pick claim their spots first
  const order = [...beaches].sort((a, b) => (b.id === selectedId) - (a.id === selectedId) || (b.id === topId) - (a.id === topId))
  const flags = order.map((b) => {
    const pt = at(b)
    // A few pixels of breathing room so near misses count as crowded too
    const boxesFor = (left) => flagBoxes(b, b.id === selectedId, b.id === topId, left).map((box) => offset([box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3], pt))
    const left = clash(boxesFor(true)) < clash(boxesFor(false))
    taken.push(...boxesFor(left))
    return { beach: b, left }
  })

  const wanted = [{ text: origin.id === 'current' ? 'You' : origin.name, lat: origin.lat, lon: origin.lon, origin: true }]
  const seen = new Set([origin.name])
  for (const b of beaches) {
    if (seen.has(b.city)) continue
    seen.add(b.city)
    wanted.push({ text: b.city, lat: b.lat, lon: b.lon })
  }
  const labels = []
  for (const label of wanted) {
    const pt = at(label)
    const width = label.text.length * (label.origin ? 7.6 : 6.9) + 4
    const spot = Object.keys(LABEL_SPOTS).find((k) => free([offset(LABEL_SPOTS[k](width), pt)]))
    if (!spot) continue
    taken.push(offset(LABEL_SPOTS[spot](width), pt))
    labels.push({ ...label, spot })
  }

  return (
    <>
      {labels.map((l) => (
        <Marker key={l.text} position={[l.lat, l.lon]} icon={labelIcon(l.text, l.spot, l.origin)} interactive={false} keyboard={false} zIndexOffset={-100} />
      ))}
      {flags.map(({ beach: b, left }) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lon]}
          icon={flagIcon(b, b.id === selectedId, b.id === topId, left)}
          zIndexOffset={b.id === selectedId ? 1000 : b.id === topId ? 500 : 0}
          eventHandlers={{ click: () => onSelect(b.id) }}
          title={`${b.name}: ${b.score}, ${FLAGS[b.flag].label.toLowerCase()}`}
          alt={`${b.name}, score ${b.score}`}
        />
      ))}
    </>
  )
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

// Zoom to the beaches you can reach (and where you're leaving from) whenever that set changes.
// With nothing in reach, the closest few beaches are shown instead.
// Flags fly up and to the right of their beach, so there's extra room on those sides.
function FitToBeaches({ points }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat},${p.lon}`).join('|')
  useEffect(() => {
    if (!key) return
    const bounds = L.latLngBounds(key.split('|').map((p) => p.split(',').map(Number)))
    map.fitBounds(bounds, { paddingTopLeft: [24, 56], paddingBottomRight: [56, 36], maxZoom: 9, animate: false })
  }, [key, map])
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
// seafoam and the light land becomes sand
function TintFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="gulf-tint" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="2.262" intercept="-1.181" />
          <feFuncG type="linear" slope="0.3" intercept="0.62" />
          <feFuncB type="linear" slope="-0.208" intercept="1.007" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

export default function BeachMap({ beaches, outOfRange = [], selected, topId, origin, onSelect }) {
  return (
    <>
      <TintFilter />
      <MapContainer bounds={TEXAS_COAST_BOUNDS} scrollWheelZoom={false} className="map" zoomControl>
        <TileLayer
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={16}
        />
        <Marker position={[origin.lat, origin.lon]} icon={dotIcon} interactive={false} keyboard={false} />
        {outOfRange.map((b) => (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lon]}
            radius={4}
            pathOptions={{ color: '#6b7a86', weight: 1.5, fillColor: '#fbf7ef', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              {b.name}: {b.why === 'late' ? 'you\'d arrive too late' : `${formatDuration(b.travel.minutes)}, past your limit`}
            </Tooltip>
          </CircleMarker>
        ))}
        <FlagsAndLabels beaches={beaches} origin={origin} selectedId={selected?.id} topId={topId} onSelect={onSelect} />
        <FitToBeaches points={[origin, ...(beaches.length ? beaches : outOfRange.slice(0, 4))]} />
        <FollowSelected beach={selected} />
        <KeepSized />
      </MapContainer>
    </>
  )
}
