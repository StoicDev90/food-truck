import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: 'tests/db/global-setup.ts',
    setupFiles: ['tests/db/env.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
