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
 *
 * Labels that carry data (a file name, a row number, a count) are functions, so a translation can
 * put the words in its own order:
 *
 *   <SatinLabels labels={{ removeItem: (name) => `Usuń ${name}`, selectRow: (n) => `Zaznacz wiersz ${n}` }}>
 *
 * `pageOf` gets the page as a node, because Pagination animates the number; write it with JSX
 * (`(page, count) => <>Strona {page} z {count}</>`), not a template string. `dateLocale` is a
 * locale, not a word: Calendar and the date pickers name months and days and write dates in it.
 *
 * Satin Pro's components say words of their own; they join this set (`SatinLabelSet` is an
 * interface, so a package adds keys to it with declaration merging), and the same `SatinLabels`
 * translates them.
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
  select: 'Select…',
  search: 'Search…',
  /** SearchBar's accessible name, when the app doesn't give one. */
  searchField: 'Search',
  /** The Sources pill: "3 sources". */
  sourcesCount: (count: number) => (count === 1 ? '1 source' : `${count} sources`),
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
  moreOptions: 'More options',
  loading: 'Loading',
  submit: 'Submit',
  done: 'Done',
  opensInNewTab: '(opens in a new tab)',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  breadcrumb: 'Breadcrumb',
  pagination: 'Pagination',
  notifications: 'Notifications',
  dismissAnnouncement: 'Dismiss announcement',
  optional: '(Optional)',
  charactersUsed: 'Characters used',
  copied: 'Copied',
  added: 'added',
  removed: 'removed',
  total: 'Total',
  thinking: 'Thinking…',
  thought: 'Thought',
  thoughtForAMoment: 'Thought for a moment',
  newAgent: 'New agent',
  chooseAgent: 'Choose an agent',
  writeMessage: 'Write a message',
  uploadFile: 'Upload a file',
  uploadFileDescription: 'Select a file from your computer',
  webSearch: 'Web search',
  webSearchDescription: 'Research and find on the internet',
  noMatches: 'No matches',
  selectItem: 'Select',
  dictate: 'Dictate',
  stopDictation: 'Stop dictation',
  sending: 'Sending',
  delivered: 'Delivered',
  share: 'Share',
  skip: 'Skip',
  continue: 'Continue',
  useReply: 'Use reply',
  rewrite: 'Rewrite',
  change: 'Change',
  sortableItem: 'sortable item',
  sortableHint: 'Alt and arrow keys to move',
  dropFilesHere: 'Drop files here',
  dropToUpload: 'Drop to upload',
  browseFiles: 'Browse files',
  typeNotSupported: 'Type not supported',
  uploadFailed: 'Upload failed',
  waiting: 'Waiting…',
  cookieConsent: 'Cookie consent',
  cookieNotice: "We use essential cookies to run this site. With your OK, we'd also use optional ones to remember settings and learn what helps.",
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  customize: 'Customize',
  dateLocale: 'en-US',
  /** The date pickers' preset list, and the words of `datePresets`. */
  presets: 'Presets',
  presetToday: 'Today',
  presetTomorrow: 'Tomorrow',
  presetNextWeek: 'Next week',
  presetLast7Days: 'Last 7 days',
  presetLast30Days: 'Last 30 days',
  presetThisQuarter: 'This quarter',
  removeItem: (name: string) => `Remove ${name}`,
  cancelItem: (name: string) => `Cancel ${name}`,
  changeItem: (name: string) => `Change ${name}`,
  previewOf: (name: string) => `Preview of ${name}`,
  uploading: (name: string) => `Uploading ${name}`,
  largerThan: (size: string) => `Larger than ${size}`,
  /** "1.0 of 2.4 MB": the part sent and the total, both already formatted. */
  sentOfTotal: (sent: string, total: string) => `${sent} of ${total}`,
  showMore: (count: number) => `Show ${count} more`,
  didntGetCode: 'Didn’t get it?',
  resendCode: 'Resend code',
  /** Before an InputOTP suggestion's code, for screen readers: "Use code 428 193 From Messages". */
  useCode: 'Use code',
  fromMessages: 'From Messages',
  /** "Resend in 0:27": the time is already formatted. */
  resendIn: (time: string) => `Resend in ${time}`,
  /** Read out when InputOTP's suggestion appears. */
  codeReceived: (code: string) => `Code ${code} received`,
  noResultsFor: (query: string) => `No results for “${query}”`,
  selectRow: (row: number) => `Select row ${row}`,
  selectNamedRow: (name: string) => `Select ${name}`,
  /** The scroll region around a sideways-scrolling Table, named after the table when it has a label. */
  tableRegion: (name?: string) => (name ? `${name}, scrolls sideways` : 'Table, scrolls sideways'),
  /** The scroll region around a CodeBlock, named after its file when it has one. */
  codeRegion: (filename?: string) => (filename ? `${filename} code` : 'Code'),
  chartPoints: (title: string, count: number) => `${title}, ${count} ${count === 1 ? 'point' : 'points'}`,
  /** Read out after a ranking row moves. */
  positionOf: (item: string, position: number, count: number) => `${item}, position ${position} of ${count}`,
  page: (page: number) => `Page ${page}`,
  /** "Page 5 of 12". `page` can be an element (Pagination's animated number). */
  pageOf: (page: React.ReactNode, count: number): React.ReactNode => (
    <>
      Page {page} of {count}
    </>
  ),
}

type DefaultLabelSet = typeof defaultLabels

/**
 * Every word SatinLabels takes. An interface, so a package built on Satin adds its own words:
 *
 *   declare module '@uisatin/ui/labels' { interface SatinLabelSet { undo: string } }
 *
 * Such a package merges its defaults in where it reads them (`{ ...ownDefaults, ...useSatinLabels() }`):
 * the context only holds Satin Free's defaults and what the app passes.
 */
export interface SatinLabelSet extends DefaultLabelSet {}

// Satin Free's own words; words other packages add come from those packages' defaults.
const LabelsContext = React.createContext<SatinLabelSet>(defaultLabels as SatinLabelSet)

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
