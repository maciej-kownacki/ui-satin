import * as React from 'react'
import { DropdownMenu, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@uisatin/ui/dropdown'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle } from '@uisatin/ui/toolbar'
import { Bold, Italic, Link, List, NavArrowDown, NumberedListLeft, Strikethrough } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Pressed is live: press B, I or S in the stage. The controls set where the toolbar sits and its size.
export const controls: ShowcaseControl[] = [
  { id: 'variant', label: 'Variant', items: [{ value: 'plain', label: 'Plain' }, { value: 'floating', label: 'Floating' }] },
  { id: 'size', label: 'Size', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }] },
]

const styles = ['Paragraph', 'Heading 1', 'Heading 2', 'Quote']
const marks = [
  { Icon: Bold, name: 'Bold', label: 'Bold', shortcut: '⌘B' },
  { Icon: Italic, name: 'Italic', label: 'Italic', shortcut: '⌘I' },
  { Icon: Strikethrough, name: 'Strikethrough', label: 'Strikethrough', shortcut: '⌘⇧X' },
]

function code(v: Record<string, string>) {
  const size = v.size === 'md' ? ' size="md"' : ''
  const toggles = marks.map((m) => `  <ToolbarToggle icon={<${m.name} />} label="${m.label}" shortcut="${m.shortcut}" />`).join('\n')
  if (v.variant === 'floating')
    return `import { Floating } from '@uisatin/ui/floating'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle } from '@uisatin/ui/toolbar'
import { Bold, Italic, Link, Strikethrough } from 'iconoir-react'

// Over a text selection: Floating points at the selection's rect.
const range = window.getSelection()?.getRangeAt(0)
const anchor = range && { getBoundingClientRect: () => range.getBoundingClientRect() }

<Floating anchor={anchor ?? null}>
  {() => (
    <Toolbar aria-label="Formatting" variant="floating"${size} preventFocusOnPress>
${toggles.replace(/^/gm, '      ')}
      <ToolbarSeparator />
      <ToolbarButton icon={<Link />} label="Link" shortcut="⌘K" />
    </Toolbar>
  )}
</Floating>`
  return `import { DropdownMenu, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@uisatin/ui/dropdown'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle } from '@uisatin/ui/toolbar'
import { Bold, Italic, Link, List, NavArrowDown, NumberedListLeft, Strikethrough } from 'iconoir-react'

<Toolbar aria-label="Formatting"${size}>
  <DropdownMenu
    trigger={
      <ToolbarButton>
        Paragraph
        <NavArrowDown />
      </ToolbarButton>
    }
  >
    <DropdownMenuRadioGroup defaultValue="Paragraph">
${styles.map((s) => `      <DropdownMenuRadioItem value="${s}" label="${s}" />`).join('\n')}
    </DropdownMenuRadioGroup>
  </DropdownMenu>
  <ToolbarSeparator />
${toggles}
  <ToolbarSeparator />
  <ToolbarToggle icon={<List />} label="Bulleted list" />
  <ToolbarToggle icon={<NumberedListLeft />} label="Numbered list" />
  <ToolbarSeparator />
  <ToolbarButton icon={<Link />} label="Link" shortcut="⌘K" />
</Toolbar>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.variant === 'floating' ? 'Floating' : 'Plain', v.size === 'md' ? 'Medium' : 'Small'].join(' · '),
  code: code(v),
}))

function Marks() {
  return marks.map(({ Icon, label, shortcut }) => <ToolbarToggle key={label} icon={<Icon />} label={label} shortcut={shortcut} defaultPressed={label === 'Bold'} />)
}

function TextStyle() {
  const [style, setStyle] = React.useState('Paragraph')
  return (
    <DropdownMenu
      trigger={
        <ToolbarButton>
          {style}
          <NavArrowDown aria-hidden />
        </ToolbarButton>
      }
    >
      <DropdownMenuRadioGroup value={style} onValueChange={setStyle}>
        {styles.map((s) => (
          <DropdownMenuRadioItem key={s} value={s} label={s} />
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenu>
  )
}

export default function ToolbarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Toolbar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => {
        const size = v.size as 'sm' | 'md'
        if (v.variant === 'floating')
          return (
            // A still of the bubble over a selection; in an app Floating places it.
            <div className="flex max-w-80 flex-col items-center gap-2">
              <Toolbar aria-label="Formatting" variant="floating" size={size} preventFocusOnPress>
                <Marks />
                <ToolbarSeparator />
                <ToolbarButton icon={<Link />} label="Link" shortcut="⌘K" />
              </Toolbar>
              <p className="text-center text-sm text-text-muted">
                The offer goes out <span className="rounded-xs bg-action-primary-bg/20 text-text-default">on Monday</span>, after the panel signs off.
              </p>
            </div>
          )
        return (
          <Toolbar aria-label="Formatting" size={size}>
            <TextStyle />
            <ToolbarSeparator />
            <Marks />
            <ToolbarSeparator />
            <ToolbarToggle icon={<List />} label="Bulleted list" />
            <ToolbarToggle icon={<NumberedListLeft />} label="Numbered list" />
            <ToolbarSeparator />
            <ToolbarButton icon={<Link />} label="Link" shortcut="⌘K" />
          </Toolbar>
        )
      }}
    />
  )
}
