import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Alert } from '../components/alert'
import { Banner } from '../components/banner'
import { Button } from '../components/button'
import { PromptBar } from '../components/prompt-bar'

const bar = () => document.querySelector('[data-slot="prompt-bar"]')!
const slot = () => document.querySelector('[data-slot="prompt-bar-notice"]')

function Dismissable() {
  const [shown, setShown] = React.useState(true)
  return (
    <PromptBar
      notice={
        shown ? <Alert layout="inline" intent="info" title="You can launch your agents anywhere in the app" onDismiss={() => setShown(false)} /> : null
      }
    />
  )
}

describe('PromptBar notice', () => {
  it('renders the notice first in the bar, above the field, and takes radius 20 in either shape', () => {
    const { rerender } = renderWithSatin(
      <PromptBar
        shape="default"
        notice={<Banner layout="inline" title="Fable 5.2 available" action={<Button variant="secondary">Relaunch</Button>} onDismiss={() => {}} />}
      />,
    )
    const notice = slot()!
    expect(notice).toBeTruthy()
    expect(notice.querySelector('[data-slot="banner"]')?.getAttribute('data-layout')).toBe('inline')
    // First visible row: only the hidden file input comes before it.
    expect(notice.compareDocumentPosition(screen.getByRole('textbox', { name: 'Message' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(bar().className).toContain('rounded-3xl')
    rerender(<PromptBar shape="pill" notice={<Alert layout="inline" title="Hi" />} />)
    expect(bar().className).toContain('rounded-3xl')
    rerender(<PromptBar shape="pill" />)
    expect(slot()).toBeNull()
    expect(bar().className).toContain('rounded-pill')
  })

  it('drops the slot once the notice is dismissed', async () => {
    const { user } = renderWithSatin(<Dismissable />)
    expect(screen.getByRole('status').textContent).toContain('anywhere in the app')
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(slot()).toBeNull()
  })

  it('hands focus to the field when the notice is dismissed from the keyboard', async () => {
    const { user } = renderWithSatin(<Dismissable />)
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    dismiss.focus()
    await user.keyboard('{Enter}')
    expect(slot()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Message' }))
  })

  it('does not send the typed text when a button in the notice is pressed', async () => {
    const onSubmit = vi.fn()
    const relaunch = vi.fn()
    const { user } = renderWithSatin(
      <PromptBar
        onSubmit={onSubmit}
        notice={
          <Banner layout="inline" title="Fable 5.2 available" action={<Button variant="secondary" onClick={relaunch}>Relaunch</Button>} />
        }
      />,
    )
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Relaunch' }))
    expect(relaunch).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('Hello')
  })

  it('names the dismiss button in the labels', async () => {
    const { user } = renderWithSatin(<Dismissable />, { labels: { dismiss: 'Odrzuć' } })
    await user.click(screen.getByRole('button', { name: 'Odrzuć' }))
    expect(slot()).toBeNull()
  })

  it('dims a disabled bar but not its notice', () => {
    renderWithSatin(<PromptBar disabled notice={<Alert layout="inline" title="Read only" onDismiss={() => {}} />} />)
    expect(bar().className).not.toContain('opacity-50')
    expect(slot()!.className).not.toContain('opacity')
    expect((screen.getByRole('button', { name: 'Dismiss' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('textbox', { name: 'Message' }).closest('.opacity-50')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <PromptBar notice={<Alert layout="inline" intent="error" title="Agents will be unavailable overnight on 23.11.2026" onDismiss={() => {}} />} />,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
