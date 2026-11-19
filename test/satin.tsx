/**
 * What a Satin test imports (`import { renderWithSatin, expectNoAxeViolations } from 'satin-test'`):
 *
 * - renderWithSatin(ui, { labels, theme, dir }): Testing Library's render inside SatinLabels, with
 *   the theme and direction set on <html> as an app sets them, and a user-event `user` ready.
 * - expectNoAxeViolations(container?): runs axe over what's on the page (portaled overlays
 *   included) and fails with each violation's rule, help text and element.
 * - setReducedMotion(on) / setColorScheme(scheme): the system settings Satin reads (test/media.ts).
 */
import * as React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { expect } from 'vitest'
import { SatinLabels, type SatinLabelSet } from '@uisatin/ui/labels'

export { setColorScheme, setReducedMotion } from './media'

export type SatinTheme = 'light' | 'dark' | 'system'

export interface SatinRenderOptions extends Omit<RenderOptions, 'wrapper' | 'queries'> {
  /** Words to translate or reword, as an app passes them to SatinLabels. */
  labels?: Partial<SatinLabelSet>
  /** `data-theme` on <html>: `dark`, `system` (follows setColorScheme), or light (none). */
  theme?: SatinTheme
  /** `dir` on <html>, for right-to-left. */
  dir?: 'ltr' | 'rtl'
}

export function renderWithSatin(ui: React.ReactNode, { labels, theme = 'light', dir, ...options }: SatinRenderOptions = {}) {
  const html = document.documentElement
  if (theme === 'light') html.removeAttribute('data-theme')
  else html.setAttribute('data-theme', theme)
  if (dir) html.setAttribute('dir', dir)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (labels ? <SatinLabels labels={labels}>{children}</SatinLabels> : <>{children}</>)
  return { user: userEvent.setup(), ...render(ui, { wrapper: Wrapper, ...options }) }
}

/**
 * Every axe rule that can judge a component on its own. Off: `region` (an app's landmarks, not a
 * component's) and `color-contrast` (jsdom has no layout or colours; `npm run check:contrast`
 * checks the tokens instead).
 */
export async function expectNoAxeViolations(container: Element = document.body) {
  const results = await axe(container, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } })
  const found = results.violations.map(
    // The rule, then each element with the first thing that would fix it.
    (v) => `${v.id}: ${v.help}\n    ${v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`).join('\n    ')}`,
  )
  expect(found, 'axe violations').toEqual([])
}
