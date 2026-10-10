type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 border-[3px]',
  md: 'h-10 w-10 border-4',
  lg: 'h-[54px] w-[54px] border-[5px]',
}

export function Spinner({ size = 'md', label = '読み込み中' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <span
        className={`animate-[carrip-spin_1s_linear_infinite] rounded-full border-line border-t-brand ${sizeClasses[size]}`}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
