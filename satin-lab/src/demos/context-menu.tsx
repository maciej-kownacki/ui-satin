import * as React from 'react'
import { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuSub } from '@satin/ui/context-menu'
import { ArrowUpRight, Copy, Download, EditPencil, Folder, Trash } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [{ id: 'submenu', label: 'Submenu', type: 'switch', default: 'on' }]

function code(v: Record<string, string>) {
  return `import { ContextMenu, ContextMenuItem, ContextMenuSeparator${v.submenu === 'on' ? ', ContextMenuSub' : ''} } from '@satin/ui/context-menu'

<ContextMenu trigger={<FileRow name="menu-autumn.pdf" />}>
  <ContextMenuItem label="Open" icon={<ArrowUpRight />} shortcut="↵" />
  <ContextMenuItem label="Rename" icon={<EditPencil />} shortcut="⌘R" />
  <ContextMenuItem label="Duplicate" icon={<Copy />} shortcut="⌘D" />
  <ContextMenuSeparator />${v.submenu === 'on' ? `
  <ContextMenuSub label="Move to" icon={<Folder />}>
    <ContextMenuItem label="Menus" />
    <ContextMenuItem label="Suppliers" />
    <ContextMenuItem label="Archive" />
  </ContextMenuSub>` : ''}
  <ContextMenuItem label="Download" icon={<Download />} />
  <ContextMenuSeparator />
  <ContextMenuItem label="Delete" icon={<Trash />} shortcut="⌫" destructive />
</ContextMenu>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.submenu === 'on' ? 'With submenu' : 'Flat', code: code(v) }))

/**
 * The menu alone, already open: the page sends an empty anchor the contextmenu event a
 * right-click would, at its top-left corner, and does again whenever the menu closes, so it stays
 * on show. It portals into the stage (non-modal, so the docs page keeps scrolling) inside a
 * preview exactly its size, so only the menu shows.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const rowRef = React.useRef<HTMLDivElement>(null)
  // The menu's own height: 220 with the submenu row, 182 without.
  const height = v.submenu === 'on' ? 220 : 182

  // Radix opens the menu 2px right of the point (its sideOffset); the point sits 2px left so the
  // menu fills the preview exactly.
  // Opening moves focus into the menu; a menu the page opened hands it back to where it was, so
  // keyboard users aren't pulled off the property they just changed. A real right-click keeps it.
  const show = React.useCallback(() => {
    const row = rowRef.current
    if (!row || !stage) return
    const before = document.activeElement
    const r = row.getBoundingClientRect()
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left - 2, clientY: r.top }))
    // Radix focuses the menu once it has mounted; once it has, hand focus back.
    setTimeout(() => {
      if (!stage.contains(document.activeElement)) return
      if (before instanceof HTMLElement && before !== document.body && before.isConnected) {
        before.focus({ preventScroll: true })
        return
      }
      // Nothing had focus yet: back to the top of the page, so Tab starts at the skip link.
      ;(document.activeElement as HTMLElement).blur()
      document.body.tabIndex = -1
      document.body.focus({ preventScroll: true })
      document.body.removeAttribute('tabindex')
    }, 120)
  }, [stage])

  // The menu hangs from a fixed point, so it must open once the anchor is where it ends up (fonts
  // in, layout settled), and open again there whenever it moves (stage resize, sidebar, window).
  React.useEffect(() => {
    const row = rowRef.current
    if (!row || !stage) return
    let alive = true
    let last = ''
    const place = () => {
      if (!alive) return
      const r = row.getBoundingClientRect()
      const at = `${Math.round(r.left)},${Math.round(r.top)}`
      if (at === last) return
      last = at
      show()
    }
    document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(place)))
    const resize = new ResizeObserver(() => requestAnimationFrame(place))
    resize.observe(document.documentElement)
    resize.observe(row)
    window.addEventListener('resize', place)
    return () => {
      alive = false
      resize.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [show, stage])

  return (
    <div className="relative w-[255px] max-w-full" style={{ height }}>
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && (
        <ContextMenu
          container={stage}
          modal={false}
          onFocusOutside={(e) => e.preventDefault()}
          onOpenChange={(open) => {
            if (!open) setTimeout(show, 0)
          }}
          trigger={<div ref={rowRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0" />}
        >
          <ContextMenuItem label="Open" icon={<ArrowUpRight />} shortcut="↵" />
          <ContextMenuItem label="Rename" icon={<EditPencil />} shortcut="⌘R" />
          <ContextMenuItem label="Duplicate" icon={<Copy />} shortcut="⌘D" />
          <ContextMenuSeparator />
          {v.submenu === 'on' && (
            <ContextMenuSub label="Move to" icon={<Folder />}>
              <ContextMenuItem label="Menus" />
              <ContextMenuItem label="Suppliers" />
              <ContextMenuItem label="Archive" />
            </ContextMenuSub>
          )}
          <ContextMenuItem label="Download" icon={<Download />} />
          <ContextMenuSeparator />
          <ContextMenuItem label="Delete" icon={<Trash />} shortcut="⌫" destructive />
        </ContextMenu>
      )}
    </div>
  )
}

export default function ContextMenuDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Context menu"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
