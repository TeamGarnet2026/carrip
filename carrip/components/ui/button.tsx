import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-brand text-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,138,126,0.25)] hover:bg-brand-dark hover:shadow-[0_1px_2px_rgba(15,23,42,0.08),0_6px_16px_rgba(15,138,126,0.3)]',
  secondary:
    'border border-line bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-neutral-300 hover:bg-soft',
  ghost: 'border border-transparent text-ink hover:bg-neutral-100',
  danger:
    'border border-transparent bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:bg-red-700',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] rounded-[9px] px-3.5 py-1.5 text-[13px]',
  md: 'min-h-[44px] rounded-[10px] px-5 py-2 text-sm',
  lg: 'min-h-[52px] rounded-xl px-7 py-3 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-bold tracking-wide transition duration-150 select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  )
}
