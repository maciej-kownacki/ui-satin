import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { AgentSuggestion, AgentSuggestionChanges, AgentSuggestionChangeValue } from '../components/agent-suggestion'

const changes = [
  { field: 'Stage', from: 'Proposal', to: 'Negotiation' },
  { field: 'Owner', to: 'Tara Mendes' },
]

describe('AgentSuggestionChanges', () => {
  it('lists each field with its old value struck through and the new one', () => {
    renderWithSatin(<AgentSuggestionChanges changes={changes} />)
    const terms = screen.getAllByRole('term')
    expect(terms.map((t) => t.textContent)).toEqual(['Stage', 'Owner'])
    expect(screen.getByRole('deletion').textContent).toBe('Proposal')
    expect(screen.getAllByRole('definition')[0].textContent).toBe('ProposalNegotiation')
    // No old value, no strike and no arrow.
    expect(screen.getAllByRole('definition')[1].textContent).toBe('Tara Mendes')
  })
})

describe('AgentSuggestionChangeValue', () => {
  it('draws one change on its own, with ref and props on its span', () => {
    let node: HTMLSpanElement | null = null
    renderWithSatin(<AgentSuggestionChangeValue ref={(n) => void (node = n)} from="$18,000" to="$22,000" title="Value" />)
    expect(node!.getAttribute('data-slot')).toBe('agent-suggestion-change-value')
    expect(node!.getAttribute('title')).toBe('Value')
    expect(screen.getByRole('deletion').textContent).toBe('$18,000')
  })
})

describe('AgentSuggestion', () => {
  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <AgentSuggestion kind="CRM update" title="Update the Quanta deal">
        <AgentSuggestionChanges changes={changes} />
      </AgentSuggestion>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
