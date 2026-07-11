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
      className={`rounded-xl border p-4 text-left transition ${
        isSelected
          ? 'border-teal-600 ring-2 ring-teal-500/20 dark:border-teal-400'
          : 'border-neutral-200 dark:border-neutral-800'
      } ${
        isClickable
          ? 'cursor-pointer hover:border-teal-500/60 hover:shadow-sm'
          : ''
      } bg-white dark:bg-neutral-950 ${className}`}
    >
      {children}
    </Component>
  )
}
