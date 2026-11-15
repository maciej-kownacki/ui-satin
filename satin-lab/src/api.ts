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
      { name: 'loading', type: ['boolean'], default: 'false' },
    ],
  },
  'button-group': {
    description: 'The `ButtonGroup` component is a `div` with `role="group"` that joins the Buttons inside into one block and hands them a variant, size and shape. `ButtonGroupSeparator` divides a loose group.',
    props: [
      { name: 'orientation', type: ['"horizontal"', '"vertical"'], default: '"horizontal"' },
      { name: 'attached', type: ['boolean'], default: 'true' },
      { name: 'variant', type: ['"primary"', '"secondary"', '"tertiary"', '"inverse"', '"destructive"'] },
      { name: 'size', type: ['"xs"', '"md"', '"lg"', '"xl"'] },
      { name: 'shape', type: ['"default"', '"rounded"'] },
      { name: 'aria-label', type: ['string'] },
    ],
  },
  'split-button': {
    description: 'The `SplitButton` component is an attached ButtonGroup of the main Button and an arrow that opens a DropdownMenu of related actions. It takes every Button prop.',
    props: [
      { name: 'menu', type: ['ReactNode'] },
      { name: 'variant', type: ['"primary"', '"secondary"', '"tertiary"', '"inverse"', '"destructive"'], default: '"primary"' },
      { name: 'size', type: ['"xs"', '"md"', '"lg"', '"xl"'], default: '"md"' },
      { name: 'shape', type: ['"default"', '"rounded"'], default: '"default"' },
      { name: 'disabled', type: ['boolean'], default: 'false' },
      { name: 'menuLabel', type: ['string'], default: '"More options"' },
      { name: 'menuProps', type: ['DropdownMenuProps'] },
    ],
  },
  form: {
    description: 'The `Form` component is a wrapper around the `form` element that lays out FormFields, FieldGroups, `FormSection`s and `FormActions`, gives them one layout, hands each its error by `name` and focuses the first invalid control after a submit.',
    props: [
      { name: 'layout', type: ['"vertical"', '"horizontal"'], default: '"vertical"' },
      { name: 'errors', type: ['Record<string, ReactNode>'] },
      { name: 'disabled', type: ['boolean'], default: 'false' },
      { name: 'onSubmitValues', type: ['(values, event) => void'] },
      { name: 'noValidate', type: ['boolean'], default: 'true' },
    ],
  },
  'field-group': {
    description: 'The `FieldGroup` component is a `fieldset` with a legend, a description and one error for fields or options that answer one question.',
    props: [
      { name: 'legend', type: ['ReactNode'] },
      { name: 'variant', type: ['"fields"', '"choices"'], default: '"fields"' },
      { name: 'columns', type: ['1', '2', '3'], default: '1' },
      { name: 'layout', type: ['"vertical"', '"horizontal"'], default: '"vertical"' },
      { name: 'description', type: ['ReactNode'] },
      { name: 'error', type: ['ReactNode'] },
      { name: 'name', type: ['string'] },
      { name: 'required', type: ['boolean'], default: 'false' },
      { name: 'disabled', type: ['boolean'], default: 'false' },
    ],
  },
  'action-button': {
    description: 'The `ActionButton` component is a Button that runs `onAction` and shows its state in place: the label with an arrow, a spinner until the promise settles, then a checkmark. It takes every Button prop.',
    props: [
      { name: 'onAction', type: ['(event) => Promise<unknown>'] },
      { name: 'variant', type: ['"primary"', '"secondary"', '"tertiary"', '"inverse"', '"destructive"'], default: '"primary"' },
      { name: 'size', type: ['"xs"', '"md"', '"lg"', '"xl"'], default: '"md"' },
      { name: 'minLoading', type: ['number'], default: '900' },
      { name: 'resetAfter', type: ['number', 'null'], default: '1800' },
      { name: 'trailingIcon', type: ['ReactNode', 'null'], default: 'arrow' },
      { name: 'state', type: ['"idle"', '"loading"', '"success"'] },
      { name: 'onStateChange', type: ['(state) => void'] },
      { name: 'onError', type: ['(error) => void'] },
    ],
  },
  'selectable-radio': {
    description: 'The `SelectableRadio` component is a radio item of a `RadioGroup` drawn as a whole card, with no circle: the card is the radio and the selected one takes the primary border.',
    props: [
      { name: 'value', type: ['string'] },
      { name: 'title', type: ['ReactNode'] },
      { name: 'description', type: ['ReactNode'] },
      { name: 'icon', type: ['ReactNode'] },
      { name: 'size', type: ['"sm"', '"md"'], default: '"md"' },
      { name: 'disabled', type: ['boolean'], default: 'false' },
    ],
  },
  'selectable-checkbox': {
    description: 'The `SelectableCheckbox` component is a Checkbox inside a card that is its `label`, the box at the right edge. The whole card toggles it.',
    props: [
      { name: 'checked', type: ['boolean', '"indeterminate"'] },
      { name: 'defaultChecked', type: ['boolean'] },
      { name: 'onCheckedChange', type: ['(checked) => void'] },
      { name: 'title', type: ['ReactNode'] },
      { name: 'description', type: ['ReactNode'] },
      { name: 'icon', type: ['ReactNode'] },
      { name: 'size', type: ['"sm"', '"md"'], default: '"md"' },
      { name: 'disabled', type: ['boolean'], default: 'false' },
    ],
  },
  alert: {
    description: 'The `Alert` component is a `div` with `role="alert"` (errors and warnings) or `role="status"` that shows a status icon, a title, a description, an action and a close button.',
    props: [
      { name: 'intent', type: ['"neutral"', '"info"', '"success"', '"warning"', '"error"'], default: '"neutral"' },
      { name: 'variant', type: ['"soft"', '"outline"'], default: '"soft"' },
      { name: 'title', type: ['ReactNode'] },
      { name: 'description', type: ['ReactNode'] },
      { name: 'icon', type: ['boolean', 'ReactNode'], default: 'true' },
      { name: 'action', type: ['ReactNode'] },
      { name: 'onDismiss', type: ['() => void'] },
    ],
  },
  spinner: {
    description: 'The `Spinner` component is a `span` with `role="status"` around a turning arc in the current colour. With `label={null}` it is hidden from screen readers.',
    props: [
      { name: 'size', type: ['"xs"', '"sm"', '"md"', '"lg"'], default: '"md"' },
      { name: 'label', type: ['string', 'null'], default: '"Loading"' },
    ],
  },
  separator: {
    description: 'The `Separator` component is a 1px rule. It is decorative unless `decorative={false}`, which makes it a `role="separator"`.',
    props: [
      { name: 'orientation', type: ['"horizontal"', '"vertical"'], default: '"horizontal"' },
      { name: 'label', type: ['ReactNode'] },
      { name: 'decorative', type: ['boolean'], default: 'true' },
    ],
  },
  link: {
    description: 'The `Link` component is a wrapper around the `a` element. External links get an arrow, a screen-reader note and `rel="noopener noreferrer"`; `asChild` styles a router link.',
    props: [
      { name: 'variant', type: ['"default"', '"brand"', '"muted"'], default: '"default"' },
      { name: 'underline', type: ['"always"', '"hover"', '"none"'], default: '"always" ("hover" when muted)' },
      { name: 'external', type: ['boolean'], default: 'target === "_blank"' },
      { name: 'asChild', type: ['boolean'], default: 'false' },
    ],
  },
  'input-group': {
    description: 'The `InputGroup` component is a `div` with `role="group"` that joins Inputs, Selects, Buttons and `InputGroupAddon`s into one block of one height.',
    props: [{ name: 'size', type: ['"sm"', '"md"', '"lg"'], default: '"md"' }],
  },
  'password-input': {
    description: 'The `PasswordInput` component is an Input of type password with a show and hide button. It takes every Input prop.',
    props: [
      { name: 'size', type: ['"sm"', '"md"', '"lg"'], default: '"md"' },
      { name: 'visible', type: ['boolean'] },
      { name: 'onVisibleChange', type: ['(visible: boolean) => void'] },
      { name: 'autoComplete', type: ['string'], default: '"current-password"' },
    ],
  },
  list: {
    description: 'The `List` component is a `ul` of `Item`s. An `Item` is one row: an icon or media, a title and description, meta and actions; with `href` or `onClick` the whole row is its target.',
    props: [
      { name: 'variant', type: ['"plain"', '"divided"', '"card"'], default: '"plain"' },
      { name: 'size', type: ['"sm"', '"md"'], default: '"md"' },
      { name: 'Item.title', type: ['ReactNode'] },
      { name: 'Item.description', type: ['ReactNode'] },
      { name: 'Item.icon / media', type: ['ReactNode'] },
      { name: 'Item.meta / actions', type: ['ReactNode'] },
      { name: 'Item.href / onClick', type: ['string', '() => void'] },
      { name: 'Item.selected', type: ['boolean'], default: 'false' },
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
