import { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuSub } from '@satin/ui/context-menu'
import { FileIcon } from '@satin/ui/attachment'
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

export default function ContextMenuDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Context menu"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex w-[360px] max-w-full flex-col items-center gap-3">
          <ContextMenu
            trigger={
              <div
                tabIndex={0}
                className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-card p-3 outline-none data-[state=open]:bg-bg-hover focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
              >
                <FileIcon type="pdf" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-default">menu-autumn.pdf</span>
                <span className="text-sm text-text-muted">2.4 MB</span>
              </div>
            }
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
          <p className="text-sm text-text-muted">Right-click the file, or focus it and press Shift+F10.</p>
        </div>
      )}
    />
  )
}
