import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { PromptBar } from '../components/prompt-bar'
import { promptValue, type PromptCommand, type PromptMention, type PromptValue } from '../components/prompt-mentions'

const people: PromptMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter' },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager' },
  { id: 'priya', label: 'Priya Nair', description: 'Candidate' },
]
const search = (query: string) => people.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
const mentions = { search }
const schedule: PromptCommand = { name: 'schedule', description: 'Find a time and send an invite' }
const summarize: PromptCommand = { name: 'summarize', description: 'Sum up a thread' }

const field = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement
const optionNames = () => screen.getAllByRole('option').map((o) => o.textContent)

describe('PromptBar mentions and commands', () => {
  it('opens the mentions after @, filters as you type and inserts the highlighted row with Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<PromptBar mentions={mentions} onValueChange={onValueChange} />)
    await user.click(field())
    await user.keyboard('@')
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    expect(optionNames()).toHaveLength(3)
    await user.keyboard('t')
    expect(optionNames()).toEqual(['TMTara MendesRecruiter', 'TOTom OkaforEngineering manager'])
    // The field points at the list and its highlighted row.
    const first = screen.getAllByRole('option')[0]!
    expect(field().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id)
    expect(field().getAttribute('aria-activedescendant')).toBe(first.id)
    await user.keyboard('{ArrowDown}')
    expect(field().getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1]!.id)
    await user.keyboard('{ArrowUp}{Enter}')
    expect(field().value).toBe('@Tara Mendes ')
    expect(screen.queryByRole('listbox')).toBeNull()
    const [text, detail] = onValueChange.mock.lastCall as [string, PromptValue]
    expect(text).toBe('@Tara Mendes ')
    expect(detail.mentions).toEqual([expect.objectContaining({ id: 'tara', label: 'Tara Mendes', start: 0, end: 12 })])
    expect(screen.getByRole('status').textContent).toBe('@Tara Mendes added')
    // The caret is after the token and its space.
    expect(field().selectionStart).toBe(13)
  })

  it('inserts with Tab and with a click, keeping focus in the field', async () => {
    const { user } = renderWithSatin(<PromptBar mentions={mentions} />)
    await user.click(field())
    await user.keyboard('@pri{Tab}')
    expect(field().value).toBe('@Priya Nair ')
    await user.keyboard('and @to')
    await user.click(screen.getByRole('option', { name: /Tom Okafor/ }))
    expect(field().value).toBe('@Priya Nair and @Tom Okafor ')
    expect(document.activeElement).toBe(field())
  })

  it('runs the scenario: @Tara Mendes /schedule interview next week', async () => {
    const run = vi.fn()
    const onSubmit = vi.fn()
    const { user } = renderWithSatin(
      <PromptBar mentions={mentions} commands={[{ ...schedule, run }, summarize]} onSubmit={onSubmit} />,
    )
    await user.click(field())
    await user.keyboard('@Tara{Enter}/')
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeTruthy()
    expect(optionNames()).toEqual(['/scheduleFind a time and send an invite', '/summarizeSum up a thread'])
    await user.keyboard('sch{Enter}interview next week')
    expect(field().value).toBe('@Tara Mendes /schedule interview next week')
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(run).toHaveBeenCalledTimes(1)
    const { args, value } = run.mock.lastCall![0] as { args: string; value: PromptValue }
    expect(args).toBe('interview next week')
    expect(value.mentions.map((m) => m.label)).toEqual(['Tara Mendes'])
    expect(value.command).toEqual({ name: 'schedule', start: 13, end: 22, args: 'interview next week' })
    expect(field().value).toBe('')
  })

  it('makes a typed command a token at the space after its name, and takes one command per message', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithSatin(<PromptBar commands={[schedule]} onSubmit={onSubmit} />)
    await user.click(field())
    await user.keyboard('/schedule ')
    expect(screen.getByRole('status').textContent).toBe('/schedule added')
    await user.keyboard('a/b /')
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.keyboard('{Enter}')
    // Without `run`, onSubmit gets the message with its command.
    expect(onSubmit).toHaveBeenCalledWith('/schedule a/b /', [], expect.objectContaining({ command: expect.objectContaining({ name: 'schedule', args: 'a/b /' }) }))
  })

  it('says when nothing matches, and Enter then sends', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithSatin(<PromptBar mentions={mentions} onSubmit={onSubmit} />, {
      labels: { noResultsFor: (q) => `Brak wyników dla ${q}`, mentions: 'Wzmianki' },
    })
    await user.click(field())
    await user.keyboard('@zz')
    expect(screen.getByRole('dialog', { name: 'Wzmianki' }).textContent).toContain('Brak wyników dla @zz')
    expect(screen.getByRole('status').textContent).toBe('Brak wyników dla @zz')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field().hasAttribute('aria-activedescendant')).toBe(false)
    // With a space and still no match, the menu closes: the text has moved on.
    await user.keyboard(' x')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('@zz x', [], { text: '@zz x', mentions: [] })
  })

  it('closes with Escape until the next trigger', async () => {
    const { user } = renderWithSatin(<PromptBar mentions={mentions} />)
    await user.click(field())
    await user.keyboard('@t')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.keyboard('a')
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.keyboard(' @')
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('removes a whole token with Backspace at its end and Delete at its start', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <PromptBar mentions={mentions} defaultValue={promptValue([people[0]!, ' hi'])} onValueChange={onValueChange} />,
      { labels: { tokenRemoved: (t) => `Usunięto ${t}` } },
    )
    await user.click(field())
    field().setSelectionRange(12, 12)
    await user.keyboard('{Backspace}')
    expect(field().value).toBe(' hi')
    expect(onValueChange).toHaveBeenLastCalledWith(' hi', { text: ' hi', mentions: [] })
    expect(screen.getByRole('status').textContent).toBe('Usunięto @Tara Mendes')
  })

  it('removes a whole token with Delete at its start, and with a selection that cuts into it', async () => {
    const value = promptValue(['a ', people[0]!, ' b'])
    const { user } = renderWithSatin(<PromptBar mentions={mentions} defaultValue={value} />)
    await user.click(field())
    field().setSelectionRange(2, 2)
    await user.keyboard('{Delete}')
    expect(field().value).toBe('a  b')
    await user.clear(field())
    await user.keyboard('x @tar{Enter}y')
    field().setSelectionRange(0, 5)
    await user.keyboard('{Backspace}')
    expect(field().value).toBe(' y')
  })

  it('keeps the tokens through typing before and after them', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<PromptBar mentions={mentions} defaultValue={promptValue([people[1]!])} onValueChange={onValueChange} />)
    await user.click(field())
    field().setSelectionRange(0, 0)
    await user.keyboard('Ask ')
    field().setSelectionRange(field().value.length, field().value.length)
    await user.keyboard(' now')
    const detail = onValueChange.mock.lastCall![1] as PromptValue
    expect(detail.text).toBe('Ask @Tom Okafor now')
    expect(detail.mentions).toEqual([expect.objectContaining({ id: 'tom', start: 4, end: 15 })])
    // Typing inside a token's text unmakes it.
    field().setSelectionRange(8, 8)
    fireEvent.change(field(), { target: { value: 'Ask @TomX Okafor now', selectionStart: 9, selectionEnd: 9 } })
    expect((onValueChange.mock.lastCall![1] as PromptValue).mentions).toEqual([])
  })

  it('opens no menu while an input method composes', async () => {
    renderWithSatin(<PromptBar mentions={mentions} commands={[schedule]} />)
    const el = field()
    el.focus()
    fireEvent.compositionStart(el)
    fireEvent.change(el, { target: { value: '@', selectionStart: 1, selectionEnd: 1 } })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(el, { key: 'Enter', isComposing: true })
    fireEvent.compositionEnd(el)
    fireEvent.change(el, { target: { value: '@', selectionStart: 1, selectionEnd: 1 } })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(el.value).toBe('@')
  })

  it('takes a controlled PromptValue and reports the next one', async () => {
    function Controlled({ onChange }: { onChange: (v: PromptValue) => void }) {
      const [value, setValue] = React.useState(() => promptValue(['Ping ', people[2]!]))
      return (
        <PromptBar
          mentions={mentions}
          value={value}
          onValueChange={(_, next) => {
            setValue(next)
            onChange(next)
          }}
        />
      )
    }
    const onChange = vi.fn()
    const { user, container } = renderWithSatin(<Controlled onChange={onChange} />)
    expect(container.querySelector('[data-token="mention"]')?.textContent).toBe('@Priya Nair')
    await user.click(field())
    field().setSelectionRange(field().value.length, field().value.length)
    await user.keyboard('!')
    expect(onChange).toHaveBeenLastCalledWith({ text: 'Ping @Priya Nair!', mentions: [expect.objectContaining({ id: 'priya', start: 5, end: 16 })] })
    expect(container.querySelector('[data-token="mention"]')?.textContent).toBe('@Priya Nair')
  })

  it('waits for an async search and drops an answer that came too late', async () => {
    let resolve: (items: PromptMention[]) => void = () => {}
    const slow = vi.fn(() => new Promise<PromptMention[]>((r) => (resolve = r)))
    const { user } = renderWithSatin(<PromptBar mentions={{ search: slow }} />)
    await user.click(field())
    await user.keyboard('@t')
    expect(screen.queryByRole('listbox')).toBeNull()
    await React.act(async () => resolve([people[0]!]))
    expect(optionNames()).toEqual(['TMTara MendesRecruiter'])
  })

  it('leaves a PromptBar without mentions or commands as it was', async () => {
    const onSubmit = vi.fn()
    const { user, container } = renderWithSatin(<PromptBar onSubmit={onSubmit} />)
    await user.click(field())
    await user.keyboard('  @hi /x  {Enter}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(container.querySelector('[data-slot="prompt-tokens"]')).toBeNull()
    expect(field().hasAttribute('aria-autocomplete')).toBe(false)
    expect(onSubmit).toHaveBeenCalledWith('@hi /x', [], { text: '@hi /x', mentions: [] })
  })

  describe('with the rest of the bar', () => {
    const pdf = new File([''], 'Deal_Acme.pdf')
    const models = [
      { value: 'opus', label: 'Opus 5.5' },
      { value: 'sonnet', label: 'Sonnet 5.5' },
    ]

    it('closes the mentions when the + panel opens; the panel keeps @, / and Escape to itself', async () => {
      const onSubmit = vi.fn()
      const { user } = renderWithSatin(<PromptBar mentions={mentions} commands={[schedule]} onSubmit={onSubmit} />)
      await user.click(field())
      await user.keyboard('@t')
      expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Add to conversation' }))
      expect(screen.queryByRole('listbox', { name: 'Mentions' })).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search agents and tools' }))
      await user.keyboard('@/')
      expect(screen.queryByRole('listbox', { name: 'Mentions' })).toBeNull()
      expect(screen.queryByRole('listbox', { name: 'Commands' })).toBeNull()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog', { name: 'Add to conversation' })).toBeNull()
      expect(field().value).toBe('@t')
      expect(onSubmit).not.toHaveBeenCalled()
      // Back in the field, at the query, the menu comes back.
      await user.click(field())
      field().setSelectionRange(2, 2)
      fireEvent.select(field())
      expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    })

    it('sends the files with the mentions, and hands them to a command’s run', async () => {
      const onSubmit = vi.fn()
      const first = renderWithSatin(<PromptBar mentions={mentions} attachments={[pdf]} onSubmit={onSubmit} />)
      await first.user.click(field())
      await first.user.keyboard('@pri{Enter}see this{Enter}')
      expect(onSubmit).toHaveBeenCalledWith('@Priya Nair see this', [pdf], {
        text: '@Priya Nair see this',
        mentions: [expect.objectContaining({ id: 'priya', start: 0, end: 11 })],
      })
      expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull()
      first.unmount()

      const run = vi.fn()
      const { user } = renderWithSatin(<PromptBar mentions={mentions} commands={[{ ...schedule, run }]} attachments={[pdf]} onSubmit={onSubmit} />)
      await user.click(field())
      await user.keyboard('/sch{Enter}call @to{Enter}{Enter}')
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(run).toHaveBeenCalledWith({
        args: 'call @Tom Okafor',
        attachments: [pdf],
        value: expect.objectContaining({ mentions: [expect.objectContaining({ id: 'tom' })] }),
      })
    })

    it('leaves dictation and the models menu working; Enter picks while the menu is open and sends once it is shut', async () => {
      const onSubmit = vi.fn()
      const onModelChange = vi.fn()
      const onDictationChange = vi.fn()
      // jsdom can't run the recording wave's animation; reduced motion leaves it still.
      setReducedMotion(true)
      const { user } = renderWithSatin(
        <PromptBar mentions={mentions} models={models} onModelChange={onModelChange} onDictationChange={onDictationChange} onSubmit={onSubmit} />,
      )
      await user.click(field())
      await user.keyboard('@tar')
      await user.click(screen.getByRole('button', { name: 'Dictate' }))
      expect(onDictationChange).toHaveBeenLastCalledWith(true)
      expect(screen.queryByRole('listbox', { name: 'Mentions' })).toBeNull()
      await user.click(screen.getByRole('button', { name: /Model/ }))
      await user.click(screen.getByRole('menuitemradio', { name: 'Sonnet 5.5' }))
      expect(onModelChange).toHaveBeenCalledWith('sonnet')
      await user.click(field())
      field().setSelectionRange(4, 4)
      fireEvent.select(field())
      await user.keyboard('{Enter}')
      expect(onSubmit).not.toHaveBeenCalled()
      expect(field().value).toBe('@Tara Mendes ')
      await user.keyboard('{Enter}')
      expect(onSubmit).toHaveBeenCalledWith('@Tara Mendes', [], expect.objectContaining({ mentions: [expect.objectContaining({ id: 'tara' })] }))
    })

    it('draws the tokens in a disabled bar, and closes the menu when the bar turns disabled', async () => {
      const seeded = promptValue([people[0]!, ' ', schedule, ' x'])
      const { user, container, rerender } = renderWithSatin(<PromptBar mentions={mentions} commands={[schedule]} defaultValue={seeded} />)
      await user.click(field())
      field().setSelectionRange(field().value.length, field().value.length)
      await user.keyboard(' @')
      expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
      rerender(<PromptBar mentions={mentions} commands={[schedule]} defaultValue={seeded} disabled />)
      expect(screen.queryByRole('listbox')).toBeNull()
      expect(field().disabled).toBe(true)
      expect([...container.querySelectorAll('[data-token]')].map((t) => t.textContent)).toEqual(['@Tara Mendes', '/schedule'])
      expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, with the menu open', async (theme) => {
    const { user } = renderWithSatin(<PromptBar mentions={mentions} commands={[schedule]} defaultValue={promptValue([people[0]!, ' '])} />, { theme })
    await user.click(field())
    field().setSelectionRange(13, 13)
    await user.keyboard('/')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await expectNoAxeViolations()
  })
})
