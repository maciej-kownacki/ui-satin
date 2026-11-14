'use client'

import * as React from 'react'

/**
 * The words Satin's components say on their own: accessible names of icon buttons (Close,
 * Increase), lists and regions screen readers announce, and a few visible defaults. English by
 * default; wrap the app (or any part of it) in `SatinLabels` to translate or reword them:
 *
 *   <SatinLabels labels={{ close: 'Zamknij', dismiss: 'Odrzuć' }}>…</SatinLabels>
 *
 * Anything left out keeps its English default. A component's own prop (Select's `placeholder`)
 * still wins over these.
 */
export const defaultLabels = {
  close: 'Close',
  dismiss: 'Dismiss',
  announcement: 'Announcement',
  increase: 'Increase',
  decrease: 'Decrease',
  previous: 'Previous',
  next: 'Next',
  previousSection: 'Previous section',
  nextSection: 'Next section',
  previousQuestion: 'Previous question',
  nextQuestion: 'Next question',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  year: 'Year',
  month: 'Month',
  sheets: 'Sheets',
  hiddenPages: 'Hidden pages',
  period: 'Period',
  commandMenu: 'Command menu',
  searchCommands: 'Search commands',
  commands: 'Commands',
  draft: 'Draft',
  files: 'Files',
  attachedFiles: 'Attached files',
  goodResponse: 'Good response',
  badResponse: 'Bad response',
  copy: 'Copy',
  attachments: 'Attachments',
  addToConversation: 'Add to conversation',
  message: 'Message',
  send: 'Send',
  stop: 'Stop',
  searchAgentsAndTools: 'Search agents and tools',
  addAgent: 'Add an agent',
  agentsAndTools: 'Agents and tools',
  model: 'Model',
  agent: 'Agent',
  remove: 'Remove',
  add: 'Add',
  selectAllRows: 'Select all rows',
  selectRow: 'Select row',
  select: 'Select…',
  search: 'Search…',
  noResults: 'No results',
  clear: 'Clear',
  apply: 'Apply',
  cancel: 'Cancel',
  pickDate: 'Pick a date',
  pickDates: 'Pick dates',
  from: 'From',
  to: 'To',
  value: 'Value',
  selected: 'selected',
  commandPlaceholder: 'Type a command or search…',
  navigate: 'Navigate',
  openItem: 'Open',
  source: 'Source',
}

export type SatinLabelSet = typeof defaultLabels

const LabelsContext = React.createContext<SatinLabelSet>(defaultLabels)

export interface SatinLabelsProps {
  /** The words to change; the rest stay as they are (from a parent SatinLabels, or English). */
  labels: Partial<SatinLabelSet>
  children: React.ReactNode
}

export function SatinLabels({ labels, children }: SatinLabelsProps) {
  const parent = React.useContext(LabelsContext)
  const value = React.useMemo(() => ({ ...parent, ...labels }), [parent, labels])
  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
}

/** The labels in effect here: English, or what a SatinLabels above has set. */
export function useSatinLabels(): SatinLabelSet {
  return React.useContext(LabelsContext)
}
