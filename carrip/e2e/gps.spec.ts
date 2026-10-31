import { expect, test } from '@playwright/test'
import { mockExternalApis } from './support/mock-api'

/**
 * GPS（現在地）で出発地を入れる（FR-08 / #689）。
 * 位置情報はブラウザの機能で疑似的に与える。実機（iPhone の Safari など）での確認は
 * docs/testing/gps-device-test.md の手順で行う
 */

const KYOTO_STATION = { latitude: 34.985849, longitude: 135.758767 }

test.beforeEach(async ({ page }) => {
  await mockExternalApis(page)
})

test.describe('位置情報を許可したとき', () => {
  test.use({ geolocation: KYOTO_STATION, permissions: ['geolocation'] })

  test('現在地の座標が出発地に入り、その座標で行き先まで進める', async ({ page }) => {
    await page.goto('/plan/new?step=1')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '現在地を使う' }).click()

    await expect(page.getByLabel('出発地')).toHaveValue('現在地（34.98585, 135.75877）')
    await expect(page.getByText('出発地を入力してください')).toHaveCount(0)

    // 座標の出発地のまま、行き先の画面まで進める
    await page.getByRole('button', { name: '次へ' }).click()
    await page.getByRole('tab', { name: '関西' }).click()
    await page.getByLabel('京都府').check()
    await page.getByRole('button', { name: '次へ' }).click()
    await page.getByRole('button', { name: '確認へ' }).click()
    await expect(page.getByText('現在地（34.98585, 135.75877）').first()).toBeVisible()
    await page.getByRole('button', { name: '行き先を選ぶ' }).click()
    await expect(page).toHaveURL(/\/plan\/[^/]+\/spots/)
  })
})

test.describe('位置情報を拒否したとき', () => {
  test.use({ permissions: [] })

  test('手入力に戻れるようメッセージを出し、出発地は空のまま入力できる', async ({ page }) => {
    await page.goto('/plan/new?step=1')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '現在地を使う' }).click()

    await expect(page.getByText(/位置情報.*出発地を入力してください/)).toBeVisible()
    await expect(page.getByLabel('出発地')).toHaveValue('')

    // フォールバック：手入力で先に進める
    await page.getByLabel('出発地').fill('京都駅')
    await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled()
  })
})
