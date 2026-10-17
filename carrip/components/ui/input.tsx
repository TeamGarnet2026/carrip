import { useId } from 'react'

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
  /** 入力欄の右端に表示する単位（例: 分） */
  suffix?: string
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
  suffix,
  onChange,
}: InputProps) {
  const inputId = useId()

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
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
            color: '#1b1d1c',
            WebkitTextFillColor: '#1b1d1c',
          }}
          className={`carrip-field min-h-[52px] w-full rounded-[10px] border px-4 py-2.5 text-base outline-none transition focus:border-ink focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:opacity-55 ${
            suffix ? 'pr-12' : ''
          } ${errorMessage ? 'border-cost-admission' : 'border-line-strong'}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      {errorMessage && (
        <p className="mt-2 text-[13px] font-medium text-cost-admission" role="alert">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p className="mt-2 text-[13px] text-muted">{helperText}</p>
      )}
    </div>
  )
}
