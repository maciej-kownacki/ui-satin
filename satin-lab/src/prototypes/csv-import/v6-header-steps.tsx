import * as React from 'react'
import { ArrowRight, Calendar, Check, Download, Filter, Hashtag, List, Mail, Text, WarningCircle } from 'iconoir-react'
import { Alert } from '@uisatin/ui/alert'
import { FileIcon } from '@uisatin/ui/attachment'
import { Button } from '@uisatin/ui/button'
import { DialogDescription, DialogTitle } from '@uisatin/ui/dialog'
import { FileUpload, formatBytes } from '@uisatin/ui/file-upload'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Link } from '@uisatin/ui/link'
import { Select } from '@uisatin/ui/select'
import { Spinner } from '@uisatin/ui/spinner'
import { useStepSlide } from '@uisatin/ui/step-slide'
import { Tooltip } from '@uisatin/ui/tooltip'
import { CsvImportPreview, CsvImportProgress, CsvImportResult } from '@uisatin/pro/csv-import'
import type { CsvImportField } from '@uisatin/pro/csv-import-parse'
import { useCsvFlow, type CsvFlow, type CsvVariantProps } from './flow'
import { Blockable, focusTargetClass, LiveRegion, ReadingView, Root, Stage, useFlowFocus } from './shared'

/*
 * CSV import with the steps as its header (the prototype picked from v1–v7, "v6 Header steps").
 * The person always sees where they are and what is left, and the body is free for one question
 * at a time, introduced by a picture of what happens: their file going into the app.
 *
 * Top, 37: the steps in a row, "(1) Upload file · (2) Map columns · (3) Review"; the current one
 * on the primary action's solid fill (as Stepper's current step), done ones with a check. The
 * circles sit 13 from the top and nothing under them: the step's own 16 is the gap. A dialog's
 * close button (36 at 7, 7) keeps the end of the row, on the circles' centre line. Under 480 wide
 * only the current step keeps its label (the others keep theirs for screen readers); under 360
 * the dots between them go too.
 * Middle: the step, which slides (useStepSlide) and scrolls as one. Upload is one block: the
 * drop zone fills the step, with the CSV file's tile, a dotted arrow into the app's tile, the
 * title and what to do inside it. From Map columns on, the step opens with a left-aligned title
 * and description in the dialog header's type; Map columns is then one flat card with two headed
 * columns, the file's column → the field, each field's Select led by an icon for its type.
 * Bottom, 68: Back, the reason the primary is blocked, the primary, 16 above and below them, so
 * content scrolling under the step never runs up to the buttons. No lines between the three.
 *
 * In a Dialog the step's title and description are the dialog's DialogTitle and
 * DialogDescription (its name and description): the app says so with CsvImportInDialog. On
 * Upload they are the drop zone's title and its first line.
 */

/**
 * True inside a Dialog with no header of its own: the step's title and description become the
 * dialog's DialogTitle and DialogDescription (its name and description).
 */
export const CsvImportInDialog = React.createContext(false)

/** The words the prototype adds to CsvImport's. Prototype-only: they don't join SatinLabelSet. */
export const v6Words = {
  /** The Upload title, with the noun's plural: "Import candidates". */
  csvV6UploadTitle: (noun: string) => `Import ${noun}`,
  csvV6ReviewTitle: 'Review rows',
  csvV6ReviewText: 'Rows with errors are skipped. The rest are imported.',
  /** Review's left tile, under the count; `noun` is picked for the count: "Candidates will be imported". */
  csvV6WillImport: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} will be imported`,
  /** Review's right tile, under the count; `noun` is the row noun picked for it: "Rows with errors". */
  csvV6RowsWithErrors: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} with errors`,
  /** Under the tiles when the file is longer than `maxRows`. */
  csvV6OverLimit: (count: string, noun: string) => `${count} more ${noun} are over the limit and won’t be imported.`,
  csvV6DoneTitle: 'Import complete',
  csvV6NothingTitle: 'Nothing was imported',
  csvV6StoppedTitle: 'Import stopped',
  /** The stopped title's counts; v0's csvImportStopped starts with "Import stopped", the title here. */
  csvV6StoppedText: (count: string, noun: string, notImported: string, skipped: string | null) =>
    `${count} ${noun} imported · ${notImported} not imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** The first step's label in the header; v0's "Upload" reads thin beside "Map columns". */
  csvV6StepUpload: 'Upload file',
  /** What to do, under "Import candidates" in the drop zone. */
  csvV6DropText: 'Drop your CSV file here, or browse for one',
  csvV6MapTitle: 'Map CSV columns',
  /** `noun` is the singular: "lead". */
  csvV6MapText: (noun: string) => `Pick the ${noun} field each column fills, or leave the column out.`,
  csvV6ImportingTitle: (noun: string) => `Importing ${noun}`,
  csvV6ImportingText: 'Only rows that passed their checks are sent.',
  /** The mapping card's two headings. */
  csvV6FileColumns: 'Columns in your file',
  csvV6AppFields: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} fields`,
}

type Step = 'upload' | 'map' | 'review'
const STEPS: Step[] = ['upload', 'map', 'review']
/** Don't import, as a Select value (v0 uses the same). */
const SKIP = '\u0000skip'

type V6Words = CsvFlow['words'] & typeof v6Words

export interface CsvImportHeaderStepsProps extends CsvVariantProps {
  /**
   * Called in place of the file picker, from Browse files and from a click on the drop zone
   * (the docs demo plays a sample drop with it). Left out, both open the picker as FileUpload does.
   */
  onBrowse?: () => void
  /** Shows the drop zone as files dragged over it would (FileUpload's `data-force="drag"`). */
  dragging?: boolean
}

export function CsvImportHeaderSteps({ onBrowse, dragging, ...props }: CsvImportHeaderStepsProps) {
  const flow = useCsvFlow(props)
  const words: V6Words = React.useMemo(() => ({ ...v6Words, ...flow.words }), [flow.words])
  const { n, noun } = flow
  const inDialog = React.useContext(CsvImportInDialog)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const partRef = React.useRef<HTMLDivElement | null>(null)
  const reasonId = React.useId()

  // The step the person is on. A file read moves it to Map columns; no file, to Upload.
  const [step, setStep] = React.useState<Step>(() => (flow.stage === 'work' ? 'map' : 'upload'))
  // Import another file goes back to the flow's upload stage even when the app keeps `file`.
  const [seen, setSeen] = React.useState({ parse: flow.parse, stage: flow.stage })
  if (seen.parse !== flow.parse || seen.stage !== flow.stage) {
    setSeen({ parse: flow.parse, stage: flow.stage })
    // A new read that finished moves on, even when its reading never reached the screen (a
    // small file can be read before React shows 'reading').
    if (flow.parse.status === 'ready' && (seen.parse.status !== 'ready' || seen.parse.file !== flow.parse.file)) setStep('map')
    else if (flow.parse.status === 'idle' || (flow.stage === 'upload' && seen.stage !== 'upload')) setStep('upload')
  }
  const ready = flow.parse.status === 'ready'
  // What is on screen: a file handed in at mount shows its reading (or its error) as Upload does.
  const view: Step = ready ? step : 'upload'

  // Only the step slides; the header steps and the footer stay put.
  useStepSlide(step, STEPS.indexOf(step), rootRef, () => [partRef.current])
  // A step opens at its top, not where the last one was scrolled to.
  React.useLayoutEffect(() => {
    if (partRef.current) partRef.current.scrollTop = 0
  }, [view])

  useFlowFocus(flow, rootRef, (want, root) => {
    const part = root.querySelector<HTMLElement>('[data-slot="csv-import-step"]')
    const q = (s: string) => part?.querySelector<HTMLElement>(s) ?? null
    if (want === 'reading') return q('[data-csv-focus="reading"]')
    if (want === 'error') return q('[data-csv-focus="error"]')
    // The step's title says the outcome (CsvImportResult's own heading is hidden), so focus goes there.
    if (want === 'result') return root.querySelector<HTMLElement>('[data-csv-focus="title"]')
    if (want === 'status') return q('[data-csv-focus="summary"]')
    if (view === 'upload') return q('button:not([disabled]), a[href], [tabindex="0"]')
    if (view === 'map') {
      // The column to fix first: a duplicate, else the first on Don't import while a required
      // field has no column, else the first.
      const block = flow.block
      if (block?.kind === 'duplicate') return q(`[data-csv-col="${block.columns[0]}"] [data-slot="select-trigger"]`)
      if (block?.kind === 'missing') return q('[data-csv-skip] [data-slot="select-trigger"]') ?? q('[data-slot="select-trigger"]')
      return q('[data-slot="select-trigger"]')
    }
    if (!flow.validation) return null
    // Review: the tile that says how many rows will be imported.
    return q('[data-csv-focus="tiles"]')
  })

  const go = (next: Step) => {
    flow.focusNext.current = 'work'
    setStep(next)
  }

  /* what blocks the primary, and why */
  const block = flow.block
  const mapBlock = block && block.kind !== 'noneReady' ? block : null
  let reason: string | null = null
  let blocked = false
  if (view === 'upload') {
    blocked = !ready
    reason = blocked && flow.parse.status !== 'reading' ? words.csvChooseFile : null
  } else if (view === 'map') {
    blocked = !!mapBlock
    if (mapBlock?.kind === 'duplicate') reason = words.csvMappedTwice(mapBlock.field.label)
    else if (mapBlock?.kind === 'missing') reason = words.csvMapRequired(mapBlock.fields[0].label)
    else if (mapBlock?.kind === 'nothing') reason = words.csvMapSomething
  } else if (!flow.finished) {
    blocked = !!block || !flow.fresh
    reason = flow.importing ? null : block?.kind === 'noneReady' ? words.csvNothingToImport : null
  }

  let primary: React.ReactNode
  const imp = flow.imp
  if (view === 'review' && imp.status === 'result' && imp.result === 'stopped') {
    // A stopped run, or one that saved nothing: Retry sends the rows not yet imported.
    primary = <Button onClick={flow.startImport}>{imp.imported > 0 ? words.csvRetryFrom(n(imp.imported + 1)) : words.csvRetry}</Button>
  } else if (view === 'review') {
    primary = flow.finished ? (
      props.onDone && <Button onClick={props.onDone}>{words.csvDone}</Button>
    ) : (
      <Blockable reason={reason} reasonId={reasonId} blocked={blocked} loading={flow.importing} onClick={flow.startImport}>
        {words.csvImportRows(n(flow.readyCount), noun(flow.readyCount, flow.thing))}
      </Blockable>
    )
  } else {
    primary = (
      <Blockable reason={reason} reasonId={reasonId} blocked={blocked} onClick={() => !blocked && go(view === 'upload' ? 'map' : 'review')}>
        {words.csvNext}
      </Blockable>
    )
  }

  // While a cancelable import runs Cancel stands where Back was; on the result, Import another file.
  let back: React.ReactNode
  if (flow.importing && flow.cancelable)
    back = (
      <Button variant="secondary" onClick={flow.cancelImport}>
        {words.csvCancel}
      </Button>
    )
  else if (flow.finished)
    back = (
      <Button variant="secondary" onClick={flow.importAnother}>
        {words.csvImportAnother}
      </Button>
    )
  else
    back = (
      <Button variant="secondary" disabled={view === 'upload' || flow.importing} onClick={() => go(view === 'review' ? 'map' : 'upload')}>
        {words.csvBack}
      </Button>
    )

  return (
    // A size container, so the header steps and the footer can fold at a narrow width.
    <Root ref={rootRef} variant={6} stage={flow.finished ? 'result' : view} className={cn('@container h-[600px]', props.className)}>
      <HeaderSteps
        view={view}
        complete={flow.imp.status === 'result' && flow.imp.result === 'done'}
        words={words}
        n={n}
        // A step is a way back, or forward as far as Next would go: never while importing or after
        // a finished import, Map once the file is read, Review once the mapping holds.
        reachable={(s) =>
          !flow.importing && !flow.finished && (s === 'upload' || (ready && (s === 'map' || !mapBlock)))
        }
        onGo={go}
      />
      {/* Title, description and body scroll as one; only Review's and the result's tables keep their own scroll. */}
      <Stage partRef={partRef} className="overflow-y-auto px-4 pb-4">
        {view === 'upload' && flow.parse.status !== 'reading' ? (
          <UploadBody flow={flow} words={words} inDialog={inDialog} onBrowse={onBrowse} dragging={dragging} />
        ) : (
          <>
            <StepHeading flow={flow} view={view} words={words} inDialog={inDialog} />
            <StepBody flow={flow} view={view} words={words} />
          </>
        )}
      </Stage>
      <div data-slot="csv-import-footer" className="flex h-[68px] shrink-0 items-start gap-3 px-4 pt-4 @max-[440px]:gap-2">
        {back}
        {/* The reason stays in the Tooltip and aria-describedby where there is no room to show it. */}
        <div className="flex min-h-9 min-w-0 flex-1 items-center">
          <p id={reasonId} className="line-clamp-2 text-sm text-text-muted @max-[400px]:sr-only">
            {reason}
          </p>
        </div>
        {primary}
      </div>
      <LiveRegion flow={flow} />
    </Root>
  )
}

/* ---------- the header steps ---------- */

/*
 * The steps as the header row: a numbered circle and a label each, a dot between. Upcoming steps
 * are muted on bg/muted; the current one is solid action/primary with its number in
 * action/primary fg, as Stepper draws its current step, and its label in text/default medium; a
 * done one shows a check. The row starts at the panel's start inset and leaves the end free for
 * the dialog's close button (36 at 7 from the corner: circles 13 from the top put both on one centre line, 25).
 * Prototype-local: Free's Stepper draws its labels under the circles, or folds to a count.
 */
function HeaderSteps({
  view,
  complete,
  words,
  n,
  reachable,
  onGo,
}: {
  view: Step
  complete: boolean
  words: V6Words
  n: (count: number) => string
  reachable: (step: Step) => boolean
  onGo: (step: Step) => void
}) {
  const labels = useSatinLabels()
  const current = complete ? -1 : STEPS.indexOf(view)
  const stepLabel = { upload: words.csvV6StepUpload, map: words.csvStepMap, review: words.csvStepReview }
  return (
    <div data-slot="csv-import-header" className="flex h-[37px] shrink-0 items-end ps-4 pe-14">
      <ol aria-label={words.csvSteps} className="m-0 flex min-w-0 list-none items-center gap-3 p-0 @max-[479px]:gap-2">
        {STEPS.map((s, i) => {
          const state = complete || i < current ? 'complete' : i === current ? 'current' : 'upcoming'
          return (
            <li key={s} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 items-center gap-3 @max-[479px]:gap-2">
              {i > 0 && <span aria-hidden className="size-1 shrink-0 rounded-full bg-border-strong @max-[359px]:hidden" />}
              {(() => {
                const content = (
                  <>
                <span
                  aria-hidden
                  data-state={state}
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs leading-none font-medium tabular-nums',
                    state === 'current' ? 'bg-action-primary-bg text-action-primary-fg' : 'bg-bg-muted text-text-muted',
                    state === 'complete' && 'text-text-default',
                  )}
                >
                  {state === 'complete' ? <Check className="size-3.5 [stroke-width:2]" /> : n(i + 1)}
                </span>
                <span
                  className={cn(
                    'truncate text-sm whitespace-nowrap',
                    state === 'current' ? 'font-medium text-text-default' : 'text-text-muted group-hover/step:text-text-default @max-[479px]:sr-only',
                  )}
                >
                  {stepLabel[s]}
                  {state === 'complete' && <span className="sr-only">, {labels.stepCompleted}</span>}
                </span>
                  </>
                )
                // The current step stays text; another one you can reach is a button that goes there.
                return state !== 'current' && reachable(s) ? (
                  <button
                    type="button"
                    onClick={() => onGo(s)}
                    className="group/step -m-1 flex min-w-0 items-center gap-3 rounded-full p-1 outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--action-focus-ring) @max-[479px]:gap-2"
                  >
                    {content}
                  </button>
                ) : (
                  <span className="flex min-w-0 items-center gap-3 @max-[479px]:gap-2">{content}</span>
                )
              })()}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- upload ---------- */

/** The app's mark: Satin's logo as the docs' top bar draws it (the PNG carries its own shadow). */
function AppMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative size-6 shrink-0', className)}>
      <img src="/figma/satin-logo.png" alt="" className="absolute inset-[-4.29%_-7.86%_-11.43%_-7.86%] block size-[calc(100%+15.72%)] max-w-none" />
    </span>
  )
}

/**
 * A tile as FileUpload draws its upload mark: 40, radius-xl, bg/muted, no edge or shadow; it
 * turns bg/card while files are dragged over the zone, as the mark does.
 */
function Tile({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg-muted transition-[background-color] duration-(--duration-fast) ease-(--ease-out) in-data-[dragging]:bg-bg-card">
      {children}
    </span>
  )
}

/*
 * The arrow from the file to the app, drawn in dots: a shaft along the middle row and a chevron
 * head pointing at the app's tile, on a 7 × 5 grid. Every dot rests dim (text/muted at 25%) and
 * a pulse runs through the columns from the file to the app, lighting each to text/default at full
 * strength, the head's side branches with their column (lab.css, csv-arrow-pulse). Under reduced
 * motion it holds still at a quiet fade toward the app.
 */
const ARROW = ['....x..', '.....x.', 'xxxxxxx', '.....x.', '....x..']
/** Each column's still opacity under reduced motion, file side to app side. Whole class strings. */
const ARROW_FADE = ['motion-reduce:opacity-40', 'motion-reduce:opacity-50', 'motion-reduce:opacity-60', 'motion-reduce:opacity-70', 'motion-reduce:opacity-80', 'motion-reduce:opacity-90', 'motion-reduce:opacity-100']
function Dots() {
  return (
    <span aria-hidden className="grid grid-cols-[repeat(7,2px)] gap-[1.5px]">
      {ARROW.flatMap((row, r) =>
        [...row].map((cell, c) => (
          <span
            key={`${r}-${c}`}
            className={cn('size-[2px] rounded-full', cell === 'x' && cn('csv-arrow-dot bg-text-muted opacity-25', ARROW_FADE[c]))}
            style={cell === 'x' ? { animationDelay: `${c * 120}ms` } : undefined}
          />
        )),
      )}
    </span>
  )
}

/**
 * Upload as one block: the drop zone fills the step, and its media is the file going into the
 * app; its title and first line say what to do, its second what it takes. Errors go above the
 * zone, the template link under it.
 */
function UploadBody({
  flow,
  words,
  inDialog,
  onBrowse,
  dragging,
}: {
  flow: CsvFlow
  words: V6Words
  inDialog: boolean
  onBrowse?: () => void
  dragging?: boolean
}) {
  const { n, parse, thing } = flow
  const labels = useSatinLabels()
  const title = words.csvV6UploadTitle(thing.other)
  const limits = words.csvUploadHint(flow.maxRows != null ? n(flow.maxRows) : null, flow.maxSize != null ? formatBytes(flow.maxSize) : null)
  const text = (
    <>
      <span className="block">{words.csvV6DropText}</span>
      {limits && <span className="block">{limits}</span>}
    </>
  )
  // In a Dialog the zone's title and lines are its name and description. Title and Description
  // sit in FileUpload's paragraphs as spans, in the paragraphs' own type.
  const asTitle = (t: React.ReactNode) =>
    inDialog ? (
      <DialogTitle asChild className="pe-0 leading-[inherit]">
        <span>{t}</span>
      </DialogTitle>
    ) : (
      t
    )
  return (
    <div className="flex flex-1 flex-col gap-3 pt-4">
      {parse.status === 'error' && (
        <Alert
          intent="error"
          tabIndex={-1}
          data-csv-focus="error"
          className={focusTargetClass}
          title={words.csvParseFailed(parse.file.name)}
          description={flow.parseReason(parse.error)}
          action={
            <Button variant="secondary" size="xs" onClick={flow.retryRead}>
              {words.csvRetry}
            </Button>
          }
        />
      )}
      {flow.rejection && <Alert intent="error" title={words.csvRejected(flow.rejection.name)} description={flow.rejection.reason} />}
      <FileUpload
        accept=".csv,text/csv,text/plain"
        multiple={false}
        maxSize={flow.maxSize}
        media={
          <span aria-hidden className="flex items-center gap-3">
            <Tile>
              <FileIcon type="xlsx" className="size-6" />
            </Tile>
            <Dots />
            <Tile>
              <AppMark />
            </Tile>
          </span>
        }
        title={asTitle(title)}
        // The dialog keeps a name while files are dragged over.
        dropTitle={asTitle(labels.dropToUpload)}
        description={
          inDialog ? (
            <DialogDescription asChild className="block text-sm">
              <span>{text}</span>
            </DialogDescription>
          ) : (
            text
          )
        }
        files={parse.status === 'ready' ? [{ id: 'csv', name: parse.file.name, size: parse.file.size, status: 'done' }] : []}
        onFilesAdded={flow.addFiles}
        onFilesRejected={flow.rejectFiles}
        onRemove={flow.removeFile}
        onBrowse={onBrowse}
        data-force={dragging ? 'drag' : undefined}
        // With onBrowse, a click anywhere on the zone browses too (Browse files calls it itself).
        // The zone isn't a control of its own: keyboard users have Browse files.
        onClick={
          onBrowse &&
          ((e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement
            if (!dragging && target.closest('[data-slot="file-upload-zone"]') && !target.closest('button')) onBrowse()
          })
        }
        // The zone takes the step's height, its content centred in it.
        className={cn(
          'flex-1 [&>[data-slot=file-upload-zone]]:flex-1 [&>[data-slot=file-upload-zone]]:justify-center',
          onBrowse && '[&>[data-slot=file-upload-zone]:not([data-dragging])]:cursor-pointer',
        )}
      />
      {flow.templateHref && (
        <Link href={flow.templateHref} download variant="muted" className="inline-flex items-center gap-1 self-start text-sm">
          <Download aria-hidden className="size-3.5 [stroke-width:1.875]" />
          {words.csvTemplate}
        </Link>
      )}
    </div>
  )
}

/* ---------- the step's title ---------- */

/**
 * From Map columns on (and while the file is read): a left-aligned title and description in the
 * dialog header's type (DialogTitle, DialogDescription), scrolling with the step. On the result
 * the title says the outcome (CsvImportResult's own heading is hidden) and takes focus.
 */
function StepHeading({ flow, view, words, inDialog }: { flow: CsvFlow; view: Step; words: V6Words; inDialog: boolean }) {
  const { n, noun, thing } = flow
  const imp = flow.imp
  let title: string
  let text: React.ReactNode = null
  const outcome = imp.status === 'result'
  if (imp.status === 'result') {
    const valid = flow.validation?.valid ?? 0
    const skipped = flow.validation ? flow.validation.rows.length - valid : 0
    const skippedText = skipped > 0 ? n(skipped) : null
    if (imp.result === 'done') {
      title = words.csvV6DoneTitle
      text = words.csvImported(n(imp.imported), noun(imp.imported, thing), skippedText)
    } else if (imp.imported === 0) {
      title = words.csvV6NothingTitle
      text = imp.reason ?? words.csvImportCancelled
    } else {
      title = words.csvV6StoppedTitle
      const counts = words.csvV6StoppedText(n(imp.imported), noun(imp.imported, thing), n(valid - imp.imported), skippedText)
      text = imp.reason ? (
        <>
          {counts}
          <br />
          {imp.reason}
        </>
      ) : (
        counts
      )
    }
  } else if (view === 'upload') {
    // Only while the file is read; Upload itself titles its drop zone.
    title = words.csvV6UploadTitle(thing.other)
  } else if (view === 'map') {
    title = words.csvV6MapTitle
    text = words.csvV6MapText(thing.one ?? thing.other)
  } else if (imp.status === 'importing') {
    title = words.csvV6ImportingTitle(thing.other)
    text = words.csvV6ImportingText
  } else {
    title = words.csvV6ReviewTitle
    text = words.csvV6ReviewText
  }

  // DialogTitle's type; no end padding, the close button sits in the steps row above.
  const titleClass = 'pe-0 text-base leading-[14px] font-medium tracking-normal text-text-default'
  // On the result the title is where focus goes; v0's ring, shown only after keyboard use.
  const titleProps = outcome ? { tabIndex: -1, 'data-csv-focus': 'title', className: cn(titleClass, focusTargetClass) } : { className: titleClass }
  return (
    <div data-slot="csv-import-heading" className="flex shrink-0 flex-col gap-1 pt-4 pb-5">
      {inDialog ? (
        <>
          <DialogTitle {...titleProps}>{title}</DialogTitle>
          {text && <DialogDescription>{text}</DialogDescription>}
        </>
      ) : (
        <>
          <h2 {...titleProps}>{title}</h2>
          {text && <p className="text-body text-text-muted">{text}</p>}
        </>
      )}
    </div>
  )
}

/* ---------- map columns ---------- */

/** A field's icon by its type, for its option and the Select showing it. */
function fieldIcon(field: CsvImportField) {
  switch (field.type) {
    case 'email':
      return <Mail />
    case 'number':
      return <Hashtag />
    case 'date':
      return <Calendar />
    case 'enum':
      return <List />
    default:
      return <Text />
  }
}

/**
 * Both columns of the card: the file's column, the arrow, the field. Under 480 wide the arrow
 * goes (the headings still say which side is which); under 360 the field's Select goes under the
 * column's name, so it keeps room for its value.
 */
const mapGrid =
  'grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-3 @max-[479px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @max-[479px]:gap-2 @max-[359px]:grid-cols-[minmax(0,1fr)]'
/** The arrow column, as the grid drops it. */
const mapArrow = '@max-[479px]:hidden'

/*
 * The mapping card, one flat surface: a header row naming both sides, each with its icon, then
 * one row a column, rows divided by a line, the step's own fill throughout. It doesn't scroll on
 * its own; the step scrolls with it.
 * A row is the column's name (a check when auto-matched) over its first values, an arrow, and
 * the field's Select. A required field with no column says so under the header; a field picked
 * twice marks both Selects and says so in the row. Don't import reads muted, as a placeholder.
 */
function MapCard({ flow, words }: { flow: CsvFlow; words: V6Words }) {
  const { fields, headers, dataRows, mapping, auto, issues, thing } = flow
  const id = React.useId()
  const options = [{ value: SKIP, label: words.csvDontImport }, ...fields.map((f) => ({ value: f.key, label: f.label, icon: fieldIcon(f) }))]
  return (
    <div data-slot="csv-import-map" className="flex shrink-0 flex-col rounded-xl border border-border-default [--border-width-default:var(--border-width-strong)]">
      <div className={cn(mapGrid, 'h-10 shrink-0 border-b border-border-default px-3 text-sm font-medium text-text-muted')}>
        <span className="flex min-w-0 items-center gap-2">
          <FileIcon type="xlsx" />
          <span className="truncate">{words.csvV6FileColumns}</span>
        </span>
        <span className={mapArrow} />
        <span className="flex min-w-0 items-center gap-2 @max-[359px]:hidden">
          <AppMark className="size-4" />
          <span className="truncate">{words.csvV6AppFields(thing.one ?? thing.other)}</span>
        </span>
      </div>
      {issues.missing.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border-default px-3 py-2">
          {issues.missing.map((f) => (
            <p key={f.key} className="flex items-center gap-1.5 text-sm text-text-destructive">
              <WarningCircle aria-hidden className="size-3.5 shrink-0 [stroke-width:1.875]" />
              {words.csvRequiredMissing(f.label)}
            </p>
          ))}
        </div>
      )}
      <ul aria-label={words.csvColumns} className="m-0 list-none p-0">
        {headers.map((name, index) => {
          const samples: string[] = []
          for (const r of dataRows) {
            const v = (r[index] ?? '').trim()
            if (v) samples.push(v)
            if (samples.length === 3) break
          }
          const value = mapping[index] ?? null
          const skip = value == null || !fields.some((f) => f.key === value)
          const matched = !skip && value === auto[index]
          // Both Selects of a field picked twice are marked; `duplicates` holds only the later ones.
          const dupField = !skip && [...issues.duplicates.values()].includes(value!) ? fields.find((f) => f.key === value) : undefined
          const lineId = `${id}-${index}`
          return (
            <li
              key={index}
              data-csv-col={index}
              data-csv-skip={skip ? '' : undefined}
              className={cn(mapGrid, 'min-h-[52px] border-b border-border-default px-3 py-2 last:border-b-0')}
            >
              <div className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-1.5 text-sm leading-5 text-text-default">
                  <span className="truncate">{name}</span>
                  {matched && (
                    <Tooltip label={words.csvAutoMatched}>
                      <span className="inline-flex shrink-0 text-status-green-fg">
                        <Check aria-hidden className="size-3.5 [stroke-width:2]" />
                        <span className="sr-only">, {words.csvAutoMatched}</span>
                      </span>
                    </Tooltip>
                  )}
                </span>
                <span id={lineId} className={cn('truncate text-xs leading-4', dupField ? 'text-text-destructive' : 'text-text-muted')}>
                  {dupField ? words.csvAlreadyMapped(dupField.label) : samples.join(', ')}
                </span>
              </div>
              <ArrowRight aria-hidden className={cn('size-4 [stroke-width:1.875]', skip ? 'text-text-subtle' : 'text-text-muted', mapArrow)} />
              <Select
                size="sm"
                aria-label={words.csvMapsToColumn(name)}
                aria-describedby={dupField ? lineId : undefined}
                options={options}
                value={value ?? SKIP}
                onValueChange={(v) => flow.setMapping({ ...mapping, [index]: v === SKIP ? null : v })}
                error={!!dupField}
                // Don't import reads as a placeholder would.
                className={cn(skip && '[&>span.truncate]:text-text-muted')}
                // 1px of room on every side, so the row's clip leaves the focus edge whole.
                wrapperClassName="min-w-0 p-px"
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ---------- the step on screen ---------- */

/** v0's bodies around the mapping card; importing and the result are states of Review. */
function StepBody({ flow, view, words }: { flow: CsvFlow; view: Step; words: V6Words }) {
  const { n, noun, validation, imp } = flow
  // Upload's body here is only the file being read; it takes what the heading leaves.
  if (view === 'upload')
    return (
      <div className="min-h-0 flex-1">
        <ReadingView flow={flow} />
      </div>
    )
  if (view === 'map') return <MapCard flow={flow} words={words} />
  if (flow.resultProps)
    return (
      <CsvImportResult
        {...flow.resultProps}
        // Retry is the footer's primary, so the empty table says only what happened.
        onRetry={undefined}
        // The step's title says the outcome: hide the result's heading (and its box when the
        // over-limit note isn't there) and the stopped Alert, so the table gets the room.
        className="[&_[data-csv-focus=result]]:hidden [&>div:first-child:not(:has(>:nth-child(2)))]:hidden [&>[data-slot=alert]]:hidden"
      />
    )
  if (flow.checkFailed) {
    const error = flow.checkFailed.error
    return (
      <Alert
        intent="error"
        tabIndex={-1}
        data-csv-focus="error"
        className={focusTargetClass}
        title={words.csvCheckFailed}
        description={error instanceof Error && error.message ? error.message : words.csvImportFailedReason}
        action={
          <Button
            variant="secondary"
            size="xs"
            onClick={() => {
              flow.focusNext.current = 'work'
              flow.recheck()
            }}
          >
            {words.csvRetry}
          </Button>
        }
      />
    )
  }
  if (!validation)
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="flex items-center gap-2 text-base leading-5 font-medium text-text-default">
          <Spinner label={null} />
          {words.csvChecking}
        </p>
      </div>
    )
  if (imp.status === 'importing') {
    const errors = validation.rows.length - validation.valid
    return (
      <div className="flex flex-1 flex-col gap-3">
        <p data-csv-focus="summary" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
          {[words.csvCount(n(validation.rows.length), noun(validation.rows.length)), words.csvReady(n(validation.valid)), errors > 0 && words.csvWithErrors(n(errors))]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-1 flex-col justify-center pb-8">
          <CsvImportProgress done={imp.done} total={imp.total} />
        </div>
      </div>
    )
  }
  return <ReviewBody flow={flow} words={words} validation={validation} />
}

/*
 * Review: the counts as two separate muted tiles (rows that will be imported, rows with
 * errors), then CsvImportPreview's table. The errors tile is a toggle button for the preview's
 * errors-only filter; it replaces the preview's summary line, its errors Alert and its "Show only
 * errors" checkbox, which are hidden here by their data attributes. With no errors it is plain
 * muted text. Its own component, so the filter starts off on every visit to Review.
 */
function ReviewBody({ flow, words, validation }: { flow: CsvFlow; words: V6Words; validation: NonNullable<CsvFlow['validation']> }) {
  const { n, noun, thing } = flow
  const [errorsOnly, setErrorsOnly] = React.useState(false)
  const errors = validation.rows.length - validation.valid
  const half = 'flex min-w-0 flex-col gap-0.5 rounded-xl bg-bg-muted px-4 py-3 text-start'
  const count = 'text-2xl leading-8 font-semibold tabular-nums'
  return (
    <>
      <div data-slot="csv-import-tiles" className="mb-4 grid shrink-0 grid-cols-2 gap-3 @max-[399px]:grid-cols-1">
        {/* Focus lands here on entering Review: the count and its label are read as one. */}
        <div tabIndex={-1} data-csv-focus="tiles" className={cn(focusTargetClass, half)}>
          <span className={cn(count, 'text-text-default')}>{n(validation.valid)}</span>
          {/* A space, so the count and its label are read as two words (here and below). */}
          {' '}
          <span className="truncate text-sm text-text-default">{words.csvV6WillImport(noun(validation.valid, thing))}</span>
        </div>
        {errors > 0 ? (
          <button
            type="button"
            aria-pressed={errorsOnly}
            onClick={() => setErrorsOnly(!errorsOnly)}
            className={cn(
              half,
              'relative cursor-pointer outline-offset-2 transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-2 focus-visible:outline-(--action-focus-ring)',
              // Pressed: the status red fill with a 1px inset edge of its foreground, as a selected card's edge.
              errorsOnly ? 'bg-status-red-bg shadow-[inset_0_0_0_var(--border-width-strong)_var(--status-red-fg)]' : 'satin-hover:bg-bg-selected',
            )}
          >
            <span className={cn(count, 'text-status-red-fg')}>{n(errors)}</span>
            {' '}
            <span className="truncate text-sm text-text-default">{words.csvV6RowsWithErrors(noun(errors))}</span>
            {/* Says the tile filters, on the count's centre line; red while the filter is on. */}
            <Filter aria-hidden className={cn('absolute end-4 top-5 size-4 [stroke-width:1.875]', errorsOnly ? 'text-status-red-fg' : 'text-text-muted')} />
          </button>
        ) : (
          <div className={half}>
            <span className={cn(count, 'text-text-muted')}>{n(0)}</span>
            {' '}
            <span className="truncate text-sm text-text-muted">{words.csvV6RowsWithErrors(noun(0))}</span>
          </div>
        )}
      </div>
      {flow.overLimit > 0 && <p className="-mt-2 mb-4 text-sm text-text-muted">{words.csvV6OverLimit(n(flow.overLimit), noun(flow.overLimit, thing))}</p>}
      <CsvImportPreview
        fields={flow.fields}
        mapping={flow.mapping}
        validation={validation}
        errorsOnly={errorsOnly}
        onErrorsOnlyChange={setErrorsOnly}
        // The tiles say the counts and filter the rows: hide the summary line, the errors Alert
        // and the checkbox.
        className="[&>[data-csv-focus=errors]]:hidden [&>[data-csv-focus=summary]]:hidden [&>[data-slot=checkbox-field]]:hidden"
      />
    </>
  )
}
