import { useEffect, useState } from 'react'

const BASE_ITEMS = ['Sunscreen', 'Water', 'Towel', 'Sunglasses', 'Snacks', 'Hat', 'Phone charger']
const HIGH_UV_ITEMS = ['Umbrella / shade tent', 'After-sun lotion']
const STORAGE_KEY = 'bdp-checklist'

function loadChecked() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export default function Checklist({ highUv }) {
  const [checked, setChecked] = useState(loadChecked)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked))
    } catch {
      // Storage unavailable (private mode); checklist just won't persist
    }
  }, [checked])

  const items = highUv ? [...BASE_ITEMS, ...HIGH_UV_ITEMS] : BASE_ITEMS
  const done = items.filter((item) => checked[item]).length

  return (
    <section className="card">
      <div className="card-head">
        <h2>What to bring</h2>
        <span className="muted">{done}/{items.length}</span>
      </div>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item}>
            <label>
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={() => setChecked({ ...checked, [item]: !checked[item] })}
              />
              {item}
            </label>
          </li>
        ))}
      </ul>
      {done > 0 && (
        <button type="button" className="link-button" onClick={() => setChecked({})}>
          Reset
        </button>
      )}
    </section>
  )
}
