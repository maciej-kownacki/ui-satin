import { Radio, RadioGroup } from '@satin/ui/radio'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'description',
    label: 'Description',
    code: `import { Radio, RadioGroup } from '@satin/ui/radio'

<RadioGroup defaultValue="weekly" aria-label="Email digest">
  <Radio value="daily" label="Daily" description="A summary every morning at 9:00." />
  <Radio value="weekly" label="Weekly" description="One digest every Monday." />
  <Radio value="never" label="Never" description="Only urgent alerts." />
</RadioGroup>`,
  },
  {
    id: 'placement',
    label: 'Placement',
    code: `import { Radio, RadioGroup } from '@satin/ui/radio'

<RadioGroup defaultValue="left" aria-label="Placement">
  <Radio value="left" label="Radio on the left" />
  <Radio value="right" label="Radio on the right" placement="right" />
</RadioGroup>`,
  },
  {
    id: 'disabled',
    label: 'Disabled option',
    code: `import { Radio, RadioGroup } from '@satin/ui/radio'

<RadioGroup defaultValue="public" aria-label="Visibility">
  <Radio value="public" label="Public" description="Anyone in the workspace can view." />
  <Radio value="private" label="Private" description="Only people you invite." />
  <Radio value="link" label="Anyone with the link" description="Available on the Team plan." disabled />
</RadioGroup>`,
  },
]

export default function RadioDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Radio"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'description' ? (
          <RadioGroup defaultValue="weekly" aria-label="Email digest">
            <Radio value="daily" label="Daily" description="A summary every morning at 9:00." />
            <Radio value="weekly" label="Weekly" description="One digest every Monday." />
            <Radio value="never" label="Never" description="Only urgent alerts." />
          </RadioGroup>
        ) : id === 'placement' ? (
          <RadioGroup defaultValue="left" aria-label="Placement" className="w-60">
            <Radio value="left" label="Radio on the left" />
            <Radio value="right" label="Radio on the right" placement="right" />
          </RadioGroup>
        ) : (
          <RadioGroup defaultValue="public" aria-label="Visibility">
            <Radio value="public" label="Public" description="Anyone in the workspace can view." />
            <Radio value="private" label="Private" description="Only people you invite." />
            <Radio value="link" label="Anyone with the link" description="Available on the Team plan." disabled />
          </RadioGroup>
        )
      }
    />
  )
}
