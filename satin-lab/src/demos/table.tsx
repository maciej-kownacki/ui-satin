import { Chip } from '@satin/ui/chip'
import { Table, type Column, type Row } from '@satin/ui/table'
import type { BadgeTone } from '@satin/ui/badge'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

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

const wide: Column<Dish>[] = [
  { key: 'product', header: 'Product name', width: 180, sortable: true },
  { key: 'price', header: 'Price', width: 110, sortable: true },
  { key: 'qty', header: 'Qty', width: 80, sortable: true },
  { key: 'tags', header: 'Category', width: 230, cell: tags },
  { key: 'station', header: 'Station', width: 120 },
  { key: 'prep', header: 'Prep time', width: 120 },
]

const setup = `import { Table, type Column } from '@satin/ui/table'
import { Chip } from '@satin/ui/chip'

const columns: Column<Dish>[] = [
  { key: 'product', header: 'Product name', width: 2, sortable: true },
  { key: 'price', header: 'Price', width: 1, sortable: true },
  { key: 'qty', header: 'Qty', width: 0.8, sortable: true },
  {
    key: 'tags',
    header: 'Category',
    width: 2.2,
    cell: (row) => row.tags.map(([label, tone]) => <Chip key={label} size="sm" tone={tone}>{label}</Chip>),
  },
]`

export const options: ShowcaseOption[] = [
  { id: 'selectable', label: 'Selectable', code: `${setup}\n\nexport function Menu() {\n  return <Table label="Menu items" columns={columns} rows={rows} selectable />\n}` },
  { id: 'zebra', label: 'Zebra', code: `${setup}\n\nexport function Menu() {\n  return <Table label="Menu items" columns={columns} rows={rows} zebra />\n}` },
  {
    id: 'scroll',
    label: 'Scroll',
    code: `${setup.replace(/width: ([\d.]+)/g, (_, w) => `width: ${Math.round(Number(w) * 100)}`)}\n\n// With overflow="scroll", width is in pixels.\nexport function Menu() {\n  return <Table label="Menu items" columns={columns} rows={rows} overflow="scroll" />\n}`,
  },
]

export default function TableDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Table"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-[640px] max-w-full">
          {id === 'selectable' && <Table label="Menu items" columns={columns} rows={rows} selectable defaultSort={{ key: 'product', direction: 'asc' }} />}
          {id === 'zebra' && <Table label="Menu items" columns={columns} rows={rows} zebra />}
          {id === 'scroll' && <Table label="Menu items" columns={wide} rows={rows} overflow="scroll" />}
        </div>
      )}
    />
  )
}
