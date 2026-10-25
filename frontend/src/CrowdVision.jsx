import { useEffect, useState } from 'react'
import { API_URL } from './data.js'

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

const LEVEL_TONE = { Quiet: 'great', Moderate: 'mixed', Busy: 'poor' }

function Hud({ data, loading, error }) {
  if (loading) {
    return (
      <div className="ai-hud">
        <span className="ai-chip">
          <span className="ai-pulse" /> Checking crowds…
        </span>
      </div>
    )
  }
  if (error) return <div className="ai-hud"><span className="ai-chip muted-chip">Crowd level unavailable</span></div>
  if (!data) return null
  if (data.dark) return <div className="ai-hud"><span className="ai-chip muted-chip">Too dark to tell right now</span></div>
  return (
    <div className="ai-hud">
      <span className={`ai-chip tone-${LEVEL_TONE[data.level]}`}>
        <span className="ai-pulse" /> {data.level}
      </span>
    </div>
  )
}

// Live player with an AI crowd level on top. "AI frame" shows the exact frame that was analyzed
// with every detected person boxed.
export default function CamPlayer({ beachId, camIndex, cam }) {
  const aiSupported = cam.ai
  const [view, setView] = useState('live')
  const { loading, data, error } = useCrowd(beachId, camIndex, aiSupported)

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
        {aiSupported && (
          <div className="ai-overlay">
            <span className="ai-corner tl" />
            <span className="ai-corner tr" />
            <span className="ai-corner bl" />
            <span className="ai-corner br" />
            <Hud data={data} loading={loading} error={error} />
          </div>
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
