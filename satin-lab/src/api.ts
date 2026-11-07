/**
 * The API Reference under each component (docs template, uiKit 3874:6357). In `description`,
 * text in backticks renders as a code chip. In `type`, each entry is one chip.
 */
export type ApiProp = { name: string; type: string[]; default?: string }
export type Api = { description: string; props: ApiProp[] }

const tones = ['"neutral"', '"brand"', '"sky"', '"green"', '"amber"', '"red"', '"fuchsia"', '"plum"']

export const api: Record<string, Api> = {
  badge: {
    description: 'The `Badge` component is a `span` that takes a size, a variant, a shape and a tone. Put an icon before the label as a child.',
    props: [
      { name: 'size', type: ['"lg"', '"sm"'], default: '"lg"' },
      { name: 'variant', type: ['"soft"', '"plain"'], default: '"soft"' },
      { name: 'shape', type: ['"default"', '"rounded"'], default: '"default"' },
      { name: 'tone', type: tones, default: '"neutral"' },
      { name: 'children', type: ['ReactNode'], default: '—' },
    ],
  },
  button: {
    description: 'The `Button` component is a wrapper around the `button` element that adds styles, sizes and states.',
    props: [
      { name: 'size', type: ['"xs"', '"md"', '"lg"', '"xl"'], default: '"md"' },
      { name: 'variant', type: ['"primary"', '"secondary"', '"tertiary"', '"inverse"', '"destructive"'], default: '"primary"' },
      { name: 'shape', type: ['"default"', '"rounded"'], default: '"default"' },
      { name: 'iconOnly', type: ['boolean'], default: 'false' },
      { name: 'disabled', type: ['boolean'], default: 'false' },
      { name: 'asChild', type: ['boolean'], default: 'false' },
    ],
  },
  checkbox: {
    description: 'The `Checkbox` component wraps the Radix checkbox. With a `label` it renders a real `label`; a `description` is linked with `aria-describedby`.',
    props: [
      { name: 'placement', type: ['"left"', '"right"'], default: '"left"' },
      { name: 'label', type: ['ReactNode'] },
      { name: 'description', type: ['ReactNode'] },
      { name: 'checked', type: ['boolean', '"indeterminate"'] },
      { name: 'defaultChecked', type: ['boolean'], default: 'false' },
      { name: 'onCheckedChange', type: ['(checked) => void'] },
      { name: 'disabled', type: ['boolean'], default: 'false' },
    ],
  },
  'segmented-control': {
    description: 'The `SegmentedControl` component is a Radix toggle group that always keeps one segment selected.',
    props: [
      { name: 'size', type: ['"xs"', '"md"', '"lg"'], default: '"md"' },
      { name: 'shape', type: ['"default"', '"rounded"'], default: '"default"' },
      { name: 'border', type: ['boolean'], default: 'false' },
      { name: 'fullWidth', type: ['boolean'], default: 'false' },
      { name: 'items', type: ['SegmentedControlItem[]'] },
      { name: 'value', type: ['string'] },
      { name: 'defaultValue', type: ['string'], default: 'first item' },
      { name: 'onValueChange', type: ['(value: string) => void'] },
    ],
  },
  switch: {
    description: 'The `Switch` component wraps the Radix switch, with an optional `label` and `description` on either side.',
    props: [
      { name: 'placement', type: ['"left"', '"right"'], default: '"left"' },
      { name: 'label', type: ['ReactNode'] },
      { name: 'description', type: ['ReactNode'] },
      { name: 'checked', type: ['boolean'] },
      { name: 'defaultChecked', type: ['boolean'], default: 'false' },
      { name: 'onCheckedChange', type: ['(checked: boolean) => void'] },
      { name: 'disabled', type: ['boolean'], default: 'false' },
    ],
  },
}
