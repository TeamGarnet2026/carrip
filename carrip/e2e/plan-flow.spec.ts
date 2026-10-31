import { expect, test } from '@playwright/test'
import { mockExternalApis } from './support/mock-api'

/**
 * 旅程づくりの主な流れ（条件入力 → 行き先 → ルートと料金）が、
 * どのブラウザでも最後まで操作できることを確かめる
 */
const pageErrors: string[] = []

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await mockExternalApis(page)
})

// 画面の JavaScript エラー（ブラウザ固有の API の違いなど）が出ていないこと
test.afterEach(() => {
  expect(pageErrors).toEqual([])
})

test('ホームから旅程づくりを始められる', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/plan/new?step=1')
  await expect(page.getByRole('heading', { name: 'どこから、いつ出発しますか？' })).toBeVisible()
})

test('条件を入力し、おすすめの行き先からルートと料金まで進める', async ({ page, isMobile }) => {
  // 1. 出発地・日程
  await page.goto('/plan/new?step=1')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('出発地').fill('京都駅')
  await page.getByRole('button', { name: '次へ' }).click()

  // 2. 目的地・人数・車種
  await expect(page.getByRole('heading', { name: 'どこへ、何人で行きますか？' })).toBeVisible()
  await page.getByRole('tab', { name: '関西' }).click()
  await page.getByLabel('京都府').check()
  await page.getByRole('button', { name: '人数を増やす' }).click()
  await page.getByRole('button', { name: '次へ' }).click()

  // 3. こだわりの条件（すべて任意）
  await expect(page.getByRole('heading', { name: 'こだわりの条件' })).toBeVisible()
  await page.getByRole('button', { name: '確認へ' }).click()

  // 4. 確認
  await expect(page.getByText('京都府 · ')).toBeVisible()
  await page.getByRole('button', { name: '行き先を選ぶ' }).click()

  // 行き先：おすすめから日帰りの3か所が自動で選ばれる
  await expect(page).toHaveURL(/\/plan\/[^/]+\/spots/)
  await expect(page.getByText('おすすめから3か所を自動で選びました')).toBeVisible()
  if (isMobile) {
    // スマホ：画面下に選んだ数、カードの ✓ で外す
    await expect(page.getByText('3か所を選択中')).toBeVisible()
    await page.getByRole('button', { name: '清水寺を外す' }).filter({ visible: true }).click()
    await expect(page.getByText('2か所を選択中')).toBeVisible()
  } else {
    // PC：右側の「選んだ行き先」の ✕ で外す
    const selected = page.getByRole('complementary').filter({ hasText: '選んだ行き先' })
    await expect(selected.getByRole('button', { name: /を外す$/ })).toHaveCount(3)
    await selected.getByRole('button', { name: '清水寺を外す' }).click()
    await expect(selected.getByRole('button', { name: /を外す$/ })).toHaveCount(2)
  }
  // 編集すると「選び直す」が出る
  await expect(page.getByRole('button', { name: 'おすすめで選び直す' })).toBeVisible()

  // ルートと料金
  await page
    .getByRole('button', { name: isMobile ? '料金を計算' : 'ルートと料金を計算する' })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL(/\/plan\/[^/]+\/routes/)
  await expect(page.getByRole('heading', { name: 'ルートと料金' })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'ルート候補' }).getByRole('radio')).toHaveCount(3)
  if (isMobile) {
    // スマホ：ルート一覧 → 詳細の2画面
    await page.getByRole('button', { name: /の詳細を見る$/ }).click()
  }
  await expect(page.getByText('総費用').filter({ visible: true }).first()).toBeVisible()
})

test('入力が足りないときは次へ進めない', async ({ page }) => {
  await page.goto('/plan/new?step=1')
  await page.getByLabel('出発地').fill('')
  await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled()
})
