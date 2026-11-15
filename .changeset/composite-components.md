---
"@uisatin/ui": minor
---

New components built from the ones Satin already has:

- Buttons: `ButtonGroup` (attached or spaced, with `ButtonGroupSeparator`), `SplitButton`, `ActionButton` (arrow, spinner, checkmark in one slot), and `loading` on `Button`.
- Forms: `Form` (one layout, errors by `name`, focus on the first invalid field, `onSubmitValues`), `FormSection`, `FormActions`, `FieldGroup`, `InputGroup` with `InputGroupAddon`, `PasswordInput`, `leadingText` / `trailingText` on `Input`, and `name` on `FormField`.
- Choices: `SelectableRadio` and `SelectableCheckbox`, in `sm` and `md`.
- Feedback and content: `Alert`, `Spinner`, `Separator`, `Link`, `List` with `Item`.

Fixes: `cn` now knows Satin's theme names (`text-body`, `rounded-pill`, `h-control-height`…), so `text-body` is no longer dropped next to a text colour (Banner descriptions, StreamingText and table cells take the theme's body size again) and app classes replace them as they should. Checkbox and Radio texts dim inside a disabled fieldset.
