import { useEffect, useMemo, useState } from 'react'
import BeachMap from './BeachMap.jsx'
import Icon from './Icon.jsx'
import {
  API_URL,
  ORIGINS,
  SOURCE_KINDS,
  TIME_WINDOWS,
  formatClock,
  formatDay,
  formatDuration,
  formatHour,
  milesBetween,
  shortDate,
  shortHour,
  timeAgo,
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

// Small colored dot + label saying how a number was produced (measured, official, estimate…)
function SourceDot({ kind, text }) {
  const k = SOURCE_KINDS[kind]
  return (
    <span className={`source-dot kind-${kind}`} title={`${k.label}: ${text || k.hint}`}>
      <i aria-hidden="true" />
      {k.label}
    </span>
  )
}

const RIP_TONE = { Low: 'neutral', Moderate: 'warn', High: 'danger' }
const QUALITY_TONE = { Low: 'neutral', Medium: 'warn', High: 'danger' }
const CROWD_TEXT = { Quiet: 'Quiet', Moderate: 'Moderate crowds', Busy: 'Busy' }

function BeachArt({ beach }) {
  if (beach.photo) {
    return (
      <a className="beach-photo" href={beach.photo.page} target="_blank" rel="noreferrer" title={`Photo: ${beach.photo.credit} (${beach.photo.license}), Wikimedia Commons`}>
        <img src={beach.photo.url} alt={beach.name} loading="lazy" />
      </a>
    )
  }
  // Simple generated scene when there's no photo
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
    { key: 'crowds', title: 'Crowds' },
    { key: 'sun', title: 'UV level' },
    { key: 'swimming', title: 'Getting in the water' },
    { key: 'waves', title: 'Waves' },
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
            <div className="pref-head">{title}</div>
            <Segmented
              label={title}
              options={options}
              value={prefs[key]}
              onChange={(v) => setPrefs({ ...prefs, [key]: v })}
            />
            <p className="pref-hint muted">{options.find((o) => o.id === prefs[key]).hint}</p>
          </div>
        )
      })}
      <p className="muted small">Safety alerts always show, whatever you pick here.</p>
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
              <span>
                {f.label}
                {f.id === 'crowds' && <span className="muted tiny"> · estimate</span>}
              </span>
              <span className="muted small">
                {Math.round(f.weight * 100)}% · {beach.parts[f.id]}/100
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

function Stat({ icon, label, value, note, kind, source }) {
  return (
    <div className="stat">
      <span className="stat-label">
        <span className="eyebrow">
          <Icon name={icon} size={13} /> {label}
        </span>
        <SourceDot kind={kind} text={source} />
      </span>
      <strong>{value}</strong>
      <span className="muted small">{note}</span>
    </div>
  )
}

function ConditionsTab({ m, timeWindow }) {
  const uvLevel = m.peakUv < 3 ? 'Low' : m.peakUv < 6 ? 'Moderate' : m.peakUv < 8 ? 'High' : 'Very high'
  const crowdNote =
    m.crowdPeakHour > timeWindow.start ? `Busiest around ${shortHour(m.crowdPeakHour)}` : 'Busiest early on'
  const waterNote = m.water.f >= 78 ? 'Warm' : m.water.f >= 70 ? 'Comfortable' : 'Cool · wetsuit useful'
  const measuredAt = (x) => (x.time ? ` · ${formatClock(x.time.replace('T', ' ').slice(0, 16))}` : '')

  return (
    <>
      <div className="stats">
        <Stat
          icon="sun"
          label="Weather"
          value={`${m.tempF}°F (${Math.round((m.tempF-32) * 10/1.8) / 10}°C)`}
          note={`${m.condition}${m.rainChance >= 20 ? ` · ${m.rainChance}% rain` : ''}`}
          kind="forecast"
          source="Open-Meteo forecast"
        />
        <Stat
          icon="wave"
          label="Wind"
          value={`${m.wind.mph} mph ${m.wind.dir || ''}`}
          note={m.wind.kind === 'measured' ? `Now${m.wind.gust ? `, gusts ${m.wind.gust}` : ''}${measuredAt(m.wind)}` : 'Average for your window'}
          kind={m.wind.kind}
          source={m.wind.source}
        />
        <Stat
          icon="sun"
          label="Peak UV"
          value={Math.round(m.peakUv)}
          note={`${uvLevel}${m.highUvHour != null ? ` · shade after ${shortHour(m.highUvHour)}` : ''}`}
          kind="forecast"
          source="Open-Meteo forecast"
        />
        <Stat
          icon="flag"
          label="Rip current"
          value={m.rip.level}
          note={m.rip.kind === 'official' ? 'NWS forecast' : 'Estimate'}
          kind={m.rip.kind}
          source={m.rip.source}
        />
        <Stat
          icon="wave"
          label="Waves"
          value={`${m.waves.ft} ft`}
          note={m.waves.kind === 'measured' ? `Buoy now${measuredAt(m.waves)}` : m.surfHeight ? `NWS surf: ${m.surfHeight}` : 'Model average'}
          kind={m.waves.kind}
          source={m.waves.source}
        />
        <Stat
          icon="drop"
          label="Water"
          value={`${m.water.f}°F (${Math.round((m.water.f-32) * 10/1.8) / 10}°C)`}
          note={m.water.kind === 'measured' ? `${waterNote}${measuredAt(m.water)}` : waterNote}
          kind={m.water.kind}
          source={m.water.source}
        />
        <Stat
          icon="wave"
          label={`Tide at ${shortHour(timeWindow.start)}`}
          value={m.tide ? `${m.tide.height.toFixed(1)} ft ${m.tide.rising ? '↑' : '↓'}` : '—'}
          note={m.tide?.next ? `${m.tide.next.type === 'high' ? 'High' : 'Low'} ${formatClock(m.tide.next.time)}` : 'No more turns today'}
          kind="official"
          source={m.tide ? `NOAA tide prediction, station ${m.tide.station}` : 'Unavailable'}
        />
        <Stat icon="people" label="Crowds" value={m.crowdLabel} note={crowdNote} kind="estimate" source="Modeled from day, season, hour and weather. No live crowd data yet." />
        <Stat
          icon="sun"
          label="Daylight"
          value={formatClock(m.sun.sunrise)}
          note={`Sunset ${formatClock(m.sun.sunset)}`}
          kind="forecast"
          source="Open-Meteo astronomy"
        />
      </div>
      <div className="source-legend">
        {['measured', 'official', 'forecast', 'estimate'].map((k) => (
          <SourceDot key={k} kind={k} />
        ))}
      </div>
    </>
  )
}

const FLAGS = [
  { color: 'green', text: 'Calm conditions, still swim with care' },
  { color: 'yellow', text: 'Moderate surf or currents' },
  { color: 'red', text: 'Dangerous surf or strong currents' },
  { color: 'double-red', text: 'Water closed to the public' },
  { color: 'purple', text: 'Dangerous marine life (jellyfish, stingrays)' },
  { color: 'orange', text: 'Environmental warning (air or water quality)' },
]

function SafetyTab({ beach, m, notes }) {
  const wq = m.waterQuality
  return (
    <div className="safety">
      <ul className="notes">
        {notes.map((n) => (
          <li key={n.text} className={`note note-${n.level}`}>
            <Icon name="alert" size={15} />
            <span>{n.text}</span>
          </li>
        ))}
      </ul>

      {m.alerts.map((a) => (
        <details key={a.id} className="alert-detail">
          <summary>
            <strong>{a.event}</strong>
            <span className="muted tiny">
              {a.ends ? `until ${new Date(a.ends).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
            </span>
          </summary>
          <p className="small">{a.description}</p>
          {a.instruction && <p className="small"><strong>What to do:</strong> {a.instruction}</p>}
          <a className="small" href={a.url} target="_blank" rel="noreferrer">
            Full alert from {a.sender || 'NWS'}
          </a>
        </details>
      ))}

      <div className="safety-row">
        <span className="eyebrow"><Icon name="flag" size={13} /> Rip current</span>
        <span>
          <Tag tone={RIP_TONE[m.rip.level]}>{m.rip.level} risk</Tag>{' '}
          <span className="muted small">
            {m.rip.source}
            {m.rip.issued ? ` · issued ${timeAgo(m.rip.issued)}` : ''}
          </span>
        </span>
      </div>

      <div className="safety-row">
        <span className="eyebrow"><Icon name="drop" size={13} /> Water quality</span>
        {wq ? (
          <span>
            <Tag tone={QUALITY_TONE[wq.level]}>{wq.level === 'Low' ? 'Low bacteria' : `${wq.level} bacteria advisory`}</Tag>{' '}
            <span className="muted small">
              {wq.result} at {wq.name} ({wq.distance_km} km), sampled {shortDate(wq.date)} ·{' '}
              <a href={wq.url} target="_blank" rel="noreferrer">Texas Beach Watch</a>
            </span>
          </span>
        ) : (
          <span className="muted small">No Texas Beach Watch sampling station within 5 km.</span>
        )}
      </div>

      <div className="flags">
        <span className="eyebrow">Beach warning flags</span>
        <p className="muted small">
          {beach.patrol_url ? (
            <>
              Today's flag is posted by the beach patrol:{' '}
              <a href={beach.patrol_url} target="_blank" rel="noreferrer">check the live flag status</a>.
            </>
          ) : (
            "This beach's flag isn't published online. Check the flag at the beach access before you swim."
          )}
        </p>
        <ul className="flag-list">
          {FLAGS.map((f) => (
            <li key={f.color}>
              <i className={`flag-swatch flag-${f.color}`} aria-hidden="true" />
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SourcesTab({ m, beach, travel }) {
  const rows = [
    ['Weather, UV, daylight', 'forecast', 'Open-Meteo forecast', null],
    ['Wind', m.wind.kind, m.wind.source, m.wind.url],
    ['Waves', m.waves.kind, m.waves.source, m.waves.url],
    ['Water temperature', m.water.kind, m.water.source, m.water.url],
    ['Rip current risk', m.rip.kind, m.rip.source, m.rip.url],
    ['NWS alerts', 'official', `NWS alerts for zone ${beach.nws_zone}`, 'https://alerts.weather.gov/'],
    ['Tide', 'official', m.tide ? `NOAA station ${m.tide.station}` : 'Unavailable', m.tide?.url],
    ['Water quality', 'sampled', m.waterQuality ? `Texas Beach Watch, ${m.waterQuality.name}` : 'No station nearby', m.waterQuality?.url],
    ['Drive time', travel.source === 'tomtom' ? 'measured' : travel.source === 'osrm' ? 'route' : 'estimate',
      { tomtom: 'TomTom routing with traffic', osrm: 'OSRM road routing (no traffic)', estimate: 'Straight-line estimate' }[travel.source], null],
    ['Crowds', 'estimate', 'Estimate. Live crowd data is planned.', null],
  ]
  return (
    <>
      <table className="sources-table">
        <tbody>
          {rows.map(([what, kind, text, url]) => (
            <tr key={what}>
              <td>{what}</td>
              <td><SourceDot kind={kind} text={text} /></td>
              <td className="muted small">{url ? <a href={url} target="_blank" rel="noreferrer">{text}</a> : text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted tiny photo-credit">
        Google Maps and Yelp star ratings are shown for reference and are not part of the score. Live cams belong to
        their owners and play from their sites.
      </p>
      {beach.photo && (
        <p className="muted tiny photo-credit">
          Photo: <a href={beach.photo.page} target="_blank" rel="noreferrer">{beach.photo.credit}</a>, {beach.photo.license}, via Wikimedia Commons
        </p>
      )}
    </>
  )
}

// Public live cams at or near the beach. Players are the owners' own embeds; cams that can't be
// embedded open on the owner's site instead.
function CamTab({ beach }) {
  const [index, setIndex] = useState(0)
  const cams = beach.cams || []
  if (cams.length === 0) {
    return (
      <div className="cam-empty muted small">
        <Icon name="camera" size={22} />
        <span>No public live cam found for {beach.name} yet.</span>
      </div>
    )
  }
  const cam = cams[Math.min(index, cams.length - 1)]
  const miles = milesBetween(beach, cam)
  return (
    <div className="cam-tab">
      {cams.length > 1 && (
        <div className="cam-picker" role="tablist">
          {cams.map((c, i) => (
            <button key={c.name} type="button" role="tab" aria-selected={c === cam} className={c === cam ? 'active' : ''} onClick={() => setIndex(i)}>
              {c.name}
              {!c.embed && <Icon name="arrowUpRight" size={11} />}
            </button>
          ))}
        </div>
      )}
      {cam.embed ? (
        <div className="cam-frame">
          <iframe
            key={cam.embed}
            src={cam.embed}
            title={`${cam.name} live cam`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <a className="cam-frame cam-link" href={cam.page} target="_blank" rel="noreferrer">
          <Icon name="camera" size={26} />
          <span>{cam.provider} doesn't allow this cam to play here</span>
          <strong>
            Watch on {cam.provider} <Icon name="arrowUpRight" size={13} />
          </strong>
        </a>
      )}
      <div className="cam-caption">
        <span className="live-dot" aria-hidden="true" />
        <span>
          <strong>{cam.name}</strong>
          <span className="muted small">
            {' '}
            · {miles < 1 ? 'at this beach' : `about ${Math.round(miles)} mi from ${beach.name}`}
          </span>
        </span>
        <a className="small" href={cam.page} target="_blank" rel="noreferrer">
          {cam.provider} <Icon name="arrowUpRight" size={11} />
        </a>
      </div>
    </div>
  )
}

const REVIEW_SITES = [
  ['google', 'Google'],
  ['yelp', 'Yelp'],
]

// Star ratings from Google Maps and Yelp, for reference only (they don't affect the score)
function Ratings({ reviews }) {
  if (!reviews) return null
  return (
    <div className="ratings">
      {REVIEW_SITES.map(([site, label]) => {
        const r = reviews[site]
        if (!r) return null
        const rated = r.rating != null
        return (
          <a
            key={site}
            className="rating"
            href={r.url}
            target="_blank"
            rel="noreferrer"
            title={rated ? `${r.rating} out of 5 from ${r.count.toLocaleString()} ${label} reviews. Not part of the score.` : `See reviews on ${label}`}
          >
            {rated ? (
              <>
                <span className="stars" style={{ '--pct': `${(r.rating / 5) * 100}%` }} aria-hidden="true">
                  ★★★★★
                </span>
                <strong>{r.rating.toFixed(1)}</strong>
                <span className="muted">
                  {label} ({r.count.toLocaleString()})
                </span>
              </>
            ) : (
              <span className="muted">
                {label} reviews <Icon name="arrowUpRight" size={11} />
              </span>
            )}
          </a>
        )
      })}
    </div>
  )
}

function BeachDetail({ beach, isTop, timeWindow, prefs, saved, onToggleSave, reviews }) {
  const [tab, setTab] = useState('conditions')
  const m = beach.metrics
  const notes = safetyNotes(m, prefs)
  const serious = notes.filter((n) => n.level !== 'info')
  const worst = serious.some((n) => n.level === 'danger') ? 'danger' : 'warn'

  return (
    <section className="card detail">
      <div className="detail-head">
        <BeachArt beach={beach} />
        <div className="detail-title">
          <span className="eyebrow accent-text">{isTop ? 'Your top match' : 'Selected beach'}</span>
          <h2 className="beach-name">{beach.name}</h2>
          <span className="muted small">{beach.amenities.join(' · ')}</span>
          <Ratings reviews={reviews} />
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

      {serious.length > 0 && tab !== 'safety' && (
        <button type="button" className={`alert-strip ${worst}`} onClick={() => setTab('safety')}>
          <Icon name="alert" size={15} />
          <span>{serious[0].text}</span>
          {serious.length > 1 && <span className="alert-more">+{serious.length - 1}</span>}
        </button>
      )}

      <div className="detail-tabs" role="tablist">
        {[
          ['conditions', 'Conditions'],
          ['safety', `Safety${serious.length ? ` (${serious.length})` : ''}`],
          ['cams', `Live cam${beach.cams?.length > 1 ? `s (${beach.cams.length})` : ''}`],
          ['sources', 'Sources'],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="detail-body">
        {tab === 'conditions' && <ConditionsTab m={m} timeWindow={timeWindow} />}
        {tab === 'safety' && <SafetyTab beach={beach} m={m} notes={notes} />}
        {tab === 'cams' && <CamTab beach={beach} />}
        {tab === 'sources' && <SourcesTab m={m} beach={beach} travel={beach.travel} />}
      </div>

      <div className="detail-foot">
        <span className="muted small">
          {shortHour(timeWindow.start)}–{shortHour(timeWindow.end)} CT · {formatDuration(beach.travel.minutes)} drive
        </span>
        <button type="button" className="primary-button" disabled title="Trip planning is coming next">
          Plan this beach day <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  )
}

function RankedList({ beaches, selectedId, originName, travelInfo, onSelect }) {
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
                    {formatDuration(b.travel.minutes)} · {b.travel.miles} mi from {originName}
                    {b.travel.delay_minutes > 5 ? ` · +${b.travel.delay_minutes} min traffic` : ''}
                  </span>
                  <span className="rank-tagline">{b.tagline}</span>
                  <span className="tags">
                    {m.alerts.length > 0 && <Tag tone="danger">{m.alerts.length === 1 ? m.alerts[0].event : `${m.alerts.length} NWS alerts`}</Tag>}
                    <Tag tone={RIP_TONE[m.rip.level]}>
                      {m.rip.level} rip risk{m.rip.kind === 'official' ? ' · NWS' : ''}
                    </Tag>
                    {m.waterQuality && m.waterQuality.level !== 'Low' && (
                      <Tag tone={QUALITY_TONE[m.waterQuality.level]}>{m.waterQuality.level} bacteria</Tag>
                    )}
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
      <p className="muted tiny">{travelInfo} Swimming conditions can change quickly.</p>
    </section>
  )
}

const TRAVEL_NOTES = {
  tomtom: 'Drive times from TomTom, including traffic.',
  osrm: 'Drive times on real roads (OSRM), without traffic.',
  estimate: 'Drive times are rough straight-line estimates.',
}

export default function Discover({ prefs, setPrefs, saved, toggleSaved, focusId, setFocusId, onStatus }) {
  const [day, setDay] = useState(null)
  const [originId, setOriginId] = useState('houston')
  const [myLocation, setMyLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [windowId, setWindowId] = useState('midday')
  const [data, setData] = useState(null)
  const [travel, setTravel] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const origin = originId === 'current' && myLocation ? myLocation : ORIGINS.find((o) => o.id === originId) || ORIGINS[0]
  const timeWindow = TIME_WINDOWS.find((w) => w.id === windowId)
  const days = data?.days || []
  const dayIndex = data ? days.indexOf(data.date) : 0
  const isToday = dayIndex === 0

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/beaches${day ? `?day=${day}` : ''}`)
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
  }, [day])

  // Review stars don't change with the day or preferences, so load them once
  useEffect(() => {
    fetch(`${API_URL}/reviews`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setReviews)
      .catch(() => setReviews(null))
  }, [])

  // Drive times depend on the starting point and, with TomTom, on when you leave
  const departDay = data?.date
  useEffect(() => {
    if (!departDay) return
    let cancelled = false
    const params = new URLSearchParams({
      lat: origin.lat,
      lon: origin.lon,
      day: departDay,
      hour: Math.max(0, timeWindow.start - 2),
      utc_offset: data.utc_offset,
    })
    fetch(`${API_URL}/travel?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((json) => !cancelled && setTravel(json))
      .catch(() => !cancelled && setTravel(null))
    return () => {
      cancelled = true
    }
  }, [origin.lat, origin.lon, departDay, timeWindow.start, data?.utc_offset])

  useEffect(() => {
    onStatus?.(data ? { sources: data.sources, generated: data.generated, travel: travel?.provider || 'estimate', loading } : null)
  }, [data, travel, loading, onStatus])

  const chooseOrigin = (id) => {
    setLocationError(null)
    if (id !== 'current') {
      setOriginId(id)
      return
    }
    if (!navigator.geolocation) {
      setLocationError('Location is not available in this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ id: 'current', name: 'your location', lat: pos.coords.latitude, lon: pos.coords.longitude })
        setOriginId('current')
      },
      () => setLocationError('Location permission was denied'),
      { timeout: 10000 },
    )
  }

  const ranked = useMemo(
    () => (data ? rankBeaches(data.beaches, prefs, timeWindow, origin, travel?.routes, isToday) : []),
    [data, prefs, timeWindow, origin, travel, isToday],
  )
  const selected = ranked.find((b) => b.id === focusId) || ranked[0]
  const top = ranked[0]
  const range = dayIndex <= 2 ? 'Short-range' : dayIndex <= 7 ? 'Mid-range' : 'Long-range'

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
                  {isToday ? 'Today' : formatDay(data.date)} · {selected.name}
                </span>
              </div>
            </div>
          )}
        </section>
        <Preferences prefs={prefs} setPrefs={setPrefs} />
        {selected && <WhyScore beach={selected} />}
        <p className="muted tiny sources">
          Live data from Open-Meteo, NOAA, the National Weather Service and Texas Beach Watch. Crowds are estimates.
          Not a safety advisory.
        </p>
      </aside>

      <section className="col col-center">
        <div className="controls">
          <Field icon="pin" label="Starting from">
            <select value={originId} onChange={(e) => chooseOrigin(e.target.value)}>
              <option value="current">{myLocation ? 'My location' : 'Use my location…'}</option>
              {ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}, Texas
                </option>
              ))}
            </select>
          </Field>
          <Field icon="calendar" label="Beach day">
            <select value={data?.date || ''} onChange={(e) => setDay(e.target.value)} disabled={!data}>
              {days.map((d, i) => (
                <option key={d} value={d}>
                  {i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}
                  {formatDay(d)}
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
        {locationError && <p className="muted small location-error">{locationError}</p>}

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
                {loading && data && <span className="muted small">Updating…</span>}
                <span
                  className="range-pill"
                  title={dayIndex > 2 ? 'Official rip current forecasts only cover the next 2 days; further out uses estimates' : 'Official NWS surf forecasts cover this day'}
                >
                  {range}
                </span>
              </span>
            </div>
            <div className="map-wrap">
              {data ? (
                <BeachMap beaches={ranked} selected={selected} origin={origin} onSelect={setFocusId} />
              ) : (
                <div className="map-placeholder muted">{loading ? 'Loading live data…' : ''}</div>
              )}
            </div>
          </div>
        )}
      </section>

      <aside className="col col-right">
        {selected && (
          <BeachDetail
            key={selected.id}
            beach={selected}
            isTop={selected.id === top.id}
            timeWindow={timeWindow}
            prefs={prefs}
            saved={saved.some((s) => s.id === selected.id)}
            onToggleSave={() => toggleSaved(selected)}
            reviews={reviews?.beaches[selected.id]}
          />
        )}
        {data && (
          <RankedList
            beaches={ranked}
            selectedId={selected?.id}
            originName={origin.name}
            travelInfo={TRAVEL_NOTES[travel?.provider || 'estimate']}
            onSelect={setFocusId}
          />
        )}
      </aside>
    </main>
  )
}
