import { useEffect, useMemo, useState } from 'react'
import BeachMap from './BeachMap.jsx'
import Icon from './Icon.jsx'
import {
  API_URL,
  ORIGINS,
  TIME_WINDOWS,
  forecastDays,
  formatDay,
  formatDuration,
  formatHour,
  formatClock,
  shortHour,
} from './data.js'
import { FACTORS, PREFERENCE_OPTIONS, fitLabel, rankBeaches, safetyNotes } from './scoring.js'

function Field({ icon, label, children }) {
  return (
    <label className="field">
      <Icon name={icon} />
      <span className="field-body">
        <span className="eyebrow">{label}</span>
        {children}
      </span>
      <Icon name="chevron" size={16} className="field-chevron" />
    </label>
  )
}

function Tag({ tone = 'neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

const RIP_TONE = { Low: 'neutral', Moderate: 'warn', High: 'danger' }
const CROWD_TEXT = { Quiet: 'Quiet', Moderate: 'Moderate crowds', Busy: 'Busy' }

function BeachArt({ beach }) {
  // Simple generated scene in place of a photo
  const hue = (beach.lat * 97) % 40
  return (
    <svg className="beach-art" viewBox="0 0 120 80" aria-hidden="true">
      <rect width="120" height="80" fill={`hsl(${195 + hue} 70% 85%)`} />
      <circle cx="92" cy="22" r="10" fill="#ffd27a" />
      <path d="M0 44 Q30 38 60 44 T120 44 V80 H0Z" fill={`hsl(${185 + hue} 55% 55%)`} />
      <path d="M0 56 Q30 50 60 56 T120 54 V80 H0Z" fill="#ffffff" opacity="0.6" />
      <path d="M0 60 Q40 54 70 62 T120 58 V80 H0Z" fill="#f1dfbc" />
    </svg>
  )
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'active' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Preferences({ prefs, setPrefs }) {
  const rows = [
    { key: 'crowds', title: 'Crowd tolerance' },
    { key: 'sun', title: 'Sun & UV preference' },
    { key: 'swimming', title: 'Swimming' },
  ]
  return (
    <section className="card prefs">
      <div className="card-title-row">
        <h2>Your kind of day</h2>
        <Icon name="sliders" />
      </div>
      {rows.map(({ key, title }) => {
        const options = PREFERENCE_OPTIONS[key]
        return (
          <div className="pref-row" key={key}>
            <div className="pref-head">
              <span>{title}</span>
              <span className="accent-text">{options.find((o) => o.id === prefs[key]).label}</span>
            </div>
            <Segmented
              label={title}
              options={options}
              value={prefs[key]}
              onChange={(v) => setPrefs({ ...prefs, [key]: v })}
            />
          </div>
        )
      })}
      <p className="muted small">
        Sun preference never overrides safety. There is no safe UV level for tanning.
      </p>
      <p className="muted small soon">
        <Icon name="wave" size={14} /> Surf &amp; fishing · On the horizon
      </p>
    </section>
  )
}

function WhyScore({ beach }) {
  const formula = FACTORS.map((f) => `${beach.parts[f.id]}×.${String(f.weight * 100).padStart(2, '0')}`).join(' + ')
  return (
    <section className="card why">
      <div className="card-title-row">
        <h2>Why {beach.score}?</h2>
        <span className="fit-pill">{fitLabel(beach.score)}</span>
      </div>
      <p className="muted small">A weighted match to your preferences, not a guarantee of a safe beach day.</p>
      <div className="bars">
        {FACTORS.map((f) => (
          <div className="bar-row" key={f.id}>
            <div className="bar-head">
              <span>{f.label}</span>
              <span className="muted small">
                {Math.round(f.weight * 100)}% weight · {beach.parts[f.id]}/100
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${beach.parts[f.id]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="muted tiny">
        {formula} ≈ {beach.score}. Safety alerts remain visible at every score.
      </p>
    </section>
  )
}

function Stat({ icon, label, value, note }) {
  return (
    <div className="stat">
      <span className="eyebrow">
        <Icon name={icon} size={14} /> {label}
      </span>
      <strong>{value}</strong>
      <span className="muted small">{note}</span>
    </div>
  )
}

function BeachDetail({ beach, isTop, timeWindow, prefs, saved, onToggleSave }) {
  const m = beach.metrics
  const uvLevel = m.peakUv < 3 ? 'Low' : m.peakUv < 6 ? 'Moderate' : m.peakUv < 8 ? 'High' : 'Very high'
  const notes = safetyNotes(m, prefs)
  const crowdNote =
    m.crowdPeakHour > timeWindow.start ? `Busiest around ${shortHour(m.crowdPeakHour)}` : 'Busiest early on'
  const waterNote = m.waterF >= 78 ? 'Warm' : m.waterF >= 70 ? 'Comfortable' : 'Cool · wetsuit useful'

  return (
    <section className="card detail">
      <div className="detail-head">
        <BeachArt beach={beach} />
        <div className="detail-title">
          <span className="eyebrow accent-text">{isTop ? 'Your top match' : 'Selected beach'}</span>
          <h2 className="beach-name">{beach.name}</h2>
          <span className="muted small">{beach.amenities.join(' · ')}</span>
        </div>
        <button
          type="button"
          className={saved ? 'icon-button saved' : 'icon-button'}
          onClick={onToggleSave}
          aria-label={saved ? 'Remove from saved beaches' : 'Save beach'}
          title={saved ? 'Saved' : 'Save beach'}
        >
          <Icon name="bookmark" filled={saved} />
        </button>
      </div>

      <div className="stats">
        <Stat icon="sun" label="Weather" value={`${m.tempF}°F`} note={`${m.condition}${m.rainChance >= 20 ? ` · ${m.rainChance}% rain` : ''}`} />
        <Stat
          icon="wave"
          label={`Tide at ${shortHour(timeWindow.start)}`}
          value={m.tide ? `${m.tide.height.toFixed(1)} ft ${m.tide.rising ? '↑' : '↓'}` : '—'}
          note={m.tide?.next ? `${m.tide.next.type === 'high' ? 'High' : 'Low'} ${m.tide.next.height.toFixed(1)} ft · ${formatClock(m.tide.next.time)}` : 'No more turns today'}
        />
        <Stat
          icon="sun"
          label="Peak UV"
          value={`${Math.round(m.peakUv)} · ${uvLevel}`}
          note={m.highUvHour != null ? `Seek shade after ${shortHour(m.highUvHour)}` : 'Sunscreen still smart'}
        />
        <Stat icon="flag" label="Rip current" value={m.ripRisk} note={`Waves ~${m.waveFt} ft · check local flags`} />
        <Stat icon="people" label="Crowds" value={m.crowdLabel} note={crowdNote} />
        <Stat icon="drop" label="Water" value={`${m.waterF}°F`} note={waterNote} />
      </div>

      <div className={notes.length && m.ripRisk === 'High' ? 'notice danger' : 'notice'}>
        <Icon name="alert" size={16} />
        <div>
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      </div>

      <div className="detail-foot">
        <span className="muted small">
          Forecast · {shortHour(timeWindow.start)}–{shortHour(timeWindow.end)} CT
        </span>
        <button type="button" className="primary-button" disabled title="Trip planning is coming next">
          Plan this beach day <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  )
}

function RankedList({ beaches, selectedId, origin, onSelect }) {
  return (
    <section className="ranked">
      <div className="ranked-head">
        <h2>Your best beach days</h2>
        <span className="muted small">Ranked for you</span>
      </div>
      <ol className="ranked-list">
        {beaches.map((b) => {
          const m = b.metrics
          const active = b.id === selectedId
          return (
            <li key={b.id}>
              <button type="button" className={active ? 'rank-card active' : 'rank-card'} onClick={() => onSelect(b.id)}>
                <div className="rank-main">
                  <strong>{b.name}</strong>
                  <span className="muted small">
                    {formatDuration(b.travel.minutes)} · {b.travel.miles} mi from {origin.name}
                  </span>
                  <span className="rank-tagline">{b.tagline}</span>
                  <span className="tags">
                    <Tag tone={RIP_TONE[m.ripRisk]}>{m.ripRisk} rip risk</Tag>
                    <Tag>{CROWD_TEXT[m.crowdLabel]}</Tag>
                  </span>
                </div>
                <div className="rank-score">
                  <span className="score-number">{b.score}</span>
                  <span className="eyebrow">Match</span>
                  {active && <Icon name="arrowUpRight" size={14} />}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="muted tiny">
        Travel times are rough estimates without traffic. Swimming conditions can change quickly.
      </p>
    </section>
  )
}

export default function Discover({ prefs, setPrefs, saved, toggleSaved, focusId, setFocusId }) {
  const days = useMemo(forecastDays, [])
  const [dayIndex, setDayIndex] = useState(0)
  const [originId, setOriginId] = useState('houston')
  const [windowId, setWindowId] = useState('midday')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const day = days[dayIndex]
  const origin = ORIGINS.find((o) => o.id === originId)
  const timeWindow = TIME_WINDOWS.find((w) => w.id === windowId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/beaches?day=${day.iso}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then((json) => !cancelled && setData(json))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [day.iso])

  const ranked = useMemo(() => (data ? rankBeaches(data, prefs, timeWindow, origin) : []), [data, prefs, timeWindow, origin])
  const selected = ranked.find((b) => b.id === focusId) || ranked[0]
  const top = ranked[0]

  return (
    <main className="discover">
      <aside className="col col-left">
        <section className="intro">
          <span className="eyebrow accent-text">The Texas coast</span>
          <h1>Find your kind of beach day.</h1>
          {selected && (
            <div className="hero-weather">
              <Icon name="sun" size={20} />
              <div>
                <strong>
                  {selected.metrics.tempF}°F · {selected.metrics.condition}
                </strong>
                <span className="muted small">
                  {day.date.toLocaleDateString('en-US', { weekday: 'long' })} outlook · {selected.name}
                </span>
              </div>
            </div>
          )}
        </section>
        <Preferences prefs={prefs} setPrefs={setPrefs} />
        {selected && <WhyScore beach={selected} />}
        <p className="muted tiny sources">
          Weather, UV and waves from <a href="https://open-meteo.com/">Open-Meteo</a> · Tides from{' '}
          <a href="https://tidesandcurrents.noaa.gov/">NOAA</a> · Crowds and rip risk are estimates. Not a safety
          advisory.
        </p>
      </aside>

      <section className="col col-center">
        <div className="controls">
          <Field icon="pin" label="Starting from">
            <select value={originId} onChange={(e) => setOriginId(e.target.value)}>
              {ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}, Texas
                </option>
              ))}
            </select>
          </Field>
          <Field icon="calendar" label="Beach day">
            <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
              {days.map((d) => (
                <option key={d.iso} value={d.index}>
                  {d.index === 0 ? 'Today, ' : d.index === 1 ? 'Tomorrow, ' : ''}
                  {formatDay(d.date)}
                </option>
              ))}
            </select>
          </Field>
          <Field icon="clock" label="Time at the beach">
            <select value={windowId} onChange={(e) => setWindowId(e.target.value)}>
              {TIME_WINDOWS.map((w) => (
                <option key={w.id} value={w.id}>
                  {formatHour(w.start)} - {formatHour(w.end)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error ? (
          <div className="card error">
            Couldn't load beach data ({error}). Is the backend running on port 8000?
          </div>
        ) : (
          <div className="map-area">
            <div className="map-bar">
              <span>
                <Icon name="map" size={16} /> Texas coast
                {selected && (
                  <span className="muted small coords">
                    {' '}
                    {selected.lat.toFixed(2)}° N, {Math.abs(selected.lon).toFixed(2)}° W
                  </span>
                )}
              </span>
              <span className="map-bar-meta">
                <span className="range-pill" title="Forecasts get less reliable further out">
                  {dayIndex <= 2 ? 'Short-range' : 'Mid-range'}
                </span>
                <span className="muted small">{ranked.length || 12} beaches</span>
              </span>
            </div>
            <div className="map-wrap">
              {data ? (
                <BeachMap beaches={ranked} selected={selected} origin={origin} onSelect={setFocusId} />
              ) : (
                <div className="map-placeholder muted">{loading ? 'Loading forecast…' : ''}</div>
              )}
            </div>
            <div className="map-legend">
              <span>
                <strong>Your match / 100</strong>
                <span className="legend-great">80+ Great fit</span>
                <span className="legend-mixed">60–79 Mixed fit</span>
                <span className="legend-poor">Under 60 Poor fit</span>
              </span>
              <span className="muted tiny">Scores are not safety ratings</span>
            </div>
          </div>
        )}
      </section>

      <aside className="col col-right">
        {selected && (
          <BeachDetail
            beach={selected}
            isTop={selected.id === top.id}
            timeWindow={timeWindow}
            prefs={prefs}
            saved={saved.some((s) => s.id === selected.id)}
            onToggleSave={() => toggleSaved(selected)}
          />
        )}
        {data && <RankedList beaches={ranked} selectedId={selected?.id} origin={origin} onSelect={setFocusId} />}
      </aside>
    </main>
  )
}
