import { Link } from '@uisatin/ui/link'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'variant', label: 'Variant', items: [{ value: 'default', label: 'Default' }, { value: 'brand', label: 'Brand' }, { value: 'muted', label: 'Muted' }] },
  { id: 'underline', label: 'Underline', items: [{ value: 'auto', label: 'Auto' }, { value: 'always', label: 'Always' }, { value: 'hover', label: 'Hover' }, { value: 'none', label: 'None' }] },
  { id: 'external', label: 'External', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const attrs = [
    v.variant !== 'default' && `variant="${v.variant}"`,
    v.underline !== 'auto' && `underline="${v.underline}"`,
    v.external === 'on' ? 'href="https://github.com/maciej-kownacki/ui-satin" target="_blank"' : 'href="/docs/theming"',
  ].filter(Boolean)
  return `import { Link } from '@uisatin/ui/link'

<p>
  Set the brand and the corners once, see the <Link ${attrs.join(' ')}>${v.external === 'on' ? 'source on GitHub' : 'theming guide'}</Link>.
</p>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

export default function LinkDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Link"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <p className="max-w-[400px] text-center text-base text-text-muted">
          Set the brand and the corners once, see the{' '}
          <Link
            variant={v.variant as 'default'}
            underline={v.underline === 'auto' ? undefined : (v.underline as 'always')}
            href={v.external === 'on' ? 'https://github.com/maciej-kownacki/ui-satin' : '#'}
            target={v.external === 'on' ? '_blank' : undefined}
          >
            {v.external === 'on' ? 'source on GitHub' : 'theming guide'}
          </Link>
          .
        </p>
      )}
    />
  )
}
