import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // 単体テストの対象はビジネスロジック（lib）。画面・API ルートは結合テストで確認する
      include: ['lib/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        // 型定義のみのファイル
        'lib/**/types.ts',
        // 開発用の API テスト画面の定義
        'lib/dev/**',
        // テスト用ヘルパー
        'lib/test-utils/**',
      ],
      reporter: ['text-summary', 'text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // 目標 80%（#696）。下回ったら CI を失敗させる
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
