import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { API_URL, timeAgo } from './data.js'

// Transparent -> teal -> yellow -> red, for the crowd density heat overlay
const HEAT_STOPS = [
  [0, [0, 0, 0, 0]],
  [0.15, [0, 200, 220, 90]],
  [0.45, [60, 230, 140, 160]],
  [0.7, [250, 220, 60, 200]],
  [1, [255, 70, 50, 235]],
]

function heatColor(v) {
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [b, cb] = HEAT_STOPS[i]
    const [a, ca] = HEAT_STOPS[i - 1]
    if (v <= b) {
      const t = (v - a) / (b - a)
      return ca.map((x, k) => Math.round(x + (cb[k] - x) * t))
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1]
}

// Fetches the AI crowd analysis for a cam. The backend caches it for 10 minutes; a fresh run takes
// several seconds, so callers show a scanning state meanwhile.
function useCrowd(beachId, camIndex, enabled) {
  const [state, setState] = useState({ loading: enabled, data: null, error: null })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState({ loading: true, data: null, error: null })
    fetch(`${API_URL}/crowd?beach=${beachId}&cam=${camIndex}`)
      .then((res) => (res.ok ? res.json() : res.json().then((j) => Promise.reject(new Error(j.detail || res.status)))))
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((e) => !cancelled && setState({ loading: false, data: null, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [beachId, camIndex, enabled])
  return state
}

function HeatLayer({ density }) {
  const canvas = useRef(null)
  useEffect(() => {
    const el = canvas.current
    if (!el || !density) return
    const rows = density.length
    const cols = density[0].length
    el.width = cols
    el.height = rows
    const ctx = el.getContext('2d')
    const img = ctx.createImageData(cols, rows)
    density.forEach((row, y) =>
      row.forEach((v, x) => {
        img.data.set(heatColor(Math.pow(v, 0.5)), (y * cols + x) * 4)
      }),
    )
    ctx.putImageData(img, 0, 0)
  }, [density])
  return <canvas ref={canvas} className="ai-heat" aria-hidden="true" />
}

function BoxLayer({ people }) {
  return (
    <svg className="ai-boxes" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {people.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

const LEVEL_TONE = { Quiet: 'great', Moderate: 'mixed', Busy: 'poor' }

function Hud({ data, loading, error, view }) {
  if (loading) {
    return (
      <div className="ai-hud">
        <span className="ai-chip">
          <span className="ai-pulse" /> AI scanning frame…
        </span>
      </div>
    )
  }
  if (error) return <div className="ai-hud"><span className="ai-chip muted-chip">AI unavailable · {error}</span></div>
  if (!data) return null
  if (data.dark) return <div className="ai-hud"><span className="ai-chip muted-chip">Too dark to count right now</span></div>
  return (
    <div className="ai-hud">
      <span className={`ai-chip tone-${LEVEL_TONE[data.level]}`}>
        <span className="ai-pulse" /> AI · ~{data.count.toLocaleString()} people · {data.level}
      </span>
      {view === 'live' && <span className="ai-chip muted-chip">Heat from a frame {timeAgo(data.fetched)}</span>}
    </div>
  )
}

// Live player with an AI crowd layer. "Live" keeps the video playing with the density heat on top
// (cams are fixed, so the busy areas line up); "AI frame" shows the exact frame that was analyzed
// with every detected person boxed.
export default function CamPlayer({ beachId, camIndex, cam }) {
  const aiSupported = cam.embed.includes('youtube')
  const [view, setView] = useState('live')
  const [heat, setHeat] = useState(true)
  const { loading, data, error } = useCrowd(beachId, camIndex, aiSupported)
  const showHeat = heat && data?.density && !data.dark

  return (
    <div className="cam-player">
      <div className={`cam-frame ${aiSupported ? 'ai-stage' : ''} view-${view}`}>
        {view === 'live' || !data ? (
          <iframe
            src={cam.embed}
            title={`${cam.name} live cam`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <img className="ai-frame" src={`${API_URL}${data.frame}`} alt={`Frame from ${cam.name} analyzed for crowds`} />
        )}
      </div>
      {aiSupported && (
        <div className="ai-controls">
          <div className="ai-toggle" role="radiogroup" aria-label="Cam view">
            {[
              ['live', 'Live'],
            ].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={view === id} className={view === id ? 'active' : ''} disabled={id === 'frame' && !data} onClick={() => setView(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
