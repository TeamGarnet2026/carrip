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
      className={`rounded-lg border p-4 text-left transition ${
        isSelected
          ? 'border-brand ring-2 ring-brand/20'
          : 'border-line'
      } ${
        isClickable
          ? 'cursor-pointer hover:border-brand/60 hover:shadow-[var(--shadow)]'
          : ''
      } bg-surface shadow-[var(--shadow-carrip)] ${className}`}
    >
      {children}
    </Component>
  )
}
