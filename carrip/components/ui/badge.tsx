type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

type BadgeProps = {
  variant?: BadgeVariant
  label: string
}

const variantClasses: Record<BadgeVariant, string> = {
  info: 'bg-brand-soft text-brand',
  success: 'bg-brand-soft text-brand',
  warning: 'bg-[#f6eed9] text-[#7a5d1c]',
  danger: 'bg-[#f6e4dd] text-[#8a3f27]',
  neutral: 'bg-sunken text-ink-soft',
}

export function Badge({ variant = 'neutral', label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
