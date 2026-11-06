import * as React from 'react'
import { Sources, type Source } from '@satin/ui/sources'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const sources: Source[] = [
  { title: 'Annual plan pricing', url: 'https://stripe.com/pricing' },
  { title: 'Why customers churn', url: 'https://hbr.org/2025/churn' },
  { title: 'Q3 board update', url: 'https://notion.so/acme/q3' },
  { title: 'Retention benchmarks 2026', url: 'https://www.paddle.com/blog/retention' },
  { title: 'Pricing page experiments', url: 'https://posthog.com/blog/pricing' },
]

const sourcesCode = `const sources = [
  { title: 'Annual plan pricing', url: 'https://stripe.com/pricing' },
  { title: 'Why customers churn', url: 'https://hbr.org/2025/churn' },
  { title: 'Q3 board update', url: 'https://notion.so/acme/q3' },
]`

export const options: ShowcaseOption[] = [
  {
    id: 'card',
    label: 'Card',
    code: `import { Sources } from '@satin/ui/sources'

${sourcesCode}

<Sources sources={sources} />`,
  },
  {
    id: 'chips',
    label: 'Chips',
    code: `import { Sources } from '@satin/ui/sources'

<p>Annual plans now make up 41% of new revenue, and churn on those accounts is half that of monthly plans.</p>
<Sources variant="chips" maxVisible={2} sources={sources} />`,
  },
]

export default function SourcesDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Sources"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'chips' ? (
          <div className="flex w-[min(440px,calc(100vw-80px))] flex-col gap-3">
            <p className="text-sm text-text-default">
              Annual plans now make up 41% of new revenue, and churn on those accounts is half that of monthly plans.
            </p>
            <Sources variant="chips" maxVisible={2} sources={sources} />
          </div>
        ) : (
          <Sources sources={sources.slice(0, 3)} className="w-[min(440px,calc(100vw-80px))]" />
        )
      }
    />
  )
}
