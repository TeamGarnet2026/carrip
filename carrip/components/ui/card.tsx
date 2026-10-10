import type { ReactNode } from 'react'

type CardProps = {
  isClickable?: boolean
  isSelected?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}

export function Card({
  isClickable = false,
  isSelected = false,
  onClick,
  children,
  className = '',
}: CardProps) {
  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-2xl border p-5 text-left transition duration-200 ${
        isSelected
          ? 'border-brand bg-[linear-gradient(180deg,var(--color-brand-soft),#ffffff_45%)] ring-4 ring-brand/12'
          : 'border-line bg-surface'
      } ${
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-raised)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25'
          : ''
      } shadow-[var(--shadow-carrip)] ${className}`}
    >
      {children}
    </Component>
  )
}
