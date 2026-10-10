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
      aria-pressed={isClickable ? isSelected : undefined}
      className={`w-full rounded-2xl bg-surface p-5 text-left transition ${
        isSelected ? 'border-[1.5px] border-ink' : 'border border-line'
      } ${isClickable ? 'cursor-pointer hover:border-muted' : ''} ${className}`}
    >
      {children}
    </Component>
  )
}
