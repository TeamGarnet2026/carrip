type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

type BadgeProps = {
  variant?: BadgeVariant
  label: string
}

const variantClasses: Record<BadgeVariant, string> = {
  info: 'bg-brand-soft text-brand-dark border-teal-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
}

export function Badge({ variant = 'neutral', label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
