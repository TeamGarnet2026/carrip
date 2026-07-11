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
        <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
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
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-teal-500/30 ${
          errorMessage
            ? 'border-red-500'
            : 'border-neutral-300 dark:border-neutral-700'
        } bg-white dark:bg-neutral-900`}
      />
      {errorMessage && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p className="mt-1 text-xs text-neutral-500">{helperText}</p>
      )}
    </div>
  )
}
