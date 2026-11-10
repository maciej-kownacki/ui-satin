import { Pagination } from '@satin/ui/pagination'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'full', label: 'Full' }, { value: 'compact', label: 'Compact' }] },
  { id: 'pages', label: 'Pages', items: [{ value: '5', label: '5' }, { value: '12', label: '12' }, { value: '50', label: '50' }], default: '12' },
]

function code(v: Record<string, string>) {
  return `import { Pagination } from '@satin/ui/pagination'

const [page, setPage] = React.useState(1)

<Pagination pageCount={${v.pages}} page={page} onPageChange={setPage}${v.layout === 'compact' ? ' layout="compact"' : ''} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.layout === 'compact' ? 'Compact' : 'Full', `${v.pages} pages`].join(' · '),
  code: code(v),
}))

export default function PaginationDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Pagination"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <Pagination key={id} pageCount={Number(v.pages)} defaultPage={Math.min(5, Number(v.pages))} layout={v.layout as 'full' | 'compact'} />
      )}
    />
  )
}
