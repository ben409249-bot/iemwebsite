'use client'
import { clsx } from 'clsx'

interface Props {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  animDelay?: string
}

export default function GlassCard({ children, className, style, animDelay }: Props) {
  return (
    <div
      className={clsx('glass-card', className)}
      style={{
        animation: `fadeUp 0.5s ${animDelay ?? '0s'} ease both`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
