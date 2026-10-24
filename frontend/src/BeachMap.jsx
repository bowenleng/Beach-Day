import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

const TEXAS_COAST_BOUNDS = [
  [25.85, -97.6],
  [29.65, -94.4],
]

function pinIcon(beach, selected) {
  const className = selected ? 'score-pin selected' : 'score-pin'
  const label = selected ? `<span class="pin-label">${beach.name}</span>` : ''
  return L.divIcon({
    className: 'score-pin-wrap',
    html: `<div class="${className}">${beach.score}</div>${label}`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

// Keep the selected beach in view when it's picked from the list
function FollowSelected({ beach }) {
  const map = useMap()
  useEffect(() => {
    if (beach && !map.getBounds().pad(-0.1).contains([beach.lat, beach.lon])) {
      map.panTo([beach.lat, beach.lon])
    }
  }, [beach, map])
  return null
}

export default function BeachMap({ beaches, selected, origin, onSelect }) {
  return (
    <MapContainer bounds={TEXAS_COAST_BOUNDS} scrollWheelZoom={false} className="map" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[origin.lat, origin.lon]}
        radius={6}
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
    </MapContainer>
  )
}
