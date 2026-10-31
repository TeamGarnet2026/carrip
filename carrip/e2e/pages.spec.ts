import { expect, test } from '@playwright/test'

/** ログインなしで開ける画面が、どのブラウザでも表示できることを確かめる */

test('ログイン画面にメールアドレスとパスワードの入力欄がある', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('メールアドレス')).toBeVisible()
  await expect(page.getByLabel('パスワード')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible()
})

test('新規登録画面を開ける', async ({ page }) => {
  await page.goto('/signup')
  await expect(page.getByLabel('メールアドレス')).toBeVisible()
})

test('マイプランはログイン画面に案内される', async ({ page }) => {
  await page.goto('/trips')
  await expect(page).toHaveURL(/\/login/)
})

test('存在しないページでは 404 画面を出す', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('link', { name: /トップ|ホーム/ }).first()).toBeVisible()
})
