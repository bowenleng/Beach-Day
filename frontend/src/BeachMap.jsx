import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

const TEXAS_COAST_BOUNDS = [
  [25.85, -97.6],
  [29.65, -94.4],
]

function pinIcon(beach, selected) {
  const className = selected ? 'score-pin selected' : 'score-pin'
  const photo = beach.photo ? `<img src="${beach.photo.url}" alt="" />` : ''
  const label = selected ? `<span class="pin-label"><strong>${beach.name}</strong>${photo}</span>` : ''
  const m = beach.metrics
  const warning = m.alerts.length > 0 || m.rip.level === 'High' || m.waterQuality?.level === 'High'
  const badge = warning ? '<span class="pin-alert"></span>' : ''
  return L.divIcon({
    className: 'score-pin-wrap',
    html: `<div class="${className}">${beach.score}${badge}</div>${label}`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
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

// Center the map on the selected beach whenever the selection changes (map pin or ranked list)
function FollowSelected({ beach }) {
  const map = useMap()
  const lat = beach?.lat
  const lon = beach?.lon
  useEffect(() => {
    if (lat != null) map.panTo([lat, lon], { animate: true, duration: 0.6 })
  }, [lat, lon, map])
  return null
}

export default function BeachMap({ beaches, selected, origin, onSelect }) {
  return (
    <MapContainer bounds={TEXAS_COAST_BOUNDS} scrollWheelZoom className="map" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[origin.lat, origin.lon]}
        radius={4}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1f5f52', fillOpacity: 1 }}
      >
        <Tooltip direction="top" offset={[0, -6]}>
          Starting from {origin.name}
        </Tooltip>
      </CircleMarker>
      {beaches.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lon]}
          icon={pinIcon(b, b.id === selected?.id)}
          zIndexOffset={b.id === selected?.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(b.id) }}
          title={`${b.name}: ${b.score}`}
        />
      ))}
      <FollowSelected beach={selected} />
      <KeepSized />
    </MapContainer>
  )
}
