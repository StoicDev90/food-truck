import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: 'tests/db/global-setup.ts',
    setupFiles: ['tests/db/env.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
