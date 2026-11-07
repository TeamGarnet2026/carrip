'use client'

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { CheckIcon, SearchIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/spinner'
import type { OriginPlace } from '@/lib/plan/types'
import type { OriginCandidate } from '@/lib/poi/origin'

/** 入力が止まってから検索するまでの待ち時間。Places API の呼び出し回数を抑える */
const SEARCH_DELAY_MS = 350
const MIN_QUERY_LENGTH = 2

type OriginSearchInputProps = {
  id?: string
  value: string
  /** 候補から選んだ（または現在地を使った）位置。手入力のままなら undefined */
  place?: OriginPlace
  placeholder?: string
  invalid?: boolean
  /** boxed は枠つきの通常の入力欄、bare はトップのクイック入力用の枠なし */
  variant?: 'boxed' | 'bare'
  onChange: (origin: string, place?: OriginPlace) => void
  /** 候補が出ないときに、入力した地名をそのまま使う */
  onUseTypedText?: (origin: string) => void
}

type SearchState = {
  /** この結果を得た検索語 */
  query: string
  loading: boolean
  error: string | null
  candidates: OriginCandidate[]
}

const IDLE: SearchState = { query: '', loading: false, error: null, candidates: [] }

export function OriginSearchInput({
  id,
  value,
  place,
  placeholder = '京都駅、新宿、自宅の住所など',
  invalid = false,
  variant = 'boxed',
  onChange,
  onUseTypedText,
}: OriginSearchInputProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const listId = `${inputId}-options`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>(IDLE)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LENGTH) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearch((current) => ({ ...current, query: q, loading: true, error: null }))
      fetch(`/api/pois/origin?${new URLSearchParams({ q }).toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) {
            setSearch({
              ...IDLE,
              query: q,
              error: data.error ?? '候補を取得できませんでした',
            })
            return
          }
          setSearch({ query: q, loading: false, error: null, candidates: data.places })
          setActiveIndex(data.places.length > 0 ? 0 : -1)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setSearch({ ...IDLE, query: q, error: 'ネットワークエラーが発生しました' })
        })
    }, SEARCH_DELAY_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function handleInput(next: string) {
    onChange(next)
    setQuery(next)
    setActiveIndex(-1)
    if (next.trim().length < MIN_QUERY_LENGTH) setSearch(IDLE)
    setOpen(true)
  }

  function select(candidate: OriginCandidate) {
    onChange(candidate.name, {
      lat: candidate.lat,
      lng: candidate.lng,
      ...(candidate.prefecture ? { prefecture: candidate.prefecture } : {}),
    })
    setOpen(false)
  }

  function confirmTypedText() {
    onUseTypedText?.(value.trim())
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || search.candidates.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % search.candidates.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        index <= 0 ? search.candidates.length - 1 : index - 1
      )
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      select(search.candidates[activeIndex])
    }
  }

  const trimmed = value.trim()
  const showList = open && !place && trimmed.length >= MIN_QUERY_LENGTH
  const pending = search.loading || search.query !== trimmed
  const nothingFound =
    !pending && (search.error !== null || search.candidates.length === 0)

  const inputStyle: CSSProperties =
    variant === 'boxed'
      ? {
          colorScheme: 'light',
          backgroundColor: '#ffffff',
          color: '#1b1d1c',
          WebkitTextFillColor: '#1b1d1c',
        }
      : { backgroundColor: 'transparent' }

  const inputClass =
    variant === 'boxed'
      ? `carrip-field min-h-[52px] w-full rounded-[10px] border pl-11 text-base outline-none transition focus:border-ink focus:ring-1 focus:ring-ink ${
          place?.prefecture ? 'pr-24' : 'pr-4'
        } ${invalid ? 'border-cost-admission' : 'border-line-strong'}`
      : `carrip-field mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-ink outline-none ${
          place?.prefecture ? 'pr-16' : ''
        }`

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {variant === 'boxed' && (
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
        )}
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          maxLength={100}
          value={value}
          placeholder={placeholder}
          onChange={(event) => handleInput(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          className={inputClass}
        />
        {place?.prefecture && (
          <span
            className={`pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand ${
              variant === 'boxed' ? 'right-3' : 'right-0 mt-0.5'
            }`}
          >
            <CheckIcon className="h-3 w-3" />
            {place.prefecture}
          </span>
        )}
      </div>

      {showList && (
        <div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {pending && search.candidates.length === 0 ? (
            <div className="flex justify-center py-5">
              <Spinner label="候補を検索中" />
            </div>
          ) : search.candidates.length > 0 ? (
            <ul id={listId} role="listbox" className="m-0 max-h-80 list-none overflow-y-auto p-1">
              {search.candidates.map((candidate, index) => (
                <li
                  key={candidate.place_id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(candidate)}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 ${
                    index === activeIndex ? 'bg-soft' : ''
                  }`}
                >
                  <span className="mt-0.5 w-[4.5em] shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 text-center text-[12px] text-ink-soft">
                    {candidate.prefecture ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">
                      {candidate.name}
                    </span>
                    {candidate.locality && (
                      <span className="mt-0.5 block truncate text-[12px] text-muted">
                        {candidate.locality}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {nothingFound && (
            <div className="border-t border-line px-4 py-3 text-[13px] first:border-t-0">
              <p className="m-0 text-muted">
                {search.error ?? '候補が見つかりませんでした。別の言葉で検索してください'}
              </p>
              {onUseTypedText && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={confirmTypedText}
                  className="mt-2 p-0 text-[13px] text-brand underline underline-offset-4"
                >
                  「{trimmed}」をそのまま出発地にする
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
