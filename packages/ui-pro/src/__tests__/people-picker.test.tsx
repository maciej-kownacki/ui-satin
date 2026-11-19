import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { PeoplePicker, initialsOf, type Person } from '../components/people-picker'

const marta: Person = { id: 'marta', name: 'Marta Nowak', role: 'Hiring manager' }
const jon: Person = { id: 'jon', name: 'Jon Park', role: 'Staff engineer' }
const ada: Person = { id: 'ada', name: 'Ada Novak', role: 'Design lead' }
const ola: Person = { id: 'ola', name: 'Ola Wiśniewska', role: 'Recruiter, on leave', disabled: true }
const leo: Person = { id: 'leo', name: 'Leo Kim', email: 'leo@example.com' }
const PEOPLE = [ada, jon, leo, marta, ola]

const field = () => screen.getByRole('button', { name: /Interviewers/ })

/**
 * What a screen reader hears for an option. In a browser the name and the role are separate flex
 * items, so a space follows the hidden comma; jsdom has no layout and leaves it out. Put it back.
 */
const spoken = (name: string) => name.replace(/,(?=\S)/g, ', ')
const optionNames = () => {
  const names: string[] = []
  screen.queryAllByRole('option', { name: (name) => (names.push(spoken(name)), true) })
  return names
}
const named = (text: string) => (name: string) => spoken(name) === text

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('PeoplePicker', () => {
  it('lists Recent first, then everyone else once, each read with their role', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple people={PEOPLE} recent={[marta]} />)
    await user.click(field())
    const recent = screen.getByRole('group', { name: 'Recent' })
    expect(within(recent).getByRole('option', { name: named('Marta Nowak, Hiring manager') })).toBeTruthy()
    const everyone = screen.getByRole('group', { name: 'People' })
    expect(within(everyone).queryByRole('option', { name: /Marta/ })).toBeNull()
    // No role: the email takes its place.
    expect(within(everyone).getByRole('option', { name: named('Leo Kim, leo@example.com') })).toBeTruthy()
  })

  it('opens with Enter, picks with the arrows and Enter, and shows each pick as a chip', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple people={PEOPLE} recent={[marta]} onValueChange={onValueChange} />)
    await user.tab()
    expect(document.activeElement).toBe(field())
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    // Marta (Recent), then Ada, the first of everyone else.
    await user.keyboard('{Enter}{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith([marta, ada])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(field())
    expect(screen.getByRole('button', { name: 'Remove Marta Nowak' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Ada Novak' })).toBeTruthy()
  })

  it('filters by name, role and email, ignoring accents, and drops Recent while typing', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" people={PEOPLE} recent={[marta]} />)
    await user.click(field())
    await user.keyboard('wisn')
    expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull()
    expect(optionNames()).toEqual(['Ola Wiśniewska, Recruiter, on leave'])
    await user.clear(screen.getByRole('combobox'))
    await user.keyboard('engineer')
    expect(optionNames()).toEqual(['Jon Park, Staff engineer'])
    await user.clear(screen.getByRole('combobox'))
    await user.keyboard('example.com')
    expect(optionNames()).toEqual(['Leo Kim, leo@example.com'])
  })

  it('lists a disabled person but does not pick them', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" people={PEOPLE} onValueChange={onValueChange} />)
    await user.click(field())
    const option = screen.getByRole('option', { name: /Ola Wiśniewska/ })
    expect(option.getAttribute('aria-disabled')).toBe('true')
    await user.click(option)
    await user.keyboard('ola{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('lists titled groups', async () => {
    const { user } = renderWithSatin(
      <PeoplePicker
        label="Interviewers"
        groups={[
          { label: 'Design', people: [ada, marta] },
          { label: 'Engineering', people: [jon] },
        ]}
      />,
    )
    await user.click(field())
    expect(within(screen.getByRole('group', { name: 'Design' })).getAllByRole('option')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: 'Engineering' })).getAllByRole('option')).toHaveLength(1)
  })

  it('one pick fills the field with the name and closes the list', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" people={PEOPLE} />)
    await user.click(field())
    await user.click(screen.getByRole('option', { name: /Jon Park/ }))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field().textContent).toBe('Jon Park')
  })

  it('searches after the debounce, busy meanwhile, and drops a stale answer', async () => {
    const answers: Record<string, ReturnType<typeof deferred<Person[]>>> = {}
    const signals: Record<string, AbortSignal> = {}
    const search = vi.fn((query: string, { signal }: { signal: AbortSignal }) => {
      signals[query] = signal
      answers[query] = deferred<Person[]>()
      return answers[query].promise
    })
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple search={search} searchDelay={40} />)
    await user.click(field())
    // Opening searches at once, with an empty query.
    await waitFor(() => expect(search).toHaveBeenCalledWith('', expect.anything()))
    expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Searching…')).toBeTruthy()
    await act(async () => answers[''].resolve([ada, jon]))
    expect(optionNames()).toEqual(['Ada Novak, Design lead', 'Jon Park, Staff engineer'])
    expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBeNull()

    // Two quick keys make one request.
    await user.keyboard('ma')
    await waitFor(() => expect(search).toHaveBeenCalledWith('ma', expect.anything()))
    expect(search.mock.calls.map(([q]) => q)).toEqual(['', 'ma'])
    expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBe('true')

    // A newer query aborts 'ma'; its late answer is dropped.
    await user.keyboard('r')
    await waitFor(() => expect(search).toHaveBeenCalledWith('mar', expect.anything()))
    expect(signals.ma.aborted).toBe(true)
    await act(async () => answers.mar.resolve([marta]))
    await act(async () => answers.ma.resolve([ada]))
    expect(optionNames()).toEqual(['Marta Nowak, Hiring manager'])

    // A pick keeps its chip when the results move on.
    await user.keyboard('{Enter}')
    await user.keyboard('{Backspace}{Backspace}{Backspace}x')
    await waitFor(() => expect(search).toHaveBeenCalledWith('x', expect.anything()))
    await act(async () => answers.x.resolve([]))
    expect(screen.getByText('No one matches “x”')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Marta Nowak' })).toBeTruthy()
  })

  it('says so when the search fails', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" search={() => Promise.reject(new Error('offline'))} />)
    await user.click(field())
    expect(await screen.findByText('Couldn’t search. Type again to retry.')).toBeTruthy()
  })

  it('folds chips after maxChips into +N, which shows them all and moves focus to the first it showed', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple people={PEOPLE} defaultValue={[marta, jon, ada, leo]} maxChips={2} />)
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2)
    const more = screen.getByRole('button', { name: 'Show 2 more' })
    expect(more.textContent).toBe('+2')
    await user.click(more)
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(4)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Ada Novak' }))
  })

  it('moves focus to the chip that takes a removed one’s place, then to the field', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple people={PEOPLE} defaultValue={[marta, jon]} />)
    await user.click(screen.getByRole('button', { name: 'Remove Marta Nowak' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Jon Park' }))
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(field())
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull()
  })

  it('speaks the words it is given', async () => {
    const { user } = renderWithSatin(<PeoplePicker label="Interviewers" multiple people={PEOPLE} recent={[marta]} />, {
      labels: {
        recentPeople: 'Ostatnie',
        allPeople: 'Wszyscy',
        addPeople: 'Dodaj osoby',
        searchPeople: 'Szukaj osób…',
        noPeopleFound: (q) => `Nikt nie pasuje do „${q}”`,
      },
    })
    expect(field().textContent).toBe('Dodaj osoby')
    await user.click(field())
    expect(screen.getByRole('group', { name: 'Ostatnie' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Wszyscy' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Szukaj osób…' })).toBeTruthy()
    await user.keyboard('zz')
    expect(screen.getByText('Nikt nie pasuje do „zz”')).toBeTruthy()
  })

  it('draws initials from the first and last name', () => {
    expect(initialsOf('Marta Nowak')).toBe('MN')
    expect(initialsOf('Ada')).toBe('A')
    expect(initialsOf('  łukasz  de la Żak ')).toBe('ŁŻ')
  })

  it.each(['light', 'dark'] as const)('has no axe violations, closed with chips and open with groups, in %s', async (theme) => {
    const { user } = renderWithSatin(
      <PeoplePicker label="Interviewers" multiple people={PEOPLE} recent={[marta]} defaultValue={[jon, ada, leo]} maxChips={2} />,
      { theme },
    )
    await expectNoAxeViolations()
    await user.click(field())
    await expectNoAxeViolations()
    // No one matches: the list holds only the message.
    await user.keyboard('zz')
    await expectNoAxeViolations()
  })
})
