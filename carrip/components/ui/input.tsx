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
        <label className="mb-1.5 block text-xs font-extrabold text-muted">
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
        className={`carrip-field min-h-[42px] w-full rounded-[7px] border px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${
          errorMessage ? 'border-red-500' : 'border-line'
        }`}
      />
      {errorMessage && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p className="mt-1 text-xs text-muted">{helperText}</p>
      )}
    </div>
  )
}
