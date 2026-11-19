import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { CodeBlock } from '../components/code-block'

describe('CodeBlock', () => {
  it('names its code region after the file', () => {
    renderWithSatin(<CodeBlock filename="session.ts" code="const a = 1" />, { labels: { codeRegion: (name) => `Kod ${name}` } })
    expect(screen.getByRole('region', { name: 'Kod session.ts' })).toBeTruthy()
  })

  it('takes aria-label and aria-labelledby on the region, where they mean something', () => {
    renderWithSatin(
      <>
        <span id="tool">Find slots</span>
        <CodeBlock filename="Input" code="{}" aria-label="Find slots input" />
        <CodeBlock filename="Input" code="{}" aria-labelledby="tool" />
      </>,
    )
    expect(screen.getByRole('region', { name: 'Find slots input' }).tagName).toBe('PRE')
    expect(screen.getByRole('region', { name: 'Find slots' }).tagName).toBe('PRE')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<CodeBlock filename="diff.ts" view="diff" code={'+const a = 1\n-const a = 2\n b()'} />, { theme })
    await expectNoAxeViolations()
  })
})
