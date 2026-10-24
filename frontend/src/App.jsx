import { useEffect, useMemo, useState } from 'react'
import BeachMap from './BeachMap.jsx'
import Checklist from './Checklist.jsx'
import { scoreBeach, scoreColor, uvLabel, uvWarning } from './scoring.js'

const API_URL = 'http://127.0.0.1:8000'

const PREFERENCES = [
  { id: 'sun', label: 'Max sun' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'shade', label: 'Low UV' },
]

function formatDay(date, index) {
  if (index === 0) return 'Today'
  return new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [dayIndex, setDayIndex] = useState(0)
  const [preference, setPreference] = useState('balanced')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/beaches`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const beaches = useMemo(() => {
    if (!data) return []
    return data
      .map((b) => {
        const uv = b.forecast[dayIndex].uv_max
        return { ...b, uv, score: scoreBeach(uv, preference) }
      })
      .sort((a, b) => b.score - a.score)
  }, [data, dayIndex, preference])

  const selected = beaches.find((b) => b.id === selectedId) || beaches[0]
  const days = data ? data[0].forecast.map((f) => f.date) : []

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="36" height="36" />
          <div>
            <h1>Beach Day Planner</h1>
            <p className="muted">Find the best Texas beach for your day</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="card error">
          Couldn't load beach data ({error}). Is the backend running on port 8000?
        </div>
      )}
      {!data && !error && <div className="card">Loading beaches…</div>}

      {data && (
        <>
          <div className="controls">
            <div className="pills" role="group" aria-label="Day">
              {days.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  className={i === dayIndex ? 'pill active' : 'pill'}
                  onClick={() => setDayIndex(i)}
                >
                  {formatDay(d, i)}
                </button>
              ))}
            </div>
            <div className="pills" role="group" aria-label="Sun preference">
              {PREFERENCES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={p.id === preference ? 'pill active' : 'pill'}
                  onClick={() => setPreference(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <main className="layout">
            <div className="card map-card">
              <BeachMap beaches={beaches} selectedId={selected.id} onSelect={setSelectedId} />
            </div>

            <aside className="side">
              <section className="card detail">
                <div className="card-head">
                  <div>
                    <h2>{selected.name}</h2>
                    <p className="muted">{selected.city}, TX</p>
                  </div>
                  <span className="score" style={{ background: scoreColor(selected.score) }}>
                    {selected.score}
                  </span>
                </div>
                <div className="stats">
                  <div className="stat">
                    <span className="muted">Max UV</span>
                    <strong>{selected.uv.toFixed(1)}</strong>
                    <span>{uvLabel(selected.uv)}</span>
                  </div>
                  {dayIndex === 0 && (
                    <div className="stat">
                      <span className="muted">UV right now</span>
                      <strong>{selected.uv_now.toFixed(1)}</strong>
                      <span>{uvLabel(selected.uv_now)}</span>
                    </div>
                  )}
                </div>
                {uvWarning(selected.uv) && <p className="warning">{uvWarning(selected.uv)}</p>}
              </section>

              <section className="card">
                <h2>Top beaches</h2>
                <ol className="ranking">
                  {beaches.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className={b.id === selected.id ? 'rank-row active' : 'rank-row'}
                        onClick={() => setSelectedId(b.id)}
                      >
                        <span className="dot" style={{ background: scoreColor(b.score) }} />
                        <span className="rank-name">{b.name}</span>
                        <span className="muted">UV {b.uv.toFixed(1)}</span>
                        <strong>{b.score}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            </aside>
          </main>

          <Checklist highUv={selected.uv >= 8} />
        </>
      )}

      <footer className="muted footer">
        UV data from <a href="https://open-meteo.com/">Open-Meteo</a>. Scores are based on UV only for now.
      </footer>
    </div>
  )
}

export default App
