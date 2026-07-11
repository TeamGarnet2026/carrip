type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function Spinner({ size = 'md', label = '読み込み中' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <span
        className={`animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-teal-400 ${sizeClasses[size]}`}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
