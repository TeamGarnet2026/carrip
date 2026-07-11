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
    'bg-brand text-white hover:bg-brand-dark border border-transparent shadow-sm',
  secondary:
    'border border-line bg-soft text-ink hover:bg-[#e8edef]',
  ghost: 'text-ink hover:bg-soft border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm',
  md: 'min-h-[42px] px-4 py-2 text-sm',
  lg: 'min-h-[52px] px-6 py-3 text-base',
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
      className={`inline-flex items-center justify-center gap-2 rounded-[7px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
