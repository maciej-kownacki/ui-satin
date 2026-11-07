import { Sources, type Source } from '@satin/ui/sources'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const sources: Source[] = [
  { title: 'Annual plan pricing', url: 'https://stripe.com/pricing' },
  { title: 'Why customers churn', url: 'https://hbr.org/2025/churn' },
  { title: 'Q3 board update', url: 'https://notion.so/acme/q3' },
  { title: 'Retention benchmarks 2026', url: 'https://www.paddle.com/blog/retention' },
  { title: 'Pricing page experiments', url: 'https://posthog.com/blog/pricing' },
]

const answer = 'Annual plans now make up 41% of new revenue, and churn on those accounts is half that of monthly plans.'

// Card or chips is the layout, so it leads; size is the chip height (the card ignores it).
// Max visible is how many show before the rest fold into "+N".
export const controls: ShowcaseControl[] = [
  { id: 'variant', label: 'Variant', items: [{ value: 'card', label: 'Card' }, { value: 'chips', label: 'Chips' }] },
  { id: 'size', label: 'Size', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }] },
  {
    id: 'max',
    label: 'Max visible',
    default: '3',
    items: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '5', label: 'All' }],
  },
]

function code(v: Record<string, string>) {
  const chips = v.variant === 'chips'
  const attrs = [
    chips && ' variant="chips"',
    chips && v.size !== 'sm' && ` size="${v.size}"`,
    v.max !== '3' && ` maxVisible={${v.max}}`,
  ]
    .filter(Boolean)
    .join('')
  const list = sources.map((s) => `  { title: '${s.title}', url: '${s.url}' },`).join('\n')
  return `import { Sources } from '@satin/ui/sources'

const sources = [
${list}
]

${chips ? `<p>${answer}</p>\n` : ''}<Sources${attrs} sources={sources} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.variant === 'chips' ? 'Chips' : 'Card', v.size === 'md' ? 'Medium' : 'Small', v.max === '5' ? 'All visible' : `${v.max} visible`].join(' · '),
  code: code(v),
}))

export default function SourcesDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Sources"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => {
        const props = { sources, size: v.size as 'sm' | 'md', maxVisible: Number(v.max) }
        return v.variant === 'chips' ? (
          <div className="flex w-[min(440px,calc(100vw-80px))] flex-col gap-3">
            <p className="text-sm text-text-default">{answer}</p>
            <Sources key={id} variant="chips" {...props} />
          </div>
        ) : (
          // Keyed so a card expanded with "+N" folds again when the controls change.
          <Sources key={id} {...props} className="w-[min(440px,calc(100vw-80px))]" />
        )
      }}
    />
  )
}
