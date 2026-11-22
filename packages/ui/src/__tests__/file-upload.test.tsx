import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { FileUpload } from '../components/file-upload'

const zone = () => document.querySelector<HTMLElement>('[data-slot="file-upload-zone"]')!
const dragFiles = { dataTransfer: { types: ['Files'], files: [], dropEffect: 'none' } }

describe('FileUpload', () => {
  it('draws its own upload mark when no media is given', () => {
    renderWithSatin(<FileUpload />)
    expect(zone().querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Drop files here')).toBeTruthy()
  })

  it('shows media in place of the upload mark', () => {
    renderWithSatin(<FileUpload media={<span data-testid="media" aria-hidden />} title="Import leads" />)
    expect(screen.getByTestId('media')).toBeTruthy()
    // The mark is the zone's only svg; with media it isn't drawn.
    expect(zone().querySelector('svg')).toBeNull()
    expect(screen.getByText('Import leads')).toBeTruthy()
  })

  it('keeps media and swaps the title while files are dragged over', () => {
    renderWithSatin(<FileUpload media={<span data-testid="media" aria-hidden />} title="Import leads" dropTitle="Let go to import" />)
    fireEvent.dragEnter(zone(), dragFiles)
    expect(zone().hasAttribute('data-dragging')).toBe(true)
    expect(screen.getByTestId('media')).toBeTruthy()
    expect(screen.getByText('Let go to import')).toBeTruthy()
    expect(screen.queryByText('Import leads')).toBeNull()
    expect((screen.getByRole('button', { name: 'Browse files' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.dragLeave(zone(), dragFiles)
    expect(screen.getByText('Import leads')).toBeTruthy()
  })

  it('takes its words from labels', () => {
    renderWithSatin(<FileUpload />, { labels: { dropFilesHere: 'Upuść pliki tutaj', browseFiles: 'Przeglądaj' } })
    expect(screen.getByText('Upuść pliki tutaj')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Przeglądaj' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<FileUpload media={<span aria-hidden>CSV</span>} title="Import leads" description="CSV, up to 5 MB" />, { theme })
    await expectNoAxeViolations()
  })
})
