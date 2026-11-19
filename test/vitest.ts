/**
 * The Vitest project every Satin package shares (packages/ui and packages/ui-pro call it from their
 * vitest.config.ts): jsdom, this folder's setup, test files in src/__tests__/*.test.tsx, and the
 * `satin-test` import pointing at test/satin.tsx.
 */
import { fileURLToPath } from 'node:url'
import { defineProject } from 'vitest/config'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export function satinProject(name: string) {
  return defineProject({
    resolve: { alias: { 'satin-test': here('./satin.tsx') } },
    test: {
      name,
      environment: 'jsdom',
      setupFiles: [here('./setup.ts')],
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
      // A package with no runtime tests yet still passes.
      passWithNoTests: true,
      // Radix and axe take a moment on the first test of a file in jsdom.
      testTimeout: 15_000,
    },
  })
}
