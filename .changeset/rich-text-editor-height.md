---
'@uisatin/pro': patch
---

Rich text editor: the editable area is 178px tall at least (180px with the field's edges, about 216px with the toolbar), up from 96px, so a note of a few paragraphs fits without scrolling. The resize grip still makes it taller; an app that wants another height sets it on `[data-slot="rich-text-editor-content"]`.
