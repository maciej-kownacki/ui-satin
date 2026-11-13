import { Chip } from '@uisatin/ui/chip'
import { Table, type Column, type Row } from '@uisatin/ui/table'
import type { BadgeTone } from '@uisatin/ui/badge'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Dish = Row & { product: string; price: string; qty: number; tags: [string, BadgeTone][]; station: string; prep: string }

const rows: Dish[] = [
  { id: '1', product: 'Cheeseburger', price: '€24.95', qty: 3, tags: [['Gluten-free', 'brand'], ['Lactose', 'fuchsia']], station: 'Grill', prep: '12 min' },
  { id: '2', product: 'Veggie Wrap', price: '€19.50', qty: 5, tags: [['Vegan', 'green'], ['Nut-free', 'plum']], station: 'Cold', prep: '6 min' },
  { id: '3', product: 'Grilled Salmon', price: '€29.00', qty: 2, tags: [['Pescatarian', 'amber'], ['Gluten-free', 'brand']], station: 'Grill', prep: '18 min' },
  { id: '4', product: 'Caesar Salad', price: '€14.00', qty: 4, tags: [['Vegetarian', 'green'], ['Lactose', 'fuchsia']], station: 'Cold', prep: '5 min' },
  { id: '5', product: 'Pad Thai', price: '€17.50', qty: 1, tags: [['Spicy', 'red'], ['Nut-free', 'plum']], station: 'Wok', prep: '9 min' },
]

const tags = (row: Dish) =>
  row.tags.map(([label, tone]) => (
    <Chip key={label} size="sm" tone={tone} tabIndex={-1} className="pointer-events-none">
      {label}
    </Chip>
  ))

const columns: Column<Dish>[] = [
  { key: 'product', header: 'Product name', width: 2, sortable: true },
  { key: 'price', header: 'Price', width: 1, sortable: true },
  { key: 'qty', header: 'Qty', width: 0.8, sortable: true },
  { key: 'tags', header: 'Category', width: 2.2, cell: tags },
]

// With overflow="scroll" widths are pixels, and two more columns make it overflow.
const wide: Column<Dish>[] = [
  { key: 'product', header: 'Product name', width: 180, sortable: true },
  { key: 'price', header: 'Price', width: 110, sortable: true },
  { key: 'qty', header: 'Qty', width: 80, sortable: true },
  { key: 'tags', header: 'Category', width: 230, cell: tags },
  { key: 'station', header: 'Station', width: 120 },
  { key: 'prep', header: 'Prep time', width: 120 },
]

// Overflow decides how columns are measured, so it comes first; selection and zebra are
// row treatments on top of either.
export const controls: ShowcaseControl[] = [
  { id: 'overflow', label: 'Overflow', items: [{ value: 'fit', label: 'Fit' }, { value: 'scroll', label: 'Scroll' }] },
  { id: 'selectable', label: 'Selectable', type: 'switch', default: 'on' },
  { id: 'zebra', label: 'Zebra', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const scroll = v.overflow === 'scroll'
  const cols = (scroll ? wide : columns)
    .map((c) => {
      const base = `key: '${c.key}', header: '${c.header}', width: ${c.width}${c.sortable ? ', sortable: true' : ''}`
      return c.cell
        ? `  {\n    ${base.replace(/, /g, ',\n    ')},\n    cell: (row) => row.tags.map(([label, tone]) => <Chip key={label} size="sm" tone={tone}>{label}</Chip>),\n  },`
        : `  { ${base} },`
    })
    .join('\n')
  const attrs = [scroll && ' overflow="scroll"', v.selectable === 'on' && ' selectable', v.zebra === 'on' && ' zebra']
    .filter(Boolean)
    .join('')
  return `import { Table, type Column } from '@uisatin/ui/table'
import { Chip } from '@uisatin/ui/chip'
${scroll ? '\n// With overflow="scroll", width is in pixels.' : ''}
const columns: Column<Dish>[] = [
${cols}
]

export function Menu() {
  return <Table label="Menu items" columns={columns} rows={rows}${attrs} />
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.overflow === 'scroll' ? 'Scroll' : 'Fit', v.selectable === 'on' ? 'Selectable' : 'Not selectable', v.zebra === 'on' ? 'Zebra' : 'No zebra'].join(' · '),
  code: code(v),
}))

export default function TableDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Table"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <div className="w-[640px] max-w-full">
          <Table
            key={id}
            label="Menu items"
            columns={v.overflow === 'scroll' ? wide : columns}
            rows={rows}
            overflow={v.overflow as 'fit' | 'scroll'}
            selectable={v.selectable === 'on'}
            zebra={v.zebra === 'on'}
          />
        </div>
      )}
    />
  )
}
