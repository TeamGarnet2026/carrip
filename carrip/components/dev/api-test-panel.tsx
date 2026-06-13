'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import {
  API_TEST_CATEGORY_LABELS,
  API_TEST_DEFINITIONS,
  type ApiTestContext,
  type ApiTestDefinition,
  type ApiTestResult,
  type ApiTestStatus,
} from '@/lib/dev/api-test-definitions'

type ApiTestPanelProps = {
  isLoggedIn: boolean
  userEmail?: string | null
}

function statusLabel(status: ApiTestStatus): string {
  switch (status) {
    case 'idle':
      return '未実行'
    case 'running':
      return '実行中'
    case 'success':
      return '成功'
    case 'warning':
      return '要確認'
    case 'error':
      return '失敗'
    case 'skipped':
      return 'スキップ'
  }
}

function statusClass(status: ApiTestStatus): string {
  switch (status) {
    case 'running':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
    case 'warning':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    case 'skipped':
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
    default:
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
  }
}

function summarizeResult(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'skipped' in data &&
    (data as { skipped: boolean }).skipped
  ) {
    return (data as { reason?: string }).reason ?? 'スキップされました'
  }

  if (typeof data === 'object' && data !== null && 'data' in data) {
    return summarizeResult((data as { data: unknown }).data)
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    if (typeof obj.ok === 'boolean') {
      const parts = [`ok: ${obj.ok}`]
      if (obj.places_api) parts.push(`places: ${obj.places_api}`)
      if (obj.maps_javascript_loader) {
        parts.push(`maps_js: ${obj.maps_javascript_loader}`)
      }
      if (obj.static_maps_api) parts.push(`static: ${obj.static_maps_api}`)
      if (obj.reason === 'quota_exceeded') {
        return 'クォータ超過（キーは届いている）'
      }
      if (obj.reason) parts.push(`reason: ${obj.reason}`)
      if (obj.model) parts.push(`model: ${obj.model}`)
      if (obj.http_status) parts.push(`http: ${obj.http_status}`)
      if (obj.sample_response) parts.push(`reply: ${obj.sample_response}`)
      if (obj.message && obj.ok === false) parts.push(String(obj.message))
      return parts.join(', ')
    }
    if (typeof obj.toll_yen === 'number') return `toll_yen: ${obj.toll_yen}円`
    if (typeof obj.count === 'number') return `count: ${obj.count}件`
    if (Array.isArray(obj.routes)) return `routes: ${obj.routes.length}件`
    if (Array.isArray(obj.trips)) return `trips: ${obj.trips.length}件`
    if (obj.trip && typeof obj.trip === 'object') return 'trip 保存成功'
    if (obj.trip && obj.routes) return 'trip 詳細取得成功'
  }

  return 'レスポンス取得済み'
}

export function ApiTestPanel({ isLoggedIn, userEmail }: ApiTestPanelProps) {
  const [results, setResults] = useState<Record<string, ApiTestResult>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [includeHeavy, setIncludeHeavy] = useState(false)
  const [runningAll, setRunningAll] = useState(false)
  const [lastGeneratedRoute, setLastGeneratedRoute] = useState<unknown | null>(
    null
  )
  const [lastTripId, setLastTripId] = useState<string | null>(null)

  const context: ApiTestContext = useMemo(
    () => ({
      lastGeneratedRoute,
      lastTripId,
      setLastGeneratedRoute,
      setLastTripId,
    }),
    [lastGeneratedRoute, lastTripId]
  )

  const runTest = useCallback(
    async (test: ApiTestDefinition, batchContext?: ApiTestContext) => {
      const ctx = batchContext ?? context

      if (test.requiresAuth && !isLoggedIn) {
        setResults((prev) => ({
          ...prev,
          [test.id]: {
            status: 'skipped',
            skippedReason: 'ログインが必要です',
          },
        }))
        return
      }

      setResults((prev) => ({
        ...prev,
        [test.id]: { status: 'running' },
      }))

      const startedAt = performance.now()

      try {
        const data = await test.run(ctx)
        const durationMs = Math.round(performance.now() - startedAt)

        if (
          typeof data === 'object' &&
          data !== null &&
          'warning' in data &&
          (data as { warning: boolean }).warning
        ) {
          setResults((prev) => ({
            ...prev,
            [test.id]: {
              status: 'warning',
              durationMs,
              data,
              skippedReason: (data as { reason?: string }).reason,
            },
          }))
          return
        }

        if (
          typeof data === 'object' &&
          data !== null &&
          'skipped' in data &&
          (data as { skipped: boolean }).skipped
        ) {
          setResults((prev) => ({
            ...prev,
            [test.id]: {
              status: 'skipped',
              durationMs,
              data,
              skippedReason:
                (data as { reason?: string }).reason ?? 'スキップされました',
            },
          }))
          return
        }

        setResults((prev) => ({
          ...prev,
          [test.id]: {
            status: 'success',
            durationMs,
            data,
          },
        }))
      } catch (error) {
        const durationMs = Math.round(performance.now() - startedAt)
        setResults((prev) => ({
          ...prev,
          [test.id]: {
            status: 'error',
            durationMs,
            error:
              error instanceof Error ? error.message : 'テストに失敗しました',
          },
        }))
      }
    },
    [context, isLoggedIn]
  )

  async function handleRunAll() {
    setRunningAll(true)

    let localRoute = lastGeneratedRoute
    let localTripId = lastTripId
    const batchContext: ApiTestContext = {
      get lastGeneratedRoute() {
        return localRoute
      },
      get lastTripId() {
        return localTripId
      },
      setLastGeneratedRoute(value) {
        localRoute = value
        setLastGeneratedRoute(value)
      },
      setLastTripId(value) {
        localTripId = value
        setLastTripId(value)
      },
    }

    for (const test of API_TEST_DEFINITIONS) {
      if (test.heavy && !includeHeavy) {
        setResults((prev) => ({
          ...prev,
          [test.id]: {
            status: 'skipped',
            skippedReason: '一括実行では heavy テストを除外中',
          },
        }))
        continue
      }

      await runTest(test, batchContext)
    }

    setRunningAll(false)
  }

  function handleClear() {
    setResults({})
    setExpanded({})
    setLastGeneratedRoute(null)
    setLastTripId(null)
  }

  const grouped = useMemo(() => {
    return API_TEST_DEFINITIONS.reduce<
      Record<string, ApiTestDefinition[]>
    >((acc, test) => {
      const key = test.category
      acc[key] = acc[key] ?? []
      acc[key].push(test)
      return acc
    }, {})
  }, [])

  const successCount = Object.values(results).filter(
    (result) => result.status === 'success' || result.status === 'warning'
  ).length
  const errorCount = Object.values(results).filter(
    (result) => result.status === 'error'
  ).length

  return (
    <div className="space-y-6">
      <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <p className="font-medium">外部 API を消費する手動テストページです</p>
        <p className="mt-1">
          単体テスト（vitest）とは別に、本番に近い API 呼び出しをここから実行できます。
          必要な項目だけ個別に試すことを推奨します。
        </p>
        <p className="mt-2 text-xs">
          認証状態:{' '}
          {isLoggedIn ? (
            <>
              ログイン中 ({userEmail ?? 'メール未設定'})
            </>
          ) : (
            <>
              未ログイン —{' '}
              <Link href="/login?redirectTo=/test-api" className="underline">
                ログイン
              </Link>{' '}
              または{' '}
              <Link href="/test-auth" className="underline">
                /test-auth
              </Link>
            </>
          )}
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRunAll}
          disabled={runningAll}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {runningAll ? '一括実行中…' : '▶ 一括実行'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          結果をクリア
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeHeavy}
            onChange={(event) => setIncludeHeavy(event.target.checked)}
          />
          一括実行にルート生成（heavy）を含める
        </label>
        {(successCount > 0 || errorCount > 0) && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            成功 {successCount} / 失敗 {errorCount}
          </span>
        )}
      </section>

      {(lastGeneratedRoute || lastTripId) && (
        <section className="rounded border border-neutral-200 p-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {lastGeneratedRoute ? <p>✓ ルート生成結果を保持中（保存テストで再利用）</p> : null}
          {lastTripId ? <p>✓ 直近 trip ID: {lastTripId}</p> : null}
        </section>
      )}

      {Object.entries(grouped).map(([category, tests]) => (
        <section key={category}>
          <h2 className="mb-3 text-lg font-semibold">
            {API_TEST_CATEGORY_LABELS[category as keyof typeof API_TEST_CATEGORY_LABELS]}
          </h2>
          <ul className="space-y-3">
            {tests.map((test) => {
              const result = results[test.id]
              const status = result?.status ?? 'idle'

              return (
                <li
                  key={test.id}
                  className="rounded border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{test.label}</h3>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${statusClass(status)}`}
                        >
                          {statusLabel(status)}
                        </span>
                        {test.heavy ? (
                          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                            heavy
                          </span>
                        ) : null}
                        {test.requiresAuth ? (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                            要ログイン
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {test.description}
                      </p>
                      <p className="mt-1 font-mono text-xs text-neutral-500">
                        {test.method} {test.endpoint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => runTest(test)}
                      disabled={status === 'running' || runningAll}
                      className="shrink-0 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      実行
                    </button>
                  </div>

                  {result?.durationMs != null ? (
                    <p className="mt-2 text-xs text-neutral-500">
                      {result.durationMs} ms
                    </p>
                  ) : null}

                  {result?.error ? (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {result.error}
                    </p>
                  ) : null}

                  {result?.skippedReason ? (
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {result.skippedReason}
                    </p>
                  ) : null}

                  {result?.data ? (
                    <div className="mt-3">
                      <p className="text-sm">{summarizeResult(result.data)}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [test.id]: !prev[test.id],
                          }))
                        }
                        className="mt-1 text-xs text-neutral-500 underline"
                      >
                        {expanded[test.id] ? 'JSON を隠す' : 'JSON を表示'}
                      </button>
                      {expanded[test.id] ? (
                        <pre className="mt-2 max-h-80 overflow-auto rounded bg-neutral-950 p-3 text-xs text-neutral-100">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
