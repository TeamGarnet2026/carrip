import { defineConfig, devices } from '@playwright/test'

/**
 * ブラウザ互換の E2E テスト（#699）。
 * 外部 API（Google Places / NAVITIME）は e2e/support/mock-api.ts で固定の応答に差し替えるため、
 * API キーや利用回数がなくても毎回同じ結果で動く。
 *
 * - `npm run test:e2e`              … 全ブラウザで実行
 * - `npm run test:e2e -- --project=webkit`  … ブラウザを指定して実行
 *
 * Chrome / Edge は PC にインストールされている正式版を使う（channel）。
 * WebKit（Safari のエンジン）は `npx playwright install webkit` で入れる。
 * Firefox は普及率が下がっているため、テストのコストを減らす目的で対象から外している。
 */
const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 開発サーバーは初回表示時にページをコンパイルするため、同時に開く数を抑える
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
})
