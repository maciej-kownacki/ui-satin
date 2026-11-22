'use client'

import * as React from 'react'
import { Toolbar as ToolbarPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button, type ButtonProps } from './button'
import { ButtonGroupSeparator } from './button-group'
import { menuSurfaceClass } from './dropdown'
import { keysOf } from './kbd'
import { Toggle, type ToggleProps } from './toggle'
import { Tooltip } from './tooltip'

/**
 * Toolbar: a row of controls that is one tab stop, on the Radix toolbar. Tab enters it once and
 * leaves it; ← → (↑ ↓ when vertical) move between its items, Home and End jump to the ends, and
 * the arrows wrap around (`loop={false}` stops them at the ends). Right to left the arrows flip;
 * the direction is read from the page, a `dir` on the toolbar wins.
 *
 * Give it a name: `aria-label` ("Formatting"), or `aria-labelledby`.
 *
 * - `variant="plain"` has no chrome, its items 2px apart; `variant="floating"` sits on the menu
 *   surface (bg/popover, border/subtle, radius-xl, the float shadow) with 4px inside, for a
 *   bubble bar over a text selection. Place a floating one with `Floating`, which takes a
 *   virtual anchor (the selection's rect).
 * - `size` is the items' height: sm 28 (the default), md 32.
 * - `preventFocusOnPress` keeps a press on an item from taking focus, so a click on Bold doesn't
 *   take the selection from an editor. The keyboard still reaches the items.
 *
 * Items: `ToolbarButton` (a tertiary Button), `ToolbarToggle` (a ghost Toggle that stays
 * pressed) and `ToolbarSeparator`. An icon-only item is named by `label`, which its tooltip
 * shows with `shortcut` as keys.
 *
 * Other props, `ref` included, go to the toolbar `div`.
 */
export interface ToolbarProps extends React.ComponentProps<typeof ToolbarPrimitive.Root> {
  size?: 'sm' | 'md'
  variant?: 'plain' | 'floating'
  /** Keep a press on an item from moving focus to it (an editor keeps its selection). */
  preventFocusOnPress?: boolean
}

interface ToolbarContextValue {
  size: 'sm' | 'md'
  orientation: 'horizontal' | 'vertical'
  preventFocusOnPress: boolean
}

const ToolbarContext = React.createContext<ToolbarContextValue>({ size: 'sm', orientation: 'horizontal', preventFocusOnPress: false })

type Dir = 'ltr' | 'rtl'

/** The direction an element is laid out in: its `dir`, inherited, else the CSS `direction`. */
function directionOf(el: Element): Dir {
  const attr = el.closest('[dir]')?.getAttribute('dir')
  if (attr === 'rtl' || attr === 'ltr') return attr
  try {
    return el.matches(':dir(rtl)') ? 'rtl' : 'ltr'
  } catch {
    return getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr'
  }
}

export function Toolbar({
  size = 'sm',
  variant = 'plain',
  orientation = 'horizontal',
  loop = true,
  preventFocusOnPress = false,
  dir: dirProp,
  className,
  ref,
  ...props
}: ToolbarProps) {
  // Radix reads the direction from a DirectionProvider only and falls back to left to right, so
  // in a right-to-left page → would still move forward. Read it from the toolbar's place instead.
  const own = React.useRef<HTMLDivElement | null>(null)
  const [pageDir, setPageDir] = React.useState<Dir>('ltr')
  React.useLayoutEffect(() => {
    // From the parent: Radix writes its own `dir` on the toolbar.
    const parent = own.current?.parentElement
    if (parent) setPageDir(directionOf(parent))
  }, [])
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const context = React.useMemo(() => ({ size, orientation, preventFocusOnPress }), [size, orientation, preventFocusOnPress])
  return (
    <ToolbarContext.Provider value={context}>
      <ToolbarPrimitive.Root
        ref={setRef}
        data-slot="toolbar"
        data-variant={variant}
        data-size={size}
        orientation={orientation}
        loop={loop}
        dir={dirProp ?? pageDir}
        className={cn(
          'flex w-fit gap-0.5',
          orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-stretch',
          variant === 'floating' && [menuSurfaceClass, 'p-1'],
          className,
        )}
        {...props}
      />
    </ToolbarContext.Provider>
  )
}

/** "⌘⇧B" as aria-keyshortcuts wants it: "Meta+Shift+B". */
const MODIFIERS: Record<string, string> = { '⌘': 'Meta', '⌃': 'Control', '⇧': 'Shift', '⌥': 'Alt', Cmd: 'Meta', Ctrl: 'Control', Option: 'Alt', Opt: 'Alt' }
const ariaShortcut = (shortcut: string) => keysOf(shortcut).map((k) => MODIFIERS[k] ?? k).join('+')

/** The hover and focus tooltip of an item: its label and keys. Off, the item stands alone. */
function ItemTooltip({ show, label, shortcut, children }: { show: boolean; label?: string; shortcut?: string; children: React.ReactElement }) {
  if (!show || !label) return children
  return (
    <Tooltip label={label} shortcut={shortcut}>
      {children}
    </Tooltip>
  )
}

/** Composes the caller's mousedown with the one that keeps focus where it is. */
function useMouseDown<E extends HTMLElement>(onMouseDown?: React.MouseEventHandler<E>) {
  const { preventFocusOnPress } = React.useContext(ToolbarContext)
  if (!preventFocusOnPress) return onMouseDown
  return (event: React.MouseEvent<E>) => {
    onMouseDown?.(event)
    event.preventDefault()
  }
}

interface ItemProps {
  /** A 16px icon. Without children the item is icon-only, named by `label`. */
  icon?: React.ReactNode
  /** What the item does, in a word or two: the name of an icon-only item, and its tooltip. */
  label?: string
  /** Keys that run it, e.g. "⌘B": shown as keys in the tooltip and set as `aria-keyshortcuts`. */
  shortcut?: string
  /** Show the tooltip on hover and keyboard focus. On for icon-only items and items with a `shortcut`. */
  tooltip?: boolean
}

/**
 * A toolbar button: a tertiary Button at the toolbar's size, icon-only when it has an `icon` and
 * no children. Other props, `ref` included, go to the `button`.
 */
export interface ToolbarButtonProps extends Omit<ButtonProps, 'size' | 'iconOnly' | 'asChild'>, ItemProps {}

export function ToolbarButton({ icon, label, shortcut, tooltip, variant = 'tertiary', disabled, children, onMouseDown, ...props }: ToolbarButtonProps) {
  const { size } = React.useContext(ToolbarContext)
  const iconOnly = !!icon && (children == null || children === false)
  const mouseDown = useMouseDown(onMouseDown)
  return (
    <ItemTooltip show={tooltip ?? (iconOnly || !!shortcut)} label={label} shortcut={shortcut}>
      <ToolbarPrimitive.Button asChild disabled={disabled}>
        <Button
          data-slot="toolbar-button"
          variant={variant}
          size={size === 'md' ? 'lg' : 'md'}
          iconOnly={iconOnly}
          aria-label={iconOnly ? label : undefined}
          aria-keyshortcuts={shortcut ? ariaShortcut(shortcut) : undefined}
          disabled={disabled}
          onMouseDown={mouseDown}
          {...props}
        >
          {icon}
          {children}
        </Button>
      </ToolbarPrimitive.Button>
    </ItemTooltip>
  )
}

/**
 * A toolbar toggle: a ghost Toggle at the toolbar's size that stays pressed (`aria-pressed`),
 * controlled with `pressed` / `onPressedChange` or not with `defaultPressed`. Icon-only when it
 * has an `icon` and no children; keep `label` the same pressed or not, since `aria-pressed`
 * says the state. Other props, `ref` included, go to the `button`.
 */
export interface ToolbarToggleProps extends Omit<ToggleProps, 'size' | 'variant' | 'iconOnly' | 'asChild' | 'icon'>, ItemProps {}

export function ToolbarToggle({
  icon,
  label,
  shortcut,
  tooltip,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  disabled,
  children,
  className,
  onMouseDown,
  ...props
}: ToolbarToggleProps) {
  const { size } = React.useContext(ToolbarContext)
  const iconOnly = !!icon && (children == null || children === false)
  const mouseDown = useMouseDown(onMouseDown)
  const [inner, setInner] = React.useState(defaultPressed)
  const pressed = pressedProp ?? inner
  return (
    <ItemTooltip show={tooltip ?? (iconOnly || !!shortcut)} label={label} shortcut={shortcut}>
      <ToolbarPrimitive.Button asChild disabled={disabled}>
        <Toggle
          data-slot="toolbar-toggle"
          variant="ghost"
          size={size}
          iconOnly={iconOnly}
          icon={icon}
          aria-label={iconOnly ? label : undefined}
          aria-keyshortcuts={shortcut ? ariaShortcut(shortcut) : undefined}
          pressed={pressed}
          onPressedChange={(next) => {
            setInner(next)
            onPressedChange?.(next)
          }}
          // The tooltip's trigger sets its own data-state; the toggle's pressed look reads this one.
          data-state={pressed ? 'on' : 'off'}
          disabled={disabled}
          onMouseDown={mouseDown}
          className={cn(
            // Focus as on the toolbar's buttons: the ring 2px off the item, in action/focus-ring,
            // instead of the ghost toggle's primary edge, so the row has one focus look.
            'satin-focus:border-transparent satin-focus:[box-shadow:none] data-[state=on]:satin-focus:[box-shadow:none]',
            'focus-visible:outline-solid satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring',
            className,
          )}
          {...props}
        >
          {children}
        </Toggle>
      </ToolbarPrimitive.Button>
    </ItemTooltip>
  )
}

/**
 * A thin rule between sets of items: the ButtonGroupSeparator look, a `separator` across the
 * toolbar. Other props, `ref` included, go to its `div`.
 */
export function ToolbarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = React.useContext(ToolbarContext)
  const across = orientation === 'horizontal' ? 'vertical' : 'horizontal'
  return (
    <ToolbarPrimitive.Separator asChild>
      <ButtonGroupSeparator
        data-slot="toolbar-separator"
        aria-orientation={across}
        className={cn(orientation === 'horizontal' ? 'mx-1' : 'my-1', className)}
        {...props}
      />
    </ToolbarPrimitive.Separator>
  )
}
