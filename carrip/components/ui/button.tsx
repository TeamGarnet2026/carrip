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
  primary: 'border border-transparent bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-soft',
  ghost: 'border border-transparent text-ink hover:bg-sunken',
  danger: 'border border-line-strong bg-surface text-cost-admission hover:bg-soft',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] rounded-lg px-3.5 text-[13px] font-medium',
  md: 'min-h-12 rounded-[10px] px-6 text-[15px] font-semibold',
  lg: 'min-h-[54px] rounded-[14px] px-7 text-base font-semibold',
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
      className={`inline-flex items-center justify-center gap-2 transition select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
