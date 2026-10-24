import { useEffect, useState } from 'react'
import Discover from './Discover.jsx'
import Icon from './Icon.jsx'
import { DEFAULT_PREFS } from './scoring.js'

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'trips', label: 'My trips' },
  { id: 'saved', label: 'Saved beaches' },
]

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

function SavedBeaches({ saved, onOpen, onRemove }) {
  return (
    <main className="page-narrow">
      <h1>Saved beaches</h1>
      {saved.length === 0 ? (
        <div className="card empty">
          <Icon name="bookmark" size={28} />
          <p>No saved beaches yet. Tap the bookmark on any beach in Discover to keep it here.</p>
        </div>
      ) : (
        <ul className="saved-list">
          {saved.map((b) => (
            <li key={b.id} className="card saved-row">
              <div>
                <strong>{b.name}</strong>
                <span className="muted small">{b.city}, TX</span>
              </div>
              <div className="saved-actions">
                <button type="button" className="ghost-button" onClick={() => onRemove(b)}>
                  Remove
                </button>
                <button type="button" className="primary-button" onClick={() => onOpen(b.id)}>
                  View in Discover <Icon name="arrow" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function MyTrips() {
  return (
    <main className="page-narrow">
      <h1>My trips</h1>
      <div className="card empty">
        <Icon name="calendar" size={28} />
        <p>
          Trip planning is coming next: budget per person, what to bring, and warnings for your day.
          For now, find your beach in Discover.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  const [tab, setTab] = useState('discover')
  const [prefs, setPrefs] = useStoredState('bdp-prefs', DEFAULT_PREFS)
  const [saved, setSaved] = useStoredState('bdp-saved', [])
  const [focusId, setFocusId] = useState(null)

  const toggleSaved = (beach) => {
    setSaved((list) =>
      list.some((b) => b.id === beach.id)
        ? list.filter((b) => b.id !== beach.id)
        : [...list, { id: beach.id, name: beach.name, city: beach.city }],
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true">
            <path d="M1 5c3.5-3 7-3 10.5 0S18.5 8 22 5s5.5-2 7 0M1 11c3.5-3 7-3 10.5 0s7 3 10.5 0 5.5-2 7 0M1 17c3.5-3 7-3 10.5 0s7 3 10.5 0 5.5-2 7 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="brand-name">Beach Day Planner</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'saved' && saved.length > 0 && <span className="tab-count">{saved.length}</span>}
            </button>
          ))}
        </nav>
        <span className="live-pill">Live data</span>
      </header>

      {tab === 'discover' && (
        <Discover
          prefs={prefs}
          setPrefs={setPrefs}
          saved={saved}
          toggleSaved={toggleSaved}
          focusId={focusId}
          setFocusId={setFocusId}
        />
      )}
      {tab === 'trips' && <MyTrips />}
      {tab === 'saved' && (
        <SavedBeaches
          saved={saved}
          onRemove={toggleSaved}
          onOpen={(id) => {
            setFocusId(id)
            setTab('discover')
          }}
        />
      )}

      <footer className="footer muted tiny">
        <span>
          Weather, UV and waves from <a href="https://open-meteo.com/">Open-Meteo</a> · Tides from{' '}
          <a href="https://tidesandcurrents.noaa.gov/">NOAA</a> · Crowds and rip risk are estimates. Not a safety
          advisory.
        </span>
        <span>Enjoy the coast. Respect the ocean.</span>
      </footer>
    </div>
  )
}
