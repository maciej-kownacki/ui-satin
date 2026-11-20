'use client'

import * as React from 'react'
import { AgentLoading, TetrisStill } from '@uisatin/ui/agent-loading'
import { Breadcrumb, type BreadcrumbItem } from '@uisatin/ui/breadcrumb'
import { CommandMenu, type CommandGroup, type CommandItem, type CommandMenuProps } from '@uisatin/ui/command-menu'
import { KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { useStepSlide } from '@uisatin/ui/step-slide'
import { StreamingText } from '@uisatin/ui/streaming-text'
import { toast } from '@uisatin/ui/toast'

/**
 * CommandPages: the Command menu with sub-pages, and the agent for what no command matches.
 *
 * - An item with a `page` opens it in place of the list ("Move deal to…" › the stages); an item's
 *   `onSelect` gets `push` to open one built on the spot. A Breadcrumb above the search shows the
 *   way back, its earlier pages as buttons; it is there on the first page too (its title alone), so
 *   the search and its icon stay put from page to page. The search empties on every new page and comes back
 *   as it was when you return.
 * - Backspace in the empty search goes back one page; held down, it never skips several or eats
 *   the search it puts back, and a hold that starts on text stops when the text is gone. The
 *   footer shows it as "⌫ Back", and screen readers hear each page's name and that hint when it
 *   opens. Escape closes the whole menu; it opens again on the first page.
 * - With `onAsk`, any query adds a last row, 'Ask the agent about "…"', under an Agent heading:
 *   when nothing matches, it is the only row, so Enter asks. It opens the agent's page, where
 *   the question sits over the answer: AgentLoading while `answering` and nothing has come yet,
 *   then StreamingText. The search asks follow-ups there (Enter). Without `answer` and
 *   `answering` the menu closes after onAsk, for an app that answers elsewhere (a chat panel).
 * - A group's `icon` is the kind of record it lists (a person, a job, a company): every row in it
 *   without an icon of its own shows it, so each row says what it is.
 * - A command that completes says so: an item's `success` ("Moved to Negotiation") shows as a
 *   success toast once it has run, after the promise its onSelect returns, if any. The app needs
 *   a Toaster. Opening a page or asking the agent is not a completed command.
 * - The panel opens where CommandMenu puts it, then keeps its top edge there: a page of another
 *   length, or a shorter list as you type, grows or shrinks it downwards and the search never
 *   moves.
 * - Page to page, the list moves as DecisionCard's questions do (Satin's step slide): the new
 *   page comes in a whole menu's width from the end side going in (from the start side coming
 *   back) and fades in, the old one goes out the other way and fades, and the list's box eases to
 *   the new height, 360 ms on cubic-bezier(0.22, 1, 0.36, 1). The breadcrumb, the search and the
 *   key hints stay put. Not under reduced motion.
 *
 * `controlRef` gets the same `{ push, back, ask, search, close }` the items do, for a button or
 * a shortcut outside the menu: open it straight on a page, or on the agent's answer.
 *
 * Part: `CommandPagesAnswer`, the question and its answer, to show in a CommandMenu of your own
 * (as its `children`). Other props, `ref` included, go to the menu's panel, as on CommandMenu.
 */

/** The words CommandPages says on its own. They join SatinLabels, so the app translates them there. */
export const commandPagesLabels = {
  /** The last row while there is a query: it hands the query to the agent. */
  commandAskAbout: (query: string) => `Ask the agent about “${query}”`,
  /** The agent's page, in the breadcrumb. */
  commandAskAgent: 'Ask the agent',
  /** The search's placeholder on the agent's page. */
  commandAskFollowUp: 'Ask a follow-up…',
  /** The Backspace hint in the footer. */
  commandBack: 'Back',
  /** Read out when a page opens: its name, and how to leave it. */
  commandPageOpened: (title: string) => `${title}. Backspace goes back.`,
}

type CommandPagesLabels = typeof commandPagesLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends CommandPagesLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...commandPagesLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

/** What an item's `onSelect` and `controlRef` get: the menu's moves. */
export interface CommandPagesControl {
  /** Opens `page` on top of the current one, and the menu if it is closed. */
  push: (page: CommandPage) => void
  /** Back one page. */
  back: () => void
  /** Hands `question` to the agent: calls onAsk and opens the agent's page. */
  ask: (question: string) => void
  /** Puts `query` in the search. */
  search: (query: string) => void
  close: () => void
}

export interface CommandPage {
  /** Its name in the breadcrumb. Defaults to the label of the item that opens it; give one when you push it from outside. */
  title?: string
  groups: CommandPageGroup[]
  /** The search's placeholder on this page. Defaults to the title ("Move deal to…"). */
  placeholder?: string
}

export interface CommandPageItem extends Omit<CommandItem, 'onSelect' | 'keepOpen'> {
  /** The page it opens in place of the list. */
  page?: CommandPage
  /**
   * Runs it. The menu closes after, unless it opened a page with `menu.push(page)` (or the item
   * has a `page`). Return a promise to hold the `success` toast until it resolves.
   */
  onSelect?: (menu: CommandPagesControl) => void | Promise<unknown>
  /**
   * What it did, in a success toast once it has run: "Moved to Negotiation", "Owner set to Jon
   * Park". After a returned promise resolves; none if it rejects (report the error yourself).
   */
  success?: React.ReactNode
}

export interface CommandPageGroup {
  label: React.ReactNode
  /** The kind of record the group lists (a person, a job): the icon of each row without its own. */
  icon?: React.ReactNode
  items: CommandPageItem[]
}

export interface CommandPagesProps extends Omit<CommandMenuProps, 'groups' | 'header' | 'footer' | 'children'> {
  /** The first page. */
  groups: CommandPageGroup[]
  /** The first page's name: the breadcrumb's first item. Defaults to the `commands` label. */
  rootTitle?: string
  /**
   * Adds 'Ask the agent about "…"' as the last row whenever there is a query. Running it (Enter
   * when nothing else matches) calls this with the query and opens the agent's page; each
   * follow-up asked there calls it again.
   */
  onAsk?: (query: string) => void
  /** The agent's answer so far. Grow it as it streams; empty it when onAsk is called. */
  answer?: string
  /** More of the answer is coming: AgentLoading until the first words, then the caret. */
  answering?: boolean
  /** Gets the menu's moves, for opening it on a page or an answer from outside. */
  controlRef?: React.Ref<CommandPagesControl>
}

export interface CommandPagesAnswerProps extends React.ComponentProps<'div'> {
  /** What was asked, over the answer. */
  question: string
  /** The answer so far. */
  answer?: string
  /** More is coming. */
  answering?: boolean
}

/* ---------- the answer ---------- */

/**
 * The question, then AgentLoading while the answer is on its way and StreamingText once it
 * comes. It scrolls when long, and takes focus (Tab) so the keyboard can scroll it. Other props,
 * `ref` included, go to its scroll box.
 */
export function CommandPagesAnswer({ question, answer, answering = false, className, ...props }: CommandPagesAnswerProps) {
  return (
    <div
      data-slot="command-pages-answer"
      role="region"
      aria-label={question}
      tabIndex={0}
      className={cn(
        'flex min-h-0 flex-col gap-2 overflow-y-auto px-4 pt-3 pb-4 outline-none',
        'focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
      {...props}
    >
      <p className="text-base leading-5 font-medium text-text-default">{question}</p>
      {answer ? <StreamingText text={answer} streaming={answering} /> : answering ? <AgentLoading className="-ms-1" /> : null}
    </div>
  )
}

/* ---------- the menu ---------- */

type Step =
  | { kind: 'page'; page: CommandPage; title: string; below: string }
  | { kind: 'ask'; question: string; title: string; below: string }

export function CommandPages({
  groups,
  rootTitle,
  onAsk,
  answer,
  answering,
  controlRef,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  query: queryProp,
  onQueryChange,
  placeholder,
  hints = true,
  onKeyDown,
  onKeyUp,
  ref,
  ...props
}: CommandPagesProps) {
  const labels = useLabels()

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const openRef = React.useRef(open)
  openRef.current = open
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp == null) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  const [uncontrolledQuery, setUncontrolledQuery] = React.useState('')
  const query = queryProp ?? uncontrolledQuery
  const queryRef = React.useRef(query)
  queryRef.current = query
  const queryChange = React.useRef(onQueryChange)
  queryChange.current = onQueryChange
  const setQuery = React.useCallback(
    (next: string) => {
      if (queryProp == null) setUncontrolledQuery(next)
      queryChange.current?.(next)
    },
    [queryProp],
  )

  // The pages opened on top of the first one, each with the query left on the page below it.
  const [trail, setTrail] = React.useState<Step[]>([])
  const trailRef = React.useRef(trail)
  trailRef.current = trail
  // Backspace went back and is still down: its repeats neither go back again nor delete.
  const heldBack = React.useRef(false)

  // Where the panel's top edge sits within CommandMenu's frame, from when it opened.
  const [top, setTop] = React.useState<number | null>(null)

  // Closed, it forgets its pages and its place: it opens again on the first page, where
  // CommandMenu puts it.
  const [wasOpen, setWasOpen] = React.useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      if (trail.length) setTrail([])
      setTop(null)
    }
  }

  // One polite region for the page names and the agent's answer; a new key makes it speak again.
  const [said, setSaid] = React.useState({ text: '', n: 0 })
  const announce = (text: string) => setSaid((s) => ({ text, n: s.n + 1 }))

  const root = rootTitle ?? labels.commands
  const current = trail.at(-1)
  const answersHere = answer !== undefined || answering !== undefined

  const go = (next: Step[], nextQuery: string) => {
    // The list leaves as it looks now: its highlight and scroll live in CommandMenu, which
    // re-renders on its own as the arrows move.
    capture()
    setTrail(next)
    setQuery(nextQuery)
    if (!openRef.current) setOpen(true)
    const top = next.at(-1)
    announce(top ? labels.commandPageOpened(top.title) : root)
  }

  const push = (page: CommandPage, fallbackTitle = '') => {
    const title = page.title ?? fallbackTitle
    go([...trailRef.current, { kind: 'page', page, title, below: queryRef.current }], '')
  }
  const goTo = (depth: number) => {
    const t = trailRef.current
    if (depth >= t.length) return
    go(t.slice(0, depth), t[depth].below)
  }
  const back = () => goTo(trailRef.current.length - 1)
  const close = () => setOpen(false)
  const ask = (question: string) => {
    const q = question.trim()
    if (!q) return
    onAsk?.(q)
    if (!answersHere) return close()
    const t = trailRef.current
    const last = t.at(-1)
    // A follow-up stays on the agent's page; the question changes.
    if (last?.kind === 'ask') {
      setTrail([...t.slice(0, -1), { ...last, question: q }])
      setQuery('')
    } else go([...t, { kind: 'ask', question: q, title: labels.commandAskAgent, below: queryRef.current }], '')
  }
  const search = (next: string) => {
    setQuery(next)
    if (!openRef.current) setOpen(true)
  }

  const control: CommandPagesControl = { push: (page) => push(page), back, ask, search, close }
  React.useImperativeHandle(controlRef, () => control)

  const select = (item: CommandPageItem) => {
    let pushed = false
    const ran = item.onSelect?.({
      ...control,
      push: (page) => {
        pushed = true
        push(page, item.label)
      },
    })
    if (item.page && !pushed) return push(item.page, item.label)
    if (pushed) return
    close()
    const { success } = item
    if (success == null) return
    if (ran && typeof ran.then === 'function') ran.then(() => toast.success(success), () => {})
    else toast.success(success)
  }

  const toGroups = (list: CommandPageGroup[]): CommandGroup[] =>
    list.map((g) => ({
      label: g.label,
      items: g.items.map((source) => {
        const { page, onSelect, success, icon, ...item } = source
        return { ...item, icon: icon ?? g.icon, keepOpen: true, onSelect: () => select(source) }
      }),
    }))

  const onAgentPage = current?.kind === 'ask'
  const shown: CommandGroup[] = onAgentPage ? [] : toGroups(current?.kind === 'page' ? current.page.groups : groups)
  const trimmed = query.trim()
  if (onAsk && trimmed && !onAgentPage) {
    shown.push({
      label: labels.agent,
      items: [
        {
          id: 'satin-ask-agent',
          label: labels.commandAskAbout(trimmed),
          icon: <TetrisStill />,
          // Always a match: it is the answer to every query.
          keywords: [query],
          keepOpen: true,
          onSelect: () => ask(trimmed),
        },
      ],
    })
  }

  // The answer, read out once it is complete.
  const answered = React.useRef('')
  React.useEffect(() => {
    if (onAgentPage && !answering && answer && answer !== answered.current) {
      answered.current = answer
      announce(answer)
    }
  }, [onAgentPage, answering, answer])

  const panel = React.useRef<HTMLDivElement | null>(null)
  const setPanel = React.useCallback(
    (node: HTMLDivElement | null) => {
      panel.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      // As it opens, CommandMenu centres it in its frame: keep that top edge from then on.
      const frame = node?.parentElement
      if (node && frame) {
        const padding = parseFloat(getComputedStyle(frame).paddingTop) || 0
        const at = Math.max(0, node.offsetTop - padding)
        setTop((t) => t ?? at)
      }
    },
    [ref],
  )
  const anchored: React.CSSProperties | undefined =
    top == null
      ? undefined
      : // CommandMenu's own cap on its height, and never past the frame's bottom.
        { alignSelf: 'flex-start', marginTop: top, maxHeight: `min(480px, 76vh, calc(100% - ${top}px))` }

  // Page to page, the list moves as DecisionCard's questions do (step-slide): the new page in from
  // the end side going in, from the start side coming back, the old one out the other way, and
  // CommandMenu's list box easing to the new height. The page's place in the trail orders them.
  // Closing keeps the last page's key, so the list doesn't slide back as the menu goes.
  const listOf = () => panel.current?.querySelector<HTMLElement>('[data-slot="command-menu-body"] > :not([data-step-copy])') ?? null
  const pathKey = `${trail.length}\u0000${trail.map((step) => (step.kind === 'ask' ? '\u0000ask' : step.title)).join('\u0000')}`
  const openKey = React.useRef(pathKey)
  if (open) openKey.current = pathKey
  // A new page starts at the top of its list, not where the last one was scrolled to.
  React.useLayoutEffect(() => {
    const list = listOf()
    if (list) list.scrollTop = 0
  }, [openKey.current])
  const capture = useStepSlide(openKey.current, trail.length, panel, () => [listOf()])

  const crumbs: BreadcrumbItem[] = [
    { label: root, onSelect: () => goTo(0) },
    ...trail.map((step, i) => ({ label: step.title, onSelect: () => goTo(i + 1) })),
  ].map((c, i, all) => {
    if (i === all.length - 1) return { label: c.label }
    return {
      label: c.label,
      onSelect: () => {
        c.onSelect()
        // A crumb is a button: put focus back in the search, where the keys work.
        panel.current?.querySelector('input')?.focus()
      },
    }
  })

  // CommandMenu's hints plus ⌫ Back, keyed, so a hint keeps its element from page to page (Esc
  // stays Esc) and only Back comes and goes.
  const hint = {
    navigate: <KbdHint key="navigate" keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />,
    open: <KbdHint key="open" keys={[<KbdReturn key="return" />]} label={labels.openItem} />,
    send: <KbdHint key="send" keys={[<KbdReturn key="return" />]} label={labels.send} />,
    back: <KbdHint key="back" keys={['⌫']} label={labels.commandBack} />,
    close: <KbdHint key="close" className="ms-auto" keys={['Esc']} label={labels.close} />,
  }
  const footer = onAgentPage
    ? [hint.send, hint.back, hint.close]
    : [hint.navigate, hint.open, ...(current ? [hint.back] : []), hint.close]

  return (
    <CommandMenu
      {...props}
      ref={setPanel}
      style={{ ...props.style, ...anchored }}
      data-page={trail.length}
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      groups={shown}
      hints={hints}
      placeholder={
        !current ? placeholder : current.kind === 'ask' ? labels.commandAskFollowUp : (current.page.placeholder ?? current.title)
      }
      onKeyDown={(e) => {
        onKeyDown?.(e)
        const field = e.target
        if (e.defaultPrevented || !(field instanceof HTMLInputElement) || e.nativeEvent.isComposing) return
        if (e.key === 'Backspace' && e.repeat && heldBack.current) {
          // Still held after going back: leave the search it put back alone.
          e.preventDefault()
        } else if (e.key === 'Backspace' && field.value === '' && trailRef.current.length && !e.repeat) {
          e.preventDefault()
          heldBack.current = true
          back()
        } else if (e.key === 'Enter' && onAgentPage) {
          e.preventDefault()
          ask(field.value)
        }
      }}
      onKeyUp={(e) => {
        onKeyUp?.(e)
        if (e.key === 'Backspace') heldBack.current = false
      }}
      header={
        <>
          {/* On every page, the first included, so the search under it never moves. */}
          <div data-slot="command-pages-breadcrumb" className="flex shrink-0 px-3 pt-2.5">
            <Breadcrumb items={crumbs} maxItems={3} />
          </div>
          <div role="status" className="sr-only">
            <span key={said.n}>{said.text}</span>
          </div>
        </>
      }
      footer={footer}
    >
      {onAgentPage ? <CommandPagesAnswer question={current.question} answer={answer} answering={answering} /> : undefined}
    </CommandMenu>
  )
}
