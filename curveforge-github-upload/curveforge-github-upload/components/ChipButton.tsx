'use client'

interface Props {
  label: string
  active: boolean
  onClick: () => void
  gridCol?: boolean
}

export default function ChipButton({ label, active, onClick, gridCol }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: gridCol ? '10px 8px' : '7px 13px',
        borderRadius: gridCol ? 12 : 999,
        fontSize: 12.5, fontWeight: active ? 600 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        border: active ? '1px solid rgba(123,140,255,0.55)' : '1px solid rgba(255,255,255,0.1)',
        background: active
          ? 'linear-gradient(180deg,rgba(123,140,255,0.28),rgba(123,140,255,0.1))'
          : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        boxShadow: active ? '0 0 16px rgba(123,140,255,0.25)' : 'none',
        transition: 'all .18s',
        display: gridCol ? 'flex' : undefined,
        alignItems: gridCol ? 'center' : undefined,
        justifyContent: gridCol ? 'center' : undefined,
        width: gridCol ? '100%' : undefined,
      }}
    >
      {label}
    </button>
  )
}
