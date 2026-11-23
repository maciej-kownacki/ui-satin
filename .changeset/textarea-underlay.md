---
'@uisatin/ui': minor
---

Textarea: `onChange` gets the change event after the text, `(value, event)`, for code that needs the caret or the input method's state; the old one-argument handlers still work. New `underlay`, drawn under the text inside the field and not clipped: pass `usePromptMentions().overlay` with its `textareaProps` on the field and a Satin Textarea takes @mentions as PromptBar does. With an underlay the field's fill moves to an `aria-hidden` layer of its own (`data-slot="textarea-fill"`, bg/field, bg/muted when disabled) under it and the textarea turns transparent; border, hover, focus ring, error and shadow stay on the textarea. Without one the markup is unchanged. usePromptMentions now also re-measures its token layer when the textarea is resized (the grip dragged, the box narrowed), not only when it renders.
