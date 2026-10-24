import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { scoreColor } from './scoring.js'

const TEXAS_COAST = [27.8, -96.4]

export default function BeachMap({ beaches, selectedId, onSelect }) {
  return (
    <MapContainer center={TEXAS_COAST} zoom={7} scrollWheelZoom className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {beaches.map((b) => (
        <CircleMarker
          key={b.id}
          center={[b.lat, b.lon]}
          radius={b.id === selectedId ? 14 : 10}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: scoreColor(b.score),
            fillOpacity: 0.95,
          }}
          eventHandlers={{ click: () => onSelect(b.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>{b.name}</strong> · {b.score}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
