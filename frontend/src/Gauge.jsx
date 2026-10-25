import { useEffect, useId, useRef, useState } from 'react'
import { FIT_TEXT, fitTone } from './scoring.js'

const H = 240 // staff height in SVG units; 0-100 maps onto it
const W = 64
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Counts the shown number toward the score so it moves with the water
function useTweened(target, duration = 900) {
  const [value, setValue] = useState(reduceMotion() ? target : 0)
  const from = useRef(value)
  useEffect(() => {
    if (reduceMotion()) {
      setValue(target)
      return
    }
    const start = performance.now()
    const begin = from.current
    let frame
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      const v = Math.round(begin + (target - begin) * eased)
      from.current = v
      setValue(v)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    // Animation frames pause in background tabs; make sure the number still lands on the score
    const land = setTimeout(() => {
      from.current = target
      setValue(target)
    }, duration + 100)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(land)
    }
  }, [target, duration])
  return value
}

// The score as a tide staff: a painted gauge board with water standing at the score. The water
// starts empty and rises on load, then moves whenever the score changes.
// With `empty` (while loading) it shows only the staff, with no number or verdict.
export default function TideGauge({ score, size = 'large', empty = false }) {
  const id = useId().replace(/:/g, '')
  const [level, setLevel] = useState(reduceMotion() ? score : 0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLevel(score))
    return () => cancelAnimationFrame(frame)
  }, [score])
  const shown = useTweened(score)
  const tone = fitTone(score)
  const y = H - (level / 100) * H

  return (
    <div className={`gauge gauge-${size}`} role="img" aria-label={empty ? 'Score loading' : `Score ${score} out of 100, ${FIT_TEXT[tone].toLowerCase()}`}>
      {!empty && (
        <div className="gauge-readout" aria-hidden="true">
          <span className="gauge-number">{shown}</span>
          <span className="gauge-fit">{FIT_TEXT[tone]}</span>
        </div>
      )}
      <svg className="gauge-staff" viewBox={`-2 -6 ${W + 4} ${H + 12}`} aria-hidden="true">
        <defs>
          <linearGradient id={`water-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fe3d8" />
            <stop offset="0.35" stopColor="var(--turq)" />
            <stop offset="1" stopColor="#1f9fa0" />
          </linearGradient>
          <clipPath id={`board-${id}`}>
            <rect x="0" y="0" width={W} height={H} rx="5" />
          </clipPath>
        </defs>
        <rect className="gauge-board" x="0" y="0" width={W} height={H} rx="5" />
        <g clipPath={`url(#board-${id})`}>
          <g className="gauge-water" style={{ transform: `translateY(${y}px)` }}>
            <rect x="-10" y="6" width={W + 20} height={H + 10} fill={`url(#water-${id})`} />
            <path className="gauge-wave" d={`M-64 6 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V14 H-64Z`} fill="#7fe3d8" />
            <rect className="gauge-sheen" x="-10" y="6" width={W + 20} height="2" />
          </g>
        </g>
        {/* Painted marks like a real tide staff, a bar every 10 and a tick every 2, drawn over the water so they read through it */}
        {Array.from({ length: 51 }, (_, i) => {
          const v = i * 2
          const ty = H - (v / 100) * H
          const major = v % 10 === 0
          return <rect key={v} className="gauge-tick" x="4" y={ty - (major ? 1.5 : 0.8)} width={major ? 22 : 10} height={major ? 3 : 1.6} />
        })}
        {[20, 40, 60, 80].map((v) => (
          <text key={v} className="gauge-label" x={W - 8} y={H - (v / 100) * H + 6} textAnchor="end">
            {v}
          </text>
        ))}
        <rect className="gauge-frame" x="0" y="0" width={W} height={H} rx="5" />
      </svg>
    </div>
  )
}
