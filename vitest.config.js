import { defineConfig } from 'vitest/config';

// A9: 回帰テスト用の独立 Vitest 設定。
// 本番 vite.config.js（Base44 vite-plugin 含む）とは分離し、純粋関数テストへの
// プラグイン副作用を避けるため plugins を持たない。対象は src/lib の純粋関数のみ。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    globals: false,
  },
});
