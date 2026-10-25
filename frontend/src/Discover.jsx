import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import BeachMap from './BeachMap.jsx'
import CamPlayer from './CrowdVision.jsx'
import TideGauge from './Gauge.jsx'
import Icon from './Icon.jsx'
import {
  API_URL,
  ORIGINS,
  SOURCE_KINDS,
  TIME_WINDOWS,
  addDays,
  coastNow,
  formatClock,
  formatDay,
  formatDuration,
  milesBetween,
  shortDate,
  shortHour,
  timeAgo,
  weekday,
  windowLabel,
} from './data.js'
import {
  FLAGS,
  PREFERENCE_OPTIONS,
  conditionFlags,
  headline,
  pitch,
  prefConflict,
  rankBeaches,
  remainingWindow,
  ripLine,
  safetyNotes,
  scoreBreakdown,
  shortName,
  waveText,
  windowViable,
} from './scoring.js'

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A small lifeguard flag. The color is the hazard level and that's the only place these colors appear.
export function Flag({ color, size = 14, title }) {
  if (!color) return <span className="flag-none" style={{ width: size }} aria-hidden="true" />
  const label = title || FLAGS[color].label
  return (
    <svg className={`flag flag-${color}`} width={size} height={size} viewBox="0 0 14 14" role="img" aria-label={label}>
      <title>{label}</title>
      <rect className="flag-pole" x="1" y="0.5" width="1.5" height="13.5" rx="0.5" />
      {color === 'double-red' ? (
        <>
          <rect className="flag-cloth" x="2.5" y="1" width="9.5" height="4" />
          <rect className="flag-cloth" x="2.5" y="6" width="9.5" height="4" />
        </>
      ) : (
        <rect className="flag-cloth" x="2.5" y="1" width="10" height="7" />
      )}
    </svg>
  )
}

function Est({ children = 'estimate', title }) {
  return (
    <span className="est" title={title || 'Rough estimate, not live data'}>
      {children}
    </span>
  )
}

// An inline picker inside the trip sentence. The real <select> covers the word, so a click
// anywhere on it opens the menu.
function Pick({ label, display, value, onChange, disabled, children }) {
  return (
    <label className={disabled ? 'pick disabled' : 'pick'}>
      <span className="pick-value">{display}</span>
      <Icon name="chevron" size={14} className="pick-chevron" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {children}
      </select>
    </label>
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
          title={o.title}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const PREF_ROWS = [
  { key: 'crowds', title: 'Crowds' },
  { key: 'sun', title: 'Sun' },
  { key: 'swimming', title: 'Water' },
  { key: 'waves', title: 'Waves' },
]

function Preferences({ prefs, setPrefs, conflict }) {
  return (
    <div className="prefs">
      <div className="pref-groups">
        {PREF_ROWS.map(({ key, title }) => (
          <div className="pref" key={key}>
            <span className="pref-title">{title}</span>
            <Segmented label={title} options={PREFERENCE_OPTIONS[key]} value={prefs[key]} onChange={(v) => setPrefs({ ...prefs, [key]: v })} />
          </div>
        ))}
      </div>
      {conflict && <p className="pref-conflict">{conflict}</p>}
    </div>
  )
}

// Wikimedia thumbnails can be requested at any width; ask for one big enough for the hero
const bigPhoto = (url) => url.replace(/\/\d+px-/, '/1280px-')

// Drawn stand-in for beaches without a photo: a vintage road-sign sunset over the Gulf
function DrawnScene() {
  return (
    <svg className="hero-img drawn" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="drawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2d44" />
          <stop offset="0.55" stopColor="#1c6f86" />
          <stop offset="1" stopColor="#7fd1c7" />
        </linearGradient>
        <clipPath id="drawn-sun">
          <circle cx="560" cy="250" r="120" />
        </clipPath>
      </defs>
      <rect width="800" height="420" fill="url(#drawn-sky)" />
      <g clipPath="url(#drawn-sun)">
        <rect x="430" y="120" width="260" height="140" fill="#f6c58a" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="430" y={196 + i * 13} width="260" height={3 + i * 1.5} fill="#1c6f86" />
        ))}
      </g>
      <rect y="250" width="800" height="170" fill="#12506e" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M0 ${270 + i * 26} q50 -8 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0`} stroke="#2fb8b4" strokeOpacity={0.5 - i * 0.08} strokeWidth="3" fill="none" />
      ))}
      <path d="M0 372 Q200 350 420 366 T800 356 V420 H0Z" fill="#e9d8b8" />
    </svg>
  )
}

function HeroImage({ beach }) {
  const [src, setSrc] = useState(beach.photo ? bigPhoto(beach.photo.url) : null)
  if (!src) return <DrawnScene />
  return (
    <img
      className="hero-img"
      src={src}
      alt=""
      onError={() => setSrc(src !== beach.photo.url ? beach.photo.url : null)}
    />
  )
}

function Hero({ beach, isTop, outOfRange, dayLabel, prefs, origin, onBackToTop, total }) {
  const m = beach.metrics
  const { reason, tradeoffs } = pitch(beach, prefs)
  const rip = ripLine(m, prefs)
  const directions = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${beach.lat},${beach.lon}`
  const kicker = outOfRange
    ? `Past your drive limit · ${formatDuration(beach.travel.minutes)} away`
    : isTop
      ? dayLabel
      : `#${beach.rank} of ${total} · ${dayLabel}`

  return (
    <section className="hero" aria-live="polite">
      <HeroImage key={beach.id} beach={beach} />
      <div className="hero-shade" />
      <div className="hero-body">
        <p className="hero-kicker">{kicker}</p>
        <h1 className="hero-title">{isTop && !outOfRange ? headline(beach) : beach.name}</h1>
        <p className="hero-reason">{reason}</p>
        {tradeoffs.length > 0 && <p className="hero-but">Warning: {tradeoffs.join(', ')}.</p>}
        {rip && (
          <p className={`hero-rip rip-${m.rip.level.toLowerCase()}`}>
            <Flag color={conditionFlags(m).rip} size={16} />
            <span>{rip}</span>
          </p>
        )}
        <div className="hero-actions">
          <a className="primary-button" href={directions} target="_blank" rel="noreferrer">
            Directions <Icon name="arrowUpRight" size={16} />
          </a>
          {!isTop && (
            <button type="button" className="text-button on-photo" onClick={onBackToTop}>
              Back to the top pick
            </button>
          )}
        </div>
      </div>
      <div className="hero-gauge">
        <TideGauge score={beach.score} />
      </div>
      {beach.photo && (
        <a className="hero-credit" href={beach.photo.page} target="_blank" rel="noreferrer">
          Photo: {beach.photo.credit}, {beach.photo.license}
        </a>
      )}
      <svg className="hero-waterline" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 14 C150 2 300 2 450 12 S750 24 900 12 S1100 4 1200 10 V24 H0Z" />
      </svg>
    </section>
  )
}

function HeroMessage({ title, children, loading }) {
  return (
    <section className={loading ? 'hero hero-message loading' : 'hero hero-message'}>
      <div className="hero-body">
        <h1 className="hero-title">{title}</h1>
        {children}
      </div>
      {loading && (
        <div className="hero-gauge">
          <TideGauge score={0} empty />
        </div>
      )}
    </section>
  )
}

function Cond({ flag, label, value, note, est, live }) {
  return (
    <div className="cond">
      <span className="cond-label">
        <Flag color={flag} size={13} />
        {label}
        {est && <Est />}
      </span>
      <strong className="cond-value">{value}</strong>
      {note && <span className="cond-note">{note}</span>}
      {live && <span className="cond-live">{live}</span>}
    </div>
  )
}

const clock = (time) => formatClock(time.replace('T', ' ').slice(0, 16))

function Conditions({ beach, dayLabel, reviews }) {
  const m = beach.metrics
  const f = conditionFlags(m)
  const uvWord = m.peakUv < 3 ? 'Low' : m.peakUv < 6 ? 'Moderate' : m.peakUv < 8 ? 'High' : 'Very high'
  const waterWord = m.water.f >= 78 ? 'Warm' : m.water.f >= 70 ? 'Comfortable' : 'Cool, a wetsuit helps'
  const live = m.live

  return (
    <section className="conditions">
      <div className="section-head">
        <h2>
          {dayLabel} at {shortName(beach)}
        </h2>
        <Ratings reviews={reviews} />
      </div>
      <div className="cond-grid">
        <Cond
          flag={f.weather}
          label="Weather"
          value={`${m.tempF}°F`}
          note={`${m.condition}${m.rainChance >= 20 ? `, ${m.rainChance}% rain` : ''}`}
        />
        <Cond
          flag={f.wind}
          label="Wind"
          value={`${m.wind.mph} mph`}
          note={`From the ${m.wind.dir}`}
          live={live?.wind && `Now ${live.wind.mph} mph${live.wind.gust ? `, gusts ${live.wind.gust}` : ''} (${clock(live.wind.time)})`}
        />
        <Cond
          flag={f.sun}
          label="UV"
          value={m.peakUv}
          note={`${uvWord}${m.highUvHour != null ? `, shade after ${shortHour(m.highUvHour)}` : ''}`}
        />
        <Cond
          flag={f.waves}
          label="Waves"
          value={waveText(m.waves)}
          note={m.waves.nws ? 'NWS surf forecast' : 'Marine model'}
          live={live?.waves && `Buoy reads ${live.waves.ft} ft (${clock(live.waves.time)})`}
        />
        <Cond
          flag={f.water}
          label="Water"
          value={`${m.water.f}°F`}
          note={waterWord}
          live={live?.water && `Sensor reads ${live.water.f}°F (${clock(live.water.time)})`}
        />
        <Cond
          flag={f.rip}
          label="Rip current"
          value={m.rip.level}
          note={m.rip.kind === 'official' ? 'NWS forecast' : <Est title={m.rip.source}>our estimate</Est>}
        />
      </div>
      <dl className="cond-more">
        <div>
          <dt>Crowds <Est /></dt>
          <dd>
            {m.crowdLabel}
            {m.crowdPeakHour > m.hours.start ? `, busiest around ${shortHour(m.crowdPeakHour)}` : ''}
          </dd>
        </div>
        <div>
          <dt>Tide at {shortHour(m.hours.start)}</dt>
          <dd>
            {m.tide ? `${m.tide.rising ? 'Rising' : 'Falling'}${m.tide.next ? `, ${m.tide.next.type} at ${formatClock(m.tide.next.time)}` : ''}` : 'Unavailable'}
          </dd>
        </div>
        <div>
          <dt>Daylight</dt>
          <dd>
            {formatClock(m.sun.sunrise)} to {formatClock(m.sun.sunset)}
          </dd>
        </div>
        <div>
          <dt>Drive {beach.travel.source === 'estimate' && <Est />}</dt>
          <dd>
            {formatDuration(beach.travel.minutes)}, {beach.travel.miles} mi
            {beach.travel.delay_minutes > 5 ? ` (+${beach.travel.delay_minutes} min traffic)` : ''}
          </dd>
        </div>
      </dl>
      {beach.amenities?.length > 0 && <p className="amenities">{beach.amenities.join(' · ')}</p>}
    </section>
  )
}

const REVIEW_SITES = [
  ['google', 'Google'],
  ['yelp', 'Yelp'],
]

// Star ratings from Google Maps and Yelp, for reference only (they don't affect the score)
function Ratings({ reviews }) {
  if (!reviews) return null
  const rated = REVIEW_SITES.filter(([site]) => reviews[site]?.rating != null)
  if (!rated.length) return null
  return (
    <div className="ratings">
      {rated.map(([site, label]) => {
        const r = reviews[site]
        return (
          <a
            key={site}
            className="rating"
            href={r.url}
            target="_blank"
            rel="noreferrer"
            title={`${r.rating} out of 5 from ${r.count.toLocaleString()} ${label} reviews${r.name ? ` of ${r.name}` : ''}${r.as_of ? `, as of ${formatDay(r.as_of)}` : ''}. Not part of the score.`}
          >
            <span className="stars" style={{ '--pct': `${(r.rating / 5) * 100}%` }} aria-hidden="true">
              ★★★★★
            </span>
            <strong>{r.rating.toFixed(1)}</strong> {label}
          </a>
        )
      })}
    </div>
  )
}

function SafetyTab({ beach, m, notes }) {
  const wq = m.waterQuality
  return (
    <div className="safety">
      {notes.length > 0 && (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.text} className={`note note-${n.level}`}>
              {n.text}
            </li>
          ))}
        </ul>
      )}

      {m.alerts.map((a) => (
        <details key={a.id} className="alert-detail">
          <summary>
            <strong>{a.event}</strong>
            {a.ends && (
              <span className="muted small">
                {' '}
                until {new Date(a.ends).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </summary>
          <p className="small">{a.description}</p>
          {a.instruction && (
            <p className="small">
              <strong>What to do:</strong> {a.instruction}
            </p>
          )}
          <a className="small" href={a.url} target="_blank" rel="noreferrer">
            Full alert from {a.sender || 'NWS'}
          </a>
        </details>
      ))}

      <dl className="safety-rows">
        <div>
          <dt>
            <Flag color={conditionFlags(m).rip} /> Rip current
          </dt>
          <dd>
            {m.rip.level} risk. <span className="muted">{m.rip.source}{m.rip.issued ? `, issued ${timeAgo(m.rip.issued)}` : ''}.</span>
          </dd>
        </div>
        <div>
          <dt>
            <Flag color={conditionFlags(m).quality} /> Water quality
          </dt>
          {wq ? (
            <dd>
              {wq.level === 'Low' ? 'Low bacteria.' : `${wq.level} bacteria advisory.`}{' '}
              <span className="muted">
                {wq.result} at {wq.name} ({wq.distance_km} km away), sampled {shortDate(wq.date)} by{' '}
                <a href={wq.url} target="_blank" rel="noreferrer">Texas Beach Watch</a>.
              </span>
            </dd>
          ) : (
            <dd className="muted">No Texas Beach Watch sampling station within 5 km.</dd>
          )}
        </div>
      </dl>

      <div className="flag-guide">
        <h3>What the beach flags mean</h3>
        <p className="muted small">
          The flags on this page are our read of the forecast, not the flag that's actually flying.{' '}
          {beach.patrol_url ? (
            <a href={beach.patrol_url} target="_blank" rel="noreferrer">See today's posted flag</a>
          ) : (
            "This beach doesn't post its flag online, so check it at the beach access."
          )}
        </p>
        <ul>
          {Object.entries(FLAGS).map(([color, f]) => (
            <li key={color}>
              <Flag color={color} size={16} />
              <span>
                <strong>{f.label}.</strong> {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const TRAVEL_SOURCES = {
  tomtom: ['measured', 'TomTom routing with traffic'],
  osrm: ['route', 'OSRM road routing (no traffic)'],
  estimate: ['estimate', 'Straight-line estimate'],
}

function SourcesTab({ m, beach, travel }) {
  const [travelKind, travelText] = TRAVEL_SOURCES[travel.source] || TRAVEL_SOURCES.estimate
  const rows = [
    ['Weather, UV, wind, daylight', 'forecast', 'Open-Meteo forecast', null],
    ['Waves', m.waves.kind, m.waves.source, beach.surf?.url],
    ['Water temperature', m.water.kind, m.water.source, null],
    ['Rip current risk', m.rip.kind, m.rip.source, m.rip.url],
    ['NWS alerts', 'official', `NWS alerts for zone ${beach.nws_zone}`, 'https://alerts.weather.gov/'],
    ['Tide', 'official', m.tide ? `NOAA station ${m.tide.station}` : 'Unavailable', m.tide?.url],
    ['Water quality', 'sampled', m.waterQuality ? `Texas Beach Watch, ${m.waterQuality.name}` : 'No station nearby', m.waterQuality?.url],
    ['Drive time', travelKind, travelText, null],
    ['Crowds', 'estimate', 'Modeled from the day, season, hour and weather. No live crowd data yet.', null],
  ]
  return (
    <>
      <table className="sources-table">
        <tbody>
          {rows.map(([what, kind, text, url]) => (
            <tr key={what}>
              <th scope="row">{what}</th>
              <td className={kind === 'estimate' ? 'kind kind-estimate' : 'kind'}>{SOURCE_KINDS[kind].label}</td>
              <td className="muted">{url ? <a href={url} target="_blank" rel="noreferrer">{text}</a> : text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        Live sensor readings are shown next to the forecast while your window is under way. Star ratings are for reference and
        aren't part of the score. Live cams belong to their owners and play from their sites.
      </p>
    </>
  )
}

// Public live cams at or near the beach. Players are the owners' own embeds; cams that can't be
// embedded open on the owner's site instead.
function CamTab({ beach }) {
  const [index, setIndex] = useState(0)
  const cams = beach.cams || []
  if (cams.length === 0) {
    return <p className="muted cam-empty">No public live cam at {beach.name} yet.</p>
  }
  const camIndex = Math.min(index, cams.length - 1)
  const cam = cams[camIndex]
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
        <CamPlayer key={`${beach.id}-${camIndex}`} beachId={beach.id} camIndex={camIndex} cam={cam} />
      ) : (
        <a className="cam-frame cam-link" href={cam.page} target="_blank" rel="noreferrer">
          <Icon name="camera" size={26} />
          <span>{cam.provider} doesn't allow this cam to play here</span>
          <strong>
            Watch on {cam.provider} <Icon name="arrowUpRight" size={13} />
          </strong>
        </a>
      )}
      <p className="cam-caption">
        <strong>{cam.name}</strong>
        <span className="muted">
          {' '}
          {miles < 1 ? 'at this beach' : `about ${Math.round(miles)} mi from ${beach.name}`} ·{' '}
          <a href={cam.page} target="_blank" rel="noreferrer">
            {cam.provider} <Icon name="arrowUpRight" size={11} />
          </a>
        </span>
      </p>
    </div>
  )
}

// How the score adds up: each part's score out of 100 times its weight, minus the long-drive penalty
function ScoreTab({ beach }) {
  const { rows, weighted, penalty, total } = scoreBreakdown(beach)
  return (
    <>
      <table className="sources-table score-table">
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col">Score</th>
            <th scope="col">Weight</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                {r.label}
                <span className="muted small score-about">{r.about}</span>
              </th>
              <td>
                <span className="score-bar" aria-hidden="true">
                  <span style={{ width: `${r.score}%` }} />
                </span>
                {r.score}
              </td>
              <td>{Math.round(r.weight * 100)}%</td>
              <td>{r.points.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {penalty > 0 && (
            <>
              <tr>
                <th scope="row" colSpan={3}>Weighted total</th>
                <td>{weighted.toFixed(1)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3}>
                  More time driving than on the sand
                  <span className="muted small score-about">Loses 5 points per extra hour in the car, up to 30</span>
                </th>
                <td>−{penalty.toFixed(1)}</td>
              </tr>
            </>
          )}
          <tr className="score-total">
            <th scope="row" colSpan={3}>Score</th>
            <td>{total}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">
        Each part is scored out of 100 against your preferences for this time window. 75 and up is a great day, 60 to 74 is
        mixed, under 60 is rough. Star ratings and live cams aren't part of the score.
      </p>
    </>
  )
}

function DetailTabs({ beach, prefs, tab, setTab }) {
  const m = beach.metrics
  const notes = safetyNotes(m, prefs)
  const serious = notes.filter((n) => n.level !== 'info').length
  const tabs = [
    ['safety', serious ? `Safety (${serious})` : 'Safety'],
    ['cams', beach.cams?.length > 1 ? `Live cams (${beach.cams.length})` : 'Live cam'],
    ['score', 'Score breakdown'],
    ['sources', 'Where the numbers come from'],
  ]
  return (
    <section className="detail">
      <div className="detail-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'safety' && <SafetyTab beach={beach} m={m} notes={notes} />}
      {tab === 'cams' && <CamTab beach={beach} />}
      {tab === 'score' && <ScoreTab beach={beach} />}
      {tab === 'sources' && <SourcesTab m={m} beach={beach} travel={beach.travel} />}
    </section>
  )
}

// Slides list rows from their old spot to their new one when the ranking changes (FLIP)
function useReorderAnimation(listRef, order) {
  const tops = useRef(new Map())
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const animate = !reduceMotion()
    for (const row of list.children) {
      const id = row.dataset.id
      const top = row.offsetTop
      const before = tops.current.get(id)
      if (animate && before != null && before !== top) {
        row.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
          duration: 520,
          easing: 'cubic-bezier(.2,.75,.25,1)',
        })
      }
      tops.current.set(id, top)
    }
  }, [listRef, order])
}

function RankedList({ beaches, tooFar, selectedId, prefs, origin, onSelect, onHover, onWiden }) {
  const listRef = useRef(null)
  useReorderAnimation(listRef, beaches.map((b) => b.id).join())
  const limit = PREFERENCE_OPTIONS.drive.find((o) => o.id === prefs.drive)
  const far = tooFar.filter((b) => b.why === 'far')
  const late = tooFar.filter((b) => b.why === 'late')

  return (
    <section className="ranked">
      <h2>
        {beaches.length} {beaches.length === 1 ? 'beach' : 'beaches'} {limit.minutes === Infinity ? 'on the coast' : `within ${limit.label} of ${origin.name}`}
      </h2>
      <ol className="ranked-list" ref={listRef}>
        {beaches.map((b) => {
          const { reason, tradeoffs } = pitch(b, prefs, 2, 2)
          return (
            <li key={b.id} data-id={b.id}>
              <button
                type="button"
                className={b.id === selectedId ? 'rank-row active' : 'rank-row'}
                onClick={() => onSelect(b.id)}
                onMouseEnter={() => onHover(b.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(b.id)}
                onBlur={() => onHover(null)}
                aria-current={b.id === selectedId}
              >
                <span className="rank-num">{b.rank}</span>
                <span className="rank-main">
                  <strong>{b.name}</strong>
                  <span className="rank-why">
                    {reason}
                    {tradeoffs.length > 0 && <span className="rank-but"> But: {tradeoffs.join(', ')}.</span>}
                  </span>
                </span>
                <span className="rank-side">
                  <span className="rank-score">
                    <Flag color={b.flag} size={13} />
                    {b.score}
                  </span>
                  <span className="rank-drive">{formatDuration(b.travel.minutes)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {far.length > 0 && (
        <p className="ranked-far">
          Past {limit.label}: {far.map((b) => `${shortName(b)} (${formatDuration(b.travel.minutes)})`).join(', ')}.{' '}
          <button type="button" className="text-button" onClick={onWiden}>
            Include them
          </button>
        </p>
      )}
      {late.length > 0 && (
        <p className="ranked-far">You'd get to {late.map((b) => shortName(b)).join(', ')} after the window ends.</p>
      )}
    </section>
  )
}

function SkeletonList() {
  return (
    <section className="ranked" aria-hidden="true">
      <h2 className="skeleton-text">Ranking the coast</h2>
      <ol className="ranked-list">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i}>
            <div className="rank-row skeleton" />
          </li>
        ))}
      </ol>
    </section>
  )
}

const TRAVEL_NOTES = {
  tomtom: 'Drive times from TomTom, with traffic.',
  osrm: 'Drive times on real roads, without traffic.',
  estimate: 'Routing is unavailable, so drive times are rough straight-line estimates.',
}

const DEFAULT_WINDOW = 'midday'

// Pick the first day whose window is still worth planning: today unless it's already over
function initialDay(now) {
  const w = TIME_WINDOWS.find((t) => t.id === DEFAULT_WINDOW)
  return windowViable(w, now.hour) ? { day: null, moved: null } : { day: addDays(now.date, 1), moved: w }
}

export default function Discover({ prefs, setPrefs, focusId, setFocusId, onStatus }) {
  const [now, setNow] = useState(coastNow)
  const [start] = useState(() => initialDay(now))
  const [day, setDay] = useState(start.day)
  // The window we skipped past today, so the date picker can say why it isn't today
  const [movedFrom, setMovedFrom] = useState(start.moved)
  const [originId, setOriginId] = useState('houston')
  const [myLocation, setMyLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [windowId, setWindowId] = useState(DEFAULT_WINDOW)
  const [data, setData] = useState(null)
  const [travel, setTravel] = useState(null)
  const [travelFailed, setTravelFailed] = useState(false)
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  // The list row under the pointer, so its map marker can light up
  const [hoverId, setHoverId] = useState(null)
  // Stays put when you pick another beach, so you can flip through every beach's cams
  const [detailTab, setDetailTab] = useState('safety')

  // Keep "now" current so windows expire while the page is open
  useEffect(() => {
    const id = setInterval(() => setNow(coastNow()), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const origin = originId === 'current' && myLocation ? myLocation : ORIGINS.find((o) => o.id === originId) || ORIGINS[0]
  const timeWindow = TIME_WINDOWS.find((w) => w.id === windowId)
  const days = useMemo(() => data?.days || [], [data])
  const isToday = data ? data.date === days[0] : false
  const nowHour = isToday ? now.hour : null
  const activeWindow = useMemo(() => remainingWindow(timeWindow, nowHour), [timeWindow, nowHour])

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
  }, [day, attempt])

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
      .then((json) => {
        if (cancelled) return
        setTravel(json)
        setTravelFailed(false)
      })
      .catch(() => {
        if (cancelled) return
        setTravel(null)
        setTravelFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [origin.lat, origin.lon, departDay, timeWindow.start, data?.utc_offset])

  useEffect(() => {
    onStatus?.(data ? { sources: data.sources, generated: data.generated, travel: travel?.provider || 'estimate', loading } : null)
  }, [data, travel, loading, onStatus])

  // If today's window runs out while the page is open, move on to tomorrow
  useEffect(() => {
    if (isToday && !windowViable(timeWindow, now.hour) && days[1]) {
      setMovedFrom(timeWindow)
      setDay(days[1])
    }
  }, [isToday, timeWindow, now.hour, days])

  const chooseDay = (d) => {
    setMovedFrom(null)
    if (d === days[0] && !windowViable(timeWindow, now.hour)) {
      const next = TIME_WINDOWS.find((w) => windowViable(w, now.hour))
      if (next) setWindowId(next.id)
    }
    setDay(d)
  }

  const chooseOrigin = (id) => {
    setLocationError(null)
    if (id !== 'current') {
      setOriginId(id)
      return
    }
    if (!navigator.geolocation) {
      setLocationError('Location isn\'t available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ id: 'current', name: 'you', lat: pos.coords.latitude, lon: pos.coords.longitude })
        setOriginId('current')
      },
      () => setLocationError('Location permission was denied.'),
      { timeout: 10000 },
    )
  }

  const { ranked, tooFar } = useMemo(
    () => (data ? rankBeaches(data.beaches, prefs, activeWindow, origin, travel?.routes, nowHour) : { ranked: [], tooFar: [] }),
    [data, prefs, activeWindow, origin, travel, nowHour],
  )
  const top = ranked[0]
  const selected = ranked.find((b) => b.id === focusId) || tooFar.find((b) => b.id === focusId) || top
  const selectedOutOfRange = selected && !ranked.includes(selected)
  const conflict = prefConflict(prefs, activeWindow, top)
  const dayName = data ? (isToday ? 'Today' : data.date === days[1] ? 'Tomorrow' : weekday(data.date)) : ''
  const dayLabel = `${dayName}, ${windowLabel(activeWindow)}${activeWindow.live ? ' (rest of the window)' : ''}`
  const nextLimit = PREFERENCE_OPTIONS.drive[PREFERENCE_OPTIONS.drive.findIndex((o) => o.id === prefs.drive) + 1]

  let hero
  if (error) {
    hero = (
      <HeroMessage title="Couldn't reach the beach data.">
        <p className="hero-reason">
          {error}. The forecast server might be down, or the backend isn't running on port 8000.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </HeroMessage>
    )
  } else if (!data) {
    hero = (
      <HeroMessage title="Checking the coast…" loading>
        <p className="hero-reason">Pulling forecasts, surf reports and water tests for the whole coast.</p>
      </HeroMessage>
    )
  } else if (!top) {
    const closest = tooFar[0]
    hero = (
      <HeroMessage title={`Nothing within ${PREFERENCE_OPTIONS.drive.find((o) => o.id === prefs.drive).label} of ${origin.name}.`}>
        <p className="hero-reason">
          {closest?.why === 'late'
            ? `Even the closest beach would leave you under an hour on the sand. Try a later window or another day.`
            : closest
              ? `The closest is ${closest.name}, ${formatDuration(closest.travel.minutes)} away. Try a longer drive.`
              : 'Try a longer drive.'}
        </p>
        {nextLimit && closest?.why !== 'late' && (
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => setPrefs({ ...prefs, drive: nextLimit.id })}>
              Drive up to {nextLimit.label}
            </button>
          </div>
        )}
      </HeroMessage>
    )
  } else {
    hero = (
      <Hero
        beach={selected}
        isTop={selected.id === top.id}
        outOfRange={selectedOutOfRange}
        total={ranked.length}
        dayLabel={dayLabel}
        prefs={prefs}
        origin={origin}
        onBackToTop={() => setFocusId(null)}
      />
    )
  }

  return (
    <main className={loading && data ? 'discover updating' : 'discover'}>
      <section className="planner">
        <p className="trip-line">
          Leaving{' '}
          <Pick label="Starting from" display={origin.id === 'current' ? 'my location' : origin.name} value={originId} onChange={chooseOrigin}>
            <option value="current">{myLocation ? 'My location' : 'Use my location…'}</option>
            {ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Pick>{' '}
          on{' '}
          <Pick
            label="Beach day"
            display={data ? `${dayName === 'Today' || dayName === 'Tomorrow' ? `${dayName.toLowerCase()}, ` : ''}${formatDay(data.date)}` : '…'}
            value={data?.date || ''}
            onChange={chooseDay}
            disabled={!data}
          >
            {days.map((d, i) => (
              <option key={d} value={d} disabled={i === 0 && !TIME_WINDOWS.some((w) => windowViable(w, now.hour))}>
                {i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}
                {formatDay(d)}
              </option>
            ))}
          </Pick>
          {movedFrom && data && !isToday && <span className="moved-note"> (today's {windowLabel(movedFrom)} is over)</span>}{' '}
          from{' '}
          <Pick label="Time at the beach" display={windowLabel(timeWindow)} value={windowId} onChange={setWindowId}>
            {TIME_WINDOWS.map((w) => (
              <option key={w.id} value={w.id} disabled={isToday && !windowViable(w, now.hour)}>
                {w.label}, {windowLabel(w)}
              </option>
            ))}
          </Pick>
          , driving up to{' '}
          <Pick label="Longest drive" display={PREFERENCE_OPTIONS.drive.find((o) => o.id === prefs.drive).label} value={prefs.drive} onChange={(v) => setPrefs({ ...prefs, drive: v })}>
            {PREFERENCE_OPTIONS.drive.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Pick>
          .
        </p>
        {locationError && <p className="moved-note">{locationError}</p>}
        <Preferences prefs={prefs} setPrefs={setPrefs} conflict={conflict} />
      </section>

      <div className="board">
        <div className="col col-main">
          <div className="area-hero">{hero}</div>
          {selected && (
            <>
              <div className="area-cond">
                <Conditions beach={selected} dayLabel={dayLabel} reviews={reviews?.beaches?.[selected.id]} />
              </div>
              <div className="area-detail">
                <DetailTabs key={selected.id} beach={selected} prefs={prefs} tab={detailTab} setTab={setDetailTab} />
              </div>
            </>
          )}
        </div>
        <div className="col col-side">
          <div className="area-map map-card">
            {data ? (
              <BeachMap beaches={ranked} outOfRange={tooFar} selected={selected} topId={top?.id} hoverId={hoverId} origin={origin} onSelect={setFocusId} />
            ) : (
              <div className="map-placeholder" />
            )}
          </div>
          <div className="area-list">
            {data ? (
              <RankedList
                beaches={ranked}
                tooFar={tooFar}
                selectedId={selected?.id}
                prefs={prefs}
                origin={origin}
                onSelect={setFocusId}
                onHover={setHoverId}
                onWiden={() => setPrefs({ ...prefs, drive: 'any' })}
              />
            ) : (
              !error && <SkeletonList />
            )}
            {data && (
              <p className="fine-print">
                {travelFailed ? TRAVEL_NOTES.estimate : TRAVEL_NOTES[travel?.provider || 'estimate']} Crowds are estimates.
                Forecasts, not a safety advisory.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
