'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab { href: string; label: string }

const TABS: Tab[] = [
  { href: '/generator', label: 'Generator' },
  { href: '/browse',    label: 'Browse' },
  { href: '/compare',   label: 'Compare' },
]

export default function TopNav() {
  const path = usePathname()
  return (
    <nav style={{ display: 'flex', gap: 6 }}>
      {TABS.map(t => {
        const active = path === t.href || (t.href !== '/' && path?.startsWith(t.href))
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '6px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: active ? 600 : 500,
              color: active ? '#c4b6ff' : 'rgba(255,255,255,0.6)',
              background: active ? 'rgba(123,140,255,0.15)' : 'transparent',
              border: active ? '1px solid rgba(123,140,255,0.4)' : '1px solid transparent',
              textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all .15s',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
