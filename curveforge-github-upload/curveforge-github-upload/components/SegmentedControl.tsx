'use client'

interface Option<T extends string> {
  key: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}

export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 12,
      background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', gap: 2,
    }}>
      {options.map(o => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: '6px 13px', borderRadius: 10, fontSize: 12.5,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer', border: 'none',
              background: active
                ? 'linear-gradient(180deg,rgba(255,255,255,0.20),rgba(255,255,255,0.08))'
                : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
              transition: 'all .18s',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
