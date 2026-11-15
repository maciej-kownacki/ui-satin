import { Button } from '@uisatin/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@uisatin/ui/button-group'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, NavArrowLeft, NavArrowRight, Underline } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Content first (what the group is for), then the look every button takes from the group,
// then how they're joined.
export const controls: ShowcaseControl[] = [
  {
    id: 'content',
    label: 'Example',
    type: 'menu',
    items: [
      { value: 'views', label: 'Views' },
      { value: 'icons', label: 'Toolbar' },
      { value: 'pager', label: 'Previous / Next' },
    ],
  },
  {
    id: 'variant',
    label: 'Variant',
    default: 'secondary',
    items: [
      { value: 'secondary', label: 'Secondary' },
      { value: 'tertiary', label: 'Tertiary' },
      { value: 'primary', label: 'Primary' },
    ],
  },
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'xs', label: 'XS' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }] },
  { id: 'orientation', label: 'Orientation', items: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
  { id: 'attached', label: 'Attached', type: 'switch', default: 'on' },
]

const views = ['Day', 'Week', 'Month']
const align = [
  { Icon: AlignLeft, name: 'AlignLeft', label: 'Align left' },
  { Icon: AlignCenter, name: 'AlignCenter', label: 'Align center' },
  { Icon: AlignRight, name: 'AlignRight', label: 'Align right' },
  { Icon: AlignJustify, name: 'AlignJustify', label: 'Justify' },
]
const marks = [
  { Icon: Bold, name: 'Bold', label: 'Bold' },
  { Icon: Italic, name: 'Italic', label: 'Italic' },
  { Icon: Underline, name: 'Underline', label: 'Underline' },
]

function code(v: Record<string, string>) {
  const attrs = [
    v.orientation === 'vertical' && 'orientation="vertical"',
    v.attached === 'off' && 'attached={false}',
    `variant="${v.variant}"`,
    v.size !== 'md' && `size="${v.size}"`,
  ].filter(Boolean)
  const open = (label: string) => `<ButtonGroup aria-label="${label}" ${attrs.join(' ')}>`
  if (v.content === 'views')
    return `import { Button } from '@uisatin/ui/button'
import { ButtonGroup } from '@uisatin/ui/button-group'

${open('View')}
${views.map((d) => `  <Button>${d}</Button>`).join('\n')}
</ButtonGroup>`
  if (v.content === 'pager')
    return `import { Button } from '@uisatin/ui/button'
import { ButtonGroup } from '@uisatin/ui/button-group'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'

${open('Pages')}
  <Button><NavArrowLeft />Previous</Button>
  <Button>Next<NavArrowRight /></Button>
</ButtonGroup>`
  const icons = (list: typeof align) => list.map((b) => `  <Button iconOnly aria-label="${b.label}"><${b.name} /></Button>`).join('\n')
  // A loose toolbar gets a separator between its two sets; an attached one is two groups.
  const body =
    v.attached === 'off'
      ? `${open('Formatting')}
${icons(marks)}
  <ButtonGroupSeparator />
${icons(align)}
</ButtonGroup>`
      : `<div className="flex gap-2">
  ${open('Text style')}
${icons(marks).replace(/^/gm, '  ')}
  </ButtonGroup>
  ${open('Alignment')}
${icons(align).replace(/^/gm, '  ')}
  </ButtonGroup>
</div>`
  return `import { Button } from '@uisatin/ui/button'
import { ButtonGroup${v.attached === 'off' ? ', ButtonGroupSeparator' : ''} } from '@uisatin/ui/button-group'
import { ${[...marks, ...align].map((b) => b.name).join(', ')} } from 'iconoir-react'

${body}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.content, v.variant, v.size, v.orientation, v.attached === 'on' ? 'Attached' : 'Spaced'].join(' · '),
  code: code(v),
}))

type Size = 'xs' | 'md' | 'lg' | 'xl'
type Variant = 'primary' | 'secondary' | 'tertiary'

export default function ButtonGroupDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Button group"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => {
        const props = {
          variant: v.variant as Variant,
          size: v.size as Size,
          orientation: v.orientation as 'horizontal' | 'vertical',
          attached: v.attached === 'on',
        }
        const icons = (list: typeof align) =>
          list.map(({ Icon, label }) => (
            <Button key={label} iconOnly aria-label={label}>
              <Icon aria-hidden />
            </Button>
          ))
        if (v.content === 'views')
          return (
            <ButtonGroup aria-label="View" {...props}>
              {views.map((d) => (
                <Button key={d}>{d}</Button>
              ))}
            </ButtonGroup>
          )
        if (v.content === 'pager')
          return (
            <ButtonGroup aria-label="Pages" {...props}>
              <Button>
                <NavArrowLeft aria-hidden />
                Previous
              </Button>
              <Button>
                Next
                <NavArrowRight aria-hidden />
              </Button>
            </ButtonGroup>
          )
        if (!props.attached)
          return (
            <ButtonGroup aria-label="Formatting" {...props}>
              {icons(marks)}
              <ButtonGroupSeparator />
              {icons(align)}
            </ButtonGroup>
          )
        return (
          <div className={props.orientation === 'vertical' ? 'flex gap-2' : 'flex flex-wrap justify-center gap-2'}>
            <ButtonGroup aria-label="Text style" {...props}>
              {icons(marks)}
            </ButtonGroup>
            <ButtonGroup aria-label="Alignment" {...props}>
              {icons(align)}
            </ButtonGroup>
          </div>
        )
      }}
    />
  )
}
