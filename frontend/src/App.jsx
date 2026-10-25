import { useEffect, useState } from 'react'
import Discover from './Discover.jsx'
import Icon from './Icon.jsx'
import { timeAgo } from './data.js'
import { DEFAULT_PREFS, normalizePrefs } from './scoring.js'

// localStorage can throw (private mode, blocked storage), so reads and writes fail soft
function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Not persisted; fine for a demo
    }
  }, [key, value])
  return [value, setValue]
}

const TRAVEL_SOURCES = {
  tomtom: 'TomTom routing with live traffic',
  osrm: 'OSRM road routing (no traffic; add a TomTom key for traffic)',
  estimate: 'Straight-line estimate (routing unavailable)',
}

// Header menu listing every data source, whether it answered, and how fresh it is. It stays quiet
// unless something is down.
function DataStatus({ status }) {
  if (!status) return <span className="status-menu sources-link muted">Sources</span>
  const failed = status.sources.filter((s) => !s.ok)
  return (
    <details className="status-menu">
      <summary className={failed.length ? 'sources-link degraded' : 'sources-link'}>
        {failed.length ? `${failed.length} source${failed.length > 1 ? 's' : ''} down` : 'Sources'}
        <Icon name="chevron" size={14} />
      </summary>
      <div className="status-panel">
        <p className="muted small">Updated {timeAgo(status.generated)}.</p>
        <ul>
          {status.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
              <span className={s.ok ? 'muted small' : 'down small'}>
                {s.ok ? (s.fetched ? timeAgo(s.fetched) : 'ok') : 'unavailable'}
                {s.detail ? ` · ${s.detail}` : ''}
              </span>
            </li>
          ))}
          <li>
            <span>Drive times</span>
            <span className={status.travel === 'estimate' ? 'down small' : 'muted small'}>{TRAVEL_SOURCES[status.travel]}</span>
          </li>
          <li>
            <span>Crowds</span>
            <span className="muted small">Estimate. Live crowd data is planned.</span>
          </li>
        </ul>
      </div>
    </details>
  )
}

export default function App() {
  const [storedPrefs, setPrefs] = useStoredState('bdp-prefs', DEFAULT_PREFS)
  const prefs = normalizePrefs(storedPrefs)
  const [focusId, setFocusId] = useState(null)
  const [status, setStatus] = useState(null)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          {/* Half sun setting into striped water, like an old motel sign */}
          <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden="true">
            <path d="M5 15a12 12 0 0 1 24 0z" fill="var(--turq)" />
            <rect x="1" y="17" width="32" height="2.2" rx="1.1" fill="var(--gulf)" />
            <rect x="5" y="21" width="24" height="2.2" rx="1.1" fill="var(--gulf)" />
          </svg>
          <span className="brand-name">
            Beach Day <span>Planner</span>
          </span>
        </div>
        <DataStatus status={status} />
      </header>

      <Discover prefs={prefs} setPrefs={setPrefs} focusId={focusId} setFocusId={setFocusId} onStatus={setStatus} />
      <footer className="footer">
        <div>
          <p className="footer-sign">Enjoy the coast. Respect the ocean.</p>
          <p>
            Forecasts from <a href="https://open-meteo.com/">Open-Meteo</a> and the{' '}
            <a href="https://www.weather.gov/beach/">National Weather Service</a>, tides from{' '}
            <a href="https://tidesandcurrents.noaa.gov/">NOAA</a>, water tests from{' '}
            <a href="https://www.texasbeachwatch.com/">Texas Beach Watch</a>. Crowds are estimates. This isn't a
            safety advisory, so always check the posted flag.
          </p>
        </div>
      </footer>
    </div>
  )
}
