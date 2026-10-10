type InputProps = {
  label?: string
  placeholder?: string
  value: string
  errorMessage?: string
  helperText?: string
  isDisabled?: boolean
  type?: string
  min?: string
  max?: string
  onChange: (value: string) => void
}

export function Input({
  label,
  placeholder,
  value,
  errorMessage,
  helperText,
  isDisabled = false,
  type = 'text',
  min,
  max,
  onChange,
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-[13px] font-bold text-ink">
          {label}
        </label>
      )}
      <input
        type={type}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          colorScheme: 'light',
          backgroundColor: '#ffffff',
          color: '#1f2a37',
          WebkitTextFillColor: '#1f2a37',
        }}
        className={`carrip-field min-h-[48px] w-full rounded-xl border px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-neutral-300 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60 ${
          errorMessage ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-line'
        }`}
      />
      {errorMessage && (
        <p className="mt-1.5 text-[13px] font-medium text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p className="mt-1.5 text-xs text-muted">{helperText}</p>
      )}
    </div>
  )
}
