type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

type BadgeProps = {
  variant?: BadgeVariant
  label: string
}

const variantClasses: Record<BadgeVariant, string> = {
  info: 'bg-[#e8f4f2] text-brand-dark border-[#cfe6e3]',
  success: 'bg-[#e8f4f2] text-brand-dark border-[#cfe6e3]',
  warning: 'bg-[#fff4e5] text-[#9a6700] border-[#f0dfbf]',
  danger: 'bg-red-50 text-red-800 border-red-200',
  neutral: 'bg-soft text-ink border-line',
}

export function Badge({ variant = 'neutral', label }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
