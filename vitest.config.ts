import { defineConfig } from 'vitest/config'

/** `npm test` at the root runs every package's tests (each package's vitest.config.ts, from test/vitest.ts). */
export default defineConfig({
  test: { projects: ['packages/ui', 'packages/ui-pro'] },
})
