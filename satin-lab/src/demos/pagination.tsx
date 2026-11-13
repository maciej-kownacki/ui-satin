import { Pagination } from '@uisatin/ui/pagination'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'full', label: 'Full' }, { value: 'compact', label: 'Compact' }] },
  { id: 'pages', label: 'Pages', items: [{ value: '5', label: '5' }, { value: '12', label: '12' }, { value: '50', label: '50' }], default: '12' },
  { id: 'motion', label: 'Motion', items: [{ value: 'scroll', label: 'Scroll' }, { value: 'slide', label: 'Slide' }, { value: 'none', label: 'None' }] },
]

function code(v: Record<string, string>) {
  return `import { Pagination } from '@uisatin/ui/pagination'

const [page, setPage] = React.useState(1)

<Pagination pageCount={${v.pages}} page={page} onPageChange={setPage}${v.layout === 'compact' ? ' layout="compact"' : ''}${v.motion !== 'scroll' ? ` motion="${v.motion}"` : ''} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.layout === 'compact' ? 'Compact' : 'Full', `${v.pages} pages`, { slide: 'Slide', scroll: 'Scroll', none: 'No motion' }[v.motion]].join(' · '),
  code: code(v),
}))

export default function PaginationDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Pagination"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        // A fresh one when the size changes; switching Motion keeps the page you are on.
        <Pagination
          key={`${v.layout}-${v.pages}`}
          pageCount={Number(v.pages)}
          defaultPage={Math.min(5, Number(v.pages))}
          layout={v.layout as 'full' | 'compact'}
          motion={v.motion as 'slide' | 'scroll' | 'none'}
        />
      )}
    />
  )
}
