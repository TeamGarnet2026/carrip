/**
 * テスト用の Supabase クライアントのモック。
 * `from(table)` から始まるメソッドチェーンを記録し、テーブルごとに登録した結果を順番に返す。
 */

export type MockResult = { data?: unknown; error?: { message: string } | null }

export type RecordedQuery = {
  table: string
  calls: Array<{ method: string; args: unknown[] }>
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'gt',
  'lt',
  'order',
  'limit',
] as const

export function createSupabaseMock(
  responses: Record<string, MockResult[]> = {}
) {
  const queues = new Map(
    Object.entries(responses).map(([table, results]) => [table, [...results]])
  )
  const queries: RecordedQuery[] = []

  function nextResult(table: string): MockResult {
    const queue = queues.get(table)
    const result = queue?.shift()
    return { data: null, error: null, ...result }
  }

  function from(table: string) {
    const query: RecordedQuery = { table, calls: [] }
    queries.push(query)

    // 最初に結果を取り出すタイミングで1件消費する（then / single / maybeSingle）
    let resolved: MockResult | null = null
    const resolve = () => {
      resolved ??= nextResult(table)
      return Promise.resolve(resolved)
    }

    const builder: Record<string, unknown> = {}
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args })
        return builder
      }
    }
    builder.single = () => {
      query.calls.push({ method: 'single', args: [] })
      return resolve()
    }
    builder.maybeSingle = () => {
      query.calls.push({ method: 'maybeSingle', args: [] })
      return resolve()
    }
    builder.then = (
      onFulfilled: (value: MockResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => resolve().then(onFulfilled, onRejected)

    return builder
  }

  return {
    client: { from } as never,
    queries,
    /** 指定したテーブルに対するクエリを記録順に返す */
    queriesFor(table: string) {
      return queries.filter((query) => query.table === table)
    },
    /** 指定メソッドの引数を返す（例: insert された行） */
    argsOf(query: RecordedQuery, method: string) {
      return query.calls.find((call) => call.method === method)?.args
    },
  }
}
