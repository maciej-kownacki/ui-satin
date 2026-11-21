'use client'

import * as React from 'react'
import { AgentAvatar, type Agent } from '@uisatin/ui/agent-picker'
import { Button } from '@uisatin/ui/button'
import { cardVariants } from '@uisatin/ui/card'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DropdownMenuItem } from '@uisatin/ui/dropdown'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { List } from '@uisatin/ui/list'
import { SplitButton } from '@uisatin/ui/split-button'

/**
 * AgentPermissionRequest: what an agent will touch, asked before it first runs. The agent and
 * why it asks, then one row per scope (a resource and what it does to it, in plain verbs: "Read
 * candidates", "Send emails"), each with a Checkbox, then Don't allow and a SplitButton: Allow
 * once, or Always allow from its menu.
 *
 * - It sits in the flow like Dialog content: Card's frame (bg/popover, border/default,
 *   radius-2xl, 405 wide) with Agent suggestion's small shadow, and Dialog's entrance (rise and
 *   fade), quicker: --duration-slow. Nothing pulses.
 * - The header follows the Flappy warning dialogs: the agent's avatar in a tile of its tone, a
 *   soft aura of that tone from the top edge, and the title and reason centred under them. The
 *   scopes and the answers below stay aligned to the start.
 * - Scopes that `send` reach other people as you, so they stand apart: the icon tile turns amber
 *   and the title goes on in muted text, "Send emails · Sends as you". Reads and writes stay neutral, on
 *   the file-icon tile Attachment and a neutral Toast use.
 * - Every scope starts ticked. Unticking one makes the request partial: its title turns muted
 *   and the footer counts what is left ("2 of 3 selected"). With nothing ticked, Allow is off.
 * - It is the question only. What follows an answer (closing the Dialog, granting the access,
 *   saying so) is the app's part: `onAllow` gets the mode and the ticked scopes.
 * - Focus: inside a Dialog it starts on Don't allow, the safest answer (`autoFocus` to choose).
 * - `onAllow` and `onDeny` may return a promise: the button shows a Spinner and the rest of the
 *   request waits until it settles. If it rejects, the request stays as it was; showing the
 *   error is the app's part.
 *
 * Controlled or not: `value` / `defaultValue` / `onValueChange` for the ticked scopes' ids.
 *
 * Parts, for a request of your own: `AgentPermissionRoot` › `AgentPermissionHeader`,
 * `AgentPermissionScopeList` (› `AgentPermissionScope`), `AgentPermissionFooter`. Other props on
 * AgentPermissionRequest and AgentPermissionRoot, `ref` included, go to the card's `div`.
 */

export type AgentPermissionAction = 'read' | 'write' | 'send'

/** How long a permission lasts: this run only, or until someone removes it. */
export type AgentPermissionMode = 'once' | 'always'

export interface AgentPermissionScope {
  /** Names the scope in `value`. Defaults to `resource`. */
  id?: string
  /** What it touches, as the title says it: "candidates", "notes", "emails". */
  resource: string
  /** What it does to it, in this order whatever the order given. `send` reaches other people as you. */
  actions: AgentPermissionAction[]
  /** One line on the specifics: which records, from which address, to whom. */
  detail?: React.ReactNode
  /** The row's title, in place of the verbs and the resource ("Read candidates"). */
  label?: string
}

/** The agent asking: a name, or the same object Agent picker takes (initials, tone, the flappy avatar). */
export type AgentPermissionAgent = string | (Omit<Agent, 'id' | 'description'> & { id?: string })

const ORDER: AgentPermissionAction[] = ['read', 'write', 'send']
const ENGLISH_VERBS: Record<AgentPermissionAction, string> = { read: 'read', write: 'write', send: 'send' }

/** The words the permission request says on its own. They join SatinLabels, so the app translates them there. */
export const agentPermissionsLabels = {
  /** The request's title, after the agent's avatar: "Recruiting agent wants to:". */
  agentPermissionsTitle: (agent: string) => `${agent} wants to:`,
  /**
   * A scope's title from its verbs and its resource: "Read candidates", "Read and write notes".
   * `actions` always come in the order read, write, send.
   */
  agentPermissionsScope: (actions: AgentPermissionAction[], resource: string) => {
    const verbs = actions.map((a) => ENGLISH_VERBS[a])
    const said = verbs.length > 1 ? `${verbs.slice(0, -1).join(', ')} and ${verbs[verbs.length - 1]}` : (verbs[0] ?? '')
    return `${said.charAt(0).toUpperCase()}${said.slice(1)} ${resource}`
  },
  /** After the title of a scope that sends, in muted text: it goes out under the person's name. */
  agentPermissionsSendsAsYou: 'Sends as you',
  agentPermissionsDeny: 'Don’t allow',
  agentPermissionsAllowOnce: 'Allow once',
  agentPermissionsAllowAlways: 'Always allow',
  /** Under Always allow in the menu: how long it lasts. */
  agentPermissionsAllowAlwaysHint: 'Until you remove access',
  /** The SplitButton arrow's name. */
  agentPermissionsAllowOptions: 'More ways to allow',
  /** In the footer while some scopes are unticked: "2 of 3 selected". */
  agentPermissionsSelected: (count: number, total: number) => `${count} of ${total} selected`,
}

type AgentPermissionsLabels = typeof agentPermissionsLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentPermissionsLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...agentPermissionsLabels, ...labels }), [labels])
}

/** A scope's id in `value`: its own, or its resource. */
export const agentPermissionScopeId = (scope: AgentPermissionScope) => scope.id ?? scope.resource

const actionsOf = (scope: AgentPermissionScope) => ORDER.filter((a) => scope.actions.includes(a))

/** The verb that says most about a scope: send, then write, then read. Picks its icon. */
const strongest = (scope: AgentPermissionScope): AgentPermissionAction =>
  scope.actions.includes('send') ? 'send' : scope.actions.includes('write') ? 'write' : 'read'

const toAgent = (agent: AgentPermissionAgent): Agent =>
  typeof agent === 'string' ? { id: agent, name: agent } : { ...agent, id: agent.id ?? agent.name }

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === 'function'

/* ---------- state ---------- */

type Busy = 'allow' | 'deny' | null

interface PermissionContextValue {
  agent: Agent
  scopes: AgentPermissionScope[]
  selected: string[]
  toggle: (id: string, on: boolean) => void
  busy: Busy
  allow: (mode: AgentPermissionMode) => void
  deny: () => void
  titleId: string
  descriptionId: string
  /** The header says it's there, so the card is named after its title only when it is. */
  setHeader: (header: { description: boolean } | null) => void
  denyRef: React.RefObject<HTMLButtonElement | null>
  labels: ReturnType<typeof useLabels>
}

const PermissionContext = React.createContext<PermissionContextValue | null>(null)

function usePermission(part: string) {
  const context = React.useContext(PermissionContext)
  if (!context) throw new Error(`${part} must be inside AgentPermissionRoot`)
  return context
}

/** Controlled when `value` is given, its own state otherwise; `onChange` hears both. */
function useControllable<T>(value: T | undefined, defaultValue: T | (() => T), onChange?: (value: T) => void) {
  const [inner, setInner] = React.useState(defaultValue)
  const controlled = value !== undefined
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      onChangeRef.current?.(next)
    },
    [controlled],
  )
  return [controlled ? (value as T) : inner, set] as const
}

export interface AgentPermissionRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** Who asks: a name, or an Agent picker agent (`{ name, initials, tone, avatar }`). */
  agent: AgentPermissionAgent
  /** What it asks for, one row each: `{ resource, actions, detail }`. */
  scopes: AgentPermissionScope[]
  /** The ticked scopes' ids (`id`, or `resource`). */
  value?: string[]
  /** The ticked scopes to start from. Defaults to every scope. */
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /**
   * Allow once (`once`) or Always allow (`always`), with the ticked scopes. Return a promise and
   * the button shows a Spinner until it settles; if it rejects, the request stays as it was.
   */
  onAllow?: (mode: AgentPermissionMode, scopes: AgentPermissionScope[]) => unknown
  /** Don't allow. A promise works as for `onAllow`. */
  onDeny?: () => unknown
  /**
   * Focus Don't allow, the safest answer, when the request appears. Defaults to true inside a
   * Dialog and false elsewhere, so a request arriving in a chat never takes the keys from
   * someone typing.
   */
  autoFocus?: boolean
}

/** The card and its state; the parts go inside. Other props, `ref` included, go to its `div`. */
export function AgentPermissionRoot({
  agent: agentProp,
  scopes,
  value: valueProp,
  defaultValue,
  onValueChange,
  onAllow,
  onDeny,
  autoFocus,
  className,
  children,
  ref,
  ...props
}: AgentPermissionRootProps) {
  const labels = useLabels()
  const agent = React.useMemo(() => toAgent(agentProp), [agentProp])
  const [selected, setSelected] = useControllable(valueProp, () => defaultValue ?? scopes.map(agentPermissionScopeId), onValueChange)
  const [busy, setBusy] = React.useState<Busy>(null)
  const [header, setHeader] = React.useState<{ description: boolean } | null>(null)

  const base = React.useId()
  const titleId = `${base}-title`
  const descriptionId = `${base}-description`
  const rootRef = React.useRef<HTMLDivElement>(null)
  const denyRef = React.useRef<HTMLButtonElement>(null)

  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /** Runs a handler; a promise holds its button busy, and the rest of the request, until it settles. */
  const settle = (kind: Exclude<Busy, null>, run: () => unknown) => {
    if (busy) return
    const result = run()
    if (!isThenable(result)) return
    setBusy(kind)
    const done = () => {
      if (alive.current) setBusy(null)
    }
    Promise.resolve(result).then(done, done)
  }

  const granted = scopes.filter((s) => selected.includes(agentPermissionScopeId(s)))
  const allow = (mode: AgentPermissionMode) => {
    if (granted.length === 0) return
    settle('allow', () => onAllow?.(mode, granted))
  }
  const deny = () => settle('deny', () => onDeny?.())
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    setSelected(scopes.map(agentPermissionScopeId).filter((s) => next.has(s)))
  }

  // Inside a Dialog the request opens on Don't allow. A Dialog's own focus scope then leaves it there.
  React.useEffect(() => {
    const inDialog = !!rootRef.current?.closest('[role="dialog"], [role="alertdialog"]')
    if (autoFocus ?? inDialog) denyRef.current?.focus()
  }, []) // On mount only.

  const value: PermissionContextValue = {
    agent,
    scopes,
    selected,
    toggle,
    busy,
    allow,
    deny,
    titleId,
    descriptionId,
    setHeader,
    denyRef,
    labels,
  }

  return (
    <PermissionContext.Provider value={value}>
      <div
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        role="group"
        aria-labelledby={header ? titleId : undefined}
        aria-describedby={header?.description ? descriptionId : undefined}
        data-slot="agent-permissions"
        data-partial={selected.length < scopes.length || undefined}
        className={cn(
          // isolate: the header's aura sits under the content (-z-1) but over the card's own fill.
          cardVariants(),
          'isolate',
          '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
          'animate-[satin-dialog-in_var(--duration-slow)_var(--ease-out)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </PermissionContext.Provider>
  )
}

/* ---------- the request ---------- */

export interface AgentPermissionHeaderProps extends React.ComponentProps<'div'> {
  /** Why it asks, in a sentence: "To screen this week's applicants for Product Designer." */
  description?: React.ReactNode
}

/**
 * The agent's avatar in a tile of its tone, over an aura of the same tone, and "<agent> wants
 * to:" centred under it, with why it asks. Other props, `ref` included, go to its `div`.
 */
export function AgentPermissionHeader({ description, className, ...props }: AgentPermissionHeaderProps) {
  const { agent, titleId, descriptionId, setHeader, labels } = usePermission('AgentPermissionHeader')
  const hasDescription = description != null
  React.useLayoutEffect(() => {
    setHeader({ description: hasDescription })
    return () => setHeader(null)
  }, [hasDescription, setHeader])
  return (
    <div
      data-slot="agent-permissions-header"
      data-tone={agent.tone ?? 'brand'}
      className={cn('flex flex-col items-center px-4 pt-6 pb-1 text-center', className)}
      {...props}
    >
      {/* The aura: the agent's tone glowing down from the middle of the card's top edge, an
          ellipse 290 × 200 at 20%. It fills the card (the Root is its positioned parent), under
          everything in it, and comes and goes with the request. */}
      <span
        aria-hidden
        data-slot="agent-permissions-aura"
        className="pointer-events-none absolute inset-0 -z-1 bg-[radial-gradient(ellipse_290px_200px_at_50%_16px,color-mix(in_oklab,var(--tone-fg)_20%,transparent),transparent)]"
      />
      {/* The agent in its own tile: 36px, radius 12, a ring and a 2px halo in its tone. */}
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-tone-fg/60 bg-tone-bg ring-2 ring-tone-fg/20">
        <AgentAvatar agent={agent} size={20} />
      </span>
      <div className="mt-3 flex flex-col gap-1">
        <p id={titleId} className="text-base leading-5 font-medium tracking-normal text-balance text-text-default">
          {labels.agentPermissionsTitle(agent.name)}
        </p>
        {hasDescription && (
          <p id={descriptionId} className="text-body text-balance text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export interface AgentPermissionScopeListProps extends React.ComponentProps<'ul'> {}

/**
 * The scopes as a list, one row each, kept apart by space rather than rules. Without children
 * it lists `scopes`. Other props, `ref` included, go to the `ul`.
 */
export function AgentPermissionScopeList({ className, children, ...props }: AgentPermissionScopeListProps) {
  const { scopes } = usePermission('AgentPermissionScopeList')
  return (
    // 8px above and below each row: 16 between rows, 24 from the reason and from the buttons, so
    // the card reads as intro, list, answers without rules cutting it up.
    <List data-slot="agent-permissions-scopes" className={cn('mx-4 mt-3 w-auto gap-0', className)} {...props}>
      {children ?? scopes.map((scope) => <AgentPermissionScope key={agentPermissionScopeId(scope)} scope={scope} />)}
    </List>
  )
}

export interface AgentPermissionScopeProps extends Omit<React.ComponentProps<'li'>, 'children'> {
  /** The scope this row asks for. Its tick is the `value` entry under its id. */
  scope: AgentPermissionScope
}

/**
 * One scope: its verb as an icon, its title and detail, and a Checkbox. The whole row is the
 * Checkbox's label. Other props, `ref` included, go to the `li`.
 */
export function AgentPermissionScope({ scope, className, ...props }: AgentPermissionScopeProps) {
  const { selected, toggle, busy, labels } = usePermission('AgentPermissionScope')
  const id = agentPermissionScopeId(scope)
  const checked = selected.includes(id)
  const action = strongest(scope)
  const sends = action === 'send'
  const base = React.useId()
  const title = scope.label ?? labels.agentPermissionsScope(actionsOf(scope), scope.resource)
  return (
    <li
      data-slot="agent-permissions-scope"
      data-action={action}
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn('group/scope', className)}
      {...props}
    >
      <label htmlFor={`${base}-box`} className="flex cursor-pointer items-center gap-3 py-2 has-disabled:cursor-default">
        <span
          aria-hidden
          data-tone={sends ? 'amber' : undefined}
          // The neutral tile is an Attachment's file-icon tile (and a neutral Toast's): 32px, radius 8, its fill.
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-md',
            sends ? 'bg-tone-bg text-tone-fg' : 'bg-component-file-icon-bg text-text-muted',
          )}
        >
          <ActionIcon action={action} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-5">
            <span
              id={`${base}-title`}
              className="font-medium text-text-default transition-colors duration-(--duration-fast) ease-(--ease-out) group-data-[state=unchecked]/scope:text-text-muted"
            >
              {title}
              {/* Read as a clause of its own after the title: "Send emails, Sends as you". */}
              {sends && <span className="sr-only">,</span>}
            </span>
            {sends && (
              <span className="text-text-muted">
                {/* In a narrow card "· Sends as you" moves down whole, so its dot still ties it to the title,
                    not the detail. The dot is for the eye only. */}{' '}
                <span className="whitespace-nowrap">
                  <span aria-hidden>{'·\u00a0'}</span>
                  <span id={`${base}-sends`}>{labels.agentPermissionsSendsAsYou}</span>
                </span>
              </span>
            )}
          </span>
          {scope.detail != null && (
            <span id={`${base}-detail`} className="text-sm leading-5 text-text-muted">
              {scope.detail}
            </span>
          )}
        </span>
        <Checkbox
          id={`${base}-box`}
          checked={checked}
          disabled={busy !== null}
          onCheckedChange={(on) => toggle(id, on === true)}
          aria-labelledby={sends ? `${base}-title ${base}-sends` : `${base}-title`}
          aria-describedby={scope.detail != null ? `${base}-detail` : undefined}
        />
      </label>
    </li>
  )
}

export interface AgentPermissionFooterProps extends React.ComponentProps<'div'> {}

/**
 * The answers: Don't allow, then Allow once with Always allow in its menu. While some scopes are
 * unticked, how many are left sits on the other side. Other props, `ref` included, go to its `div`.
 */
export function AgentPermissionFooter({ className, ...props }: AgentPermissionFooterProps) {
  const { scopes, selected, busy, allow, deny, denyRef, labels } = usePermission('AgentPermissionFooter')
  const count = scopes.filter((s) => selected.includes(agentPermissionScopeId(s))).length
  const partial = count < scopes.length
  return (
    <div data-slot="agent-permissions-footer" className={cn('flex flex-wrap items-center justify-end gap-x-3 gap-y-2 p-4', className)} {...props}>
      {partial && <p className="min-w-0 flex-1 text-sm text-text-muted tabular-nums">{labels.agentPermissionsSelected(count, scopes.length)}</p>}
      <div className="flex shrink-0 items-center gap-2">
        <Button ref={denyRef} variant="secondary" loading={busy === 'deny'} disabled={busy !== null && busy !== 'deny'} onClick={deny}>
          {labels.agentPermissionsDeny}
        </Button>
        <SplitButton
          loading={busy === 'allow'}
          disabled={count === 0 || (busy !== null && busy !== 'allow')}
          onClick={() => allow('once')}
          menuLabel={labels.agentPermissionsAllowOptions}
          menu={
            <DropdownMenuItem
              label={labels.agentPermissionsAllowAlways}
              description={labels.agentPermissionsAllowAlwaysHint}
              onSelect={() => allow('always')}
            />
          }
        >
          {labels.agentPermissionsAllowOnce}
        </SplitButton>
      </div>
    </div>
  )
}

/* ---------- the common case ---------- */

export interface AgentPermissionRequestProps extends Omit<AgentPermissionRootProps, 'children'> {
  /** Why it asks, in a sentence under the title. */
  description?: React.ReactNode
}

/**
 * The request from props: the header, the scopes and the answers. Other props, `ref` included,
 * go to the card's `div`.
 */
export function AgentPermissionRequest({ description, ...props }: AgentPermissionRequestProps) {
  return (
    <AgentPermissionRoot {...props}>
      <AgentPermissionHeader description={description} />
      <AgentPermissionScopeList />
      <AgentPermissionFooter />
    </AgentPermissionRoot>
  )
}

/* ---------- glyphs ---------- */

/** Iconoir's Eye, EditPencil and SendDiagonal, 16px at Satin's 1.875 on their 24 grid. */
function ActionIcon({ action }: { action: AgentPermissionAction }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      // The plane points the reading way.
      className={action === 'send' ? 'rtl:-scale-x-100' : undefined}
    >
      <g stroke="currentColor" strokeWidth="1.875" strokeLinecap="round" strokeLinejoin="round">
        {action === 'read' ? (
          <>
            <path d="M3 13C6.6 5 17.4 5 21 13" />
            <path d="M12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17Z" />
          </>
        ) : action === 'write' ? (
          <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" />
        ) : (
          <>
            <path d="M22.1525 3.55321L11.1772 21.0044L9.50686 12.4078L2.00002 7.89795L22.1525 3.55321Z" />
            <path d="M9.45557 12.4436L22.1524 3.55321" />
          </>
        )}
      </g>
    </svg>
  )
}
