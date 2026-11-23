import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { promptValue, usePromptMentions, type PromptMention, type PromptValue } from '../components/prompt-mentions'
import { CharacterCount, Textarea } from '../components/textarea'

const people: PromptMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter' },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager' },
]
const mentions = { search: (q: string) => people.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())) }

/** A Satin Textarea with @mentions: the hook's fills as the underlay, its handlers on the field. */
function CommentField({ onValue, disabled }: { onValue?: (v: PromptValue) => void; disabled?: boolean }) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = React.useState<PromptValue>(() => promptValue([]))
  const m = usePromptMentions({
    textareaRef: ref,
    value,
    onValueChange: (v) => {
      setValue(v)
      onValue?.(v)
    },
    mentions,
    disabled,
  })
  const { onChange, ...handlers } = m.textareaProps
  return (
    <>
      <Textarea
        ref={ref}
        label="Comment"
        disabled={disabled}
        value={value.text}
        underlay={m.overlay}
        {...handlers}
        onChange={(_, event) => onChange(event)}
      />
      {m.menu}
    </>
  )
}

describe('Textarea', () => {
  it('passes the change event after the value', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Textarea label="Bio" onChange={onChange} />)
    await user.type(screen.getByRole('textbox', { name: 'Bio' }), 'a')
    const [value, event] = onChange.mock.lastCall!
    expect(value).toBe('a')
    expect(event.target).toBe(screen.getByRole('textbox', { name: 'Bio' }))
  })

  it('draws an underlay under the text, on a fill layer of its own', () => {
    renderWithSatin(<Textarea label="Bio" underlay={<div data-testid="under" />} />)
    const field = screen.getByRole('textbox', { name: 'Bio' })
    const box = field.parentElement!
    const [fill, under] = Array.from(box.children)
    expect(fill!.getAttribute('data-slot')).toBe('textarea-fill')
    expect(fill!.getAttribute('aria-hidden')).toBe('true')
    expect(under).toBe(screen.getByTestId('under'))
    expect(field.hasAttribute('data-underlay')).toBe(true)
    // Underlay and fill come before the textarea, so it paints over them.
    expect(fill!.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps its markup without an underlay', () => {
    renderWithSatin(<Textarea label="Bio" />)
    const field = screen.getByRole('textbox', { name: 'Bio' })
    expect(field.hasAttribute('data-underlay')).toBe(false)
    expect(document.querySelector('[data-slot="textarea-fill"]')).toBeNull()
    expect(field.previousElementSibling).toBeNull()
  })

  it('marks the fill disabled with the field', () => {
    renderWithSatin(<Textarea label="Bio" disabled underlay={<span />} />)
    expect(document.querySelector('[data-slot="textarea-fill"]')!.hasAttribute('data-disabled')).toBe(true)
  })

  it('takes @mentions with usePromptMentions: @ta opens the menu, Enter inserts the token', async () => {
    const onValue = vi.fn()
    const { user } = renderWithSatin(<CommentField onValue={onValue} />)
    const field = screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement
    await user.click(field)
    await user.keyboard('@ta')
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['TMTara MendesRecruiter'])
    await user.keyboard('{Enter}')
    expect(field.value).toBe('@Tara Mendes ')
    expect(screen.queryByRole('listbox')).toBeNull()
    const value = onValue.mock.lastCall![0] as PromptValue
    expect(value.mentions).toEqual([expect.objectContaining({ id: 'tara', start: 0, end: 12 })])
    // The token's fill is in the underlay, inside the field's box, under the textarea.
    const token = document.querySelector('[data-slot="prompt-tokens"] [data-token="mention"]')
    expect(token?.textContent).toBe('@Tara Mendes')
    expect(token!.closest('[data-slot="prompt-tokens"]')!.parentElement).toBe(field.parentElement)
  })

  it.each(['light', 'dark'] as const)('has no axe violations with mentions in %s', async (theme) => {
    const { user } = renderWithSatin(<CommentField />, { theme })
    await user.click(screen.getByRole('textbox', { name: 'Comment' }))
    await user.keyboard('@t')
    await expectNoAxeViolations()
  })
})

describe('CharacterCount', () => {
  it('reads the count against a limit', () => {
    renderWithSatin(<CharacterCount data-testid="count" count={134} max={120} />)
    const el = screen.getByTestId('count')
    expect(el.textContent).toBe('Characters used: 134/120')
    expect(el.className).toContain('text-text-destructive')
  })

  it('stays muted under the limit', () => {
    renderWithSatin(<CharacterCount data-testid="count" count={12} max={120} />)
    expect(screen.getByTestId('count').className).not.toContain('text-text-destructive')
  })

  it('says the count in words without a limit', () => {
    const { rerender } = renderWithSatin(<CharacterCount data-testid="count" count={1948} />)
    expect(screen.getByTestId('count').textContent).toBe('1,948 characters')
    rerender(<CharacterCount data-testid="count" count={1} />)
    expect(screen.getByTestId('count').textContent).toBe('1 character')
  })

  it('takes its words and number format from SatinLabels', () => {
    renderWithSatin(
      <>
        <CharacterCount data-testid="free" count={1948} />
        <CharacterCount data-testid="max" count={3} max={10} />
      </>,
      {
        labels: {
          dateLocale: 'de-DE',
          charactersUsed: 'Zeichen',
          characterCount: (count, formatted) => `${formatted} ${count === 1 ? 'Zeichen' : 'Zeichen gesamt'}`,
        },
      },
    )
    expect(screen.getByTestId('free').textContent).toBe('1.948 Zeichen gesamt')
    expect(screen.getByTestId('max').textContent).toBe('Zeichen: 3/10')
  })

  it('is the counter Textarea describes itself with', () => {
    renderWithSatin(<Textarea label="Bio" id="bio" defaultValue="Hello" maxLength={120} />)
    const field = screen.getByRole('textbox', { name: 'Bio' })
    expect(field.getAttribute('aria-describedby')).toBe('bio-counter')
    expect(document.getElementById('bio-counter')!.textContent).toBe('Characters used: 5/120')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Textarea label="Bio" defaultValue="Hello" maxLength={3} />
        <CharacterCount count={948} />
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
