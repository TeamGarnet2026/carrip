/** Places API の利用上限に達したときに画面へ出す文言 */
export const FREE_PLAN_ENDED_MESSAGE = '無料プランは終了しました'

/** Places API の利用上限（1日あたりの回数など）に達した */
export class PlacesQuotaExceededError extends Error {
  constructor(detail: string) {
    super(`Places API の利用上限に達しました: ${detail}`)
    this.name = 'PlacesQuotaExceededError'
  }
}

/** Places API の失敗レスポンスが利用上限によるものか */
export function isPlacesQuotaExceeded(status: number, detail: string): boolean {
  return status === 429 || detail.includes('RESOURCE_EXHAUSTED')
}

/** Places API の失敗レスポンスを、利用上限かどうかで分けた Error にする */
export function placesApiError(status: number, detail: string): Error {
  if (isPlacesQuotaExceeded(status, detail)) {
    return new PlacesQuotaExceededError(detail)
  }
  return new Error(`Places API エラー (${status}): ${detail}`)
}
