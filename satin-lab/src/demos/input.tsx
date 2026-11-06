import { Input } from '@satin/ui/input'
import { Mail, Search, Xmark } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { Input } from '@satin/ui/input'

<Input
  label="Work email"
  placeholder="name@company.com"
  hint="We send the invite link here."
/>`,
  },
  {
    id: 'icons',
    label: 'With icons',
    code: `import { Input } from '@satin/ui/input'
import { Search, Xmark } from 'iconoir-react'

<Input
  aria-label="Search orders"
  placeholder="Search orders"
  leadingIcon={<Search />}
  trailingIcon={<Xmark />}
/>`,
  },
  {
    id: 'error',
    label: 'Error',
    code: `import { Input } from '@satin/ui/input'
import { Mail } from 'iconoir-react'

<Input
  label="Email"
  defaultValue="name@company"
  leadingIcon={<Mail />}
  error="Enter an email address, e.g. name@company.com"
/>`,
  },
  {
    id: 'sizes',
    label: 'Sizes',
    code: `import { Input } from '@satin/ui/input'

<Input size="sm" label="Small" placeholder="Filter" />
<Input size="md" label="Medium" placeholder="Full name" />
<Input size="lg" label="Large" placeholder="Email" />`,
  },
]

export default function InputDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Input"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-80 max-w-full">
          {id === 'default' ? (
            <Input label="Work email" placeholder="name@company.com" hint="We send the invite link here." />
          ) : id === 'icons' ? (
            <Input aria-label="Search orders" placeholder="Search orders" leadingIcon={<Search />} trailingIcon={<Xmark />} />
          ) : id === 'error' ? (
            <Input
              label="Email"
              defaultValue="name@company"
              leadingIcon={<Mail />}
              error="Enter an email address, e.g. name@company.com"
            />
          ) : (
            <div className="grid gap-4">
              <Input size="sm" label="Small" placeholder="Filter" />
              <Input size="md" label="Medium" placeholder="Full name" />
              <Input size="lg" label="Large" placeholder="Email" />
            </div>
          )}
        </div>
      )}
    />
  )
}
