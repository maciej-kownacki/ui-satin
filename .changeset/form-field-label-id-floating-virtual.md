---
'@uisatin/ui': patch
---

FormField: the label has an id (`${id}-label`), in the field's context as `labelId`, so a control that isn't natively labelable (a contenteditable box) can name itself with `aria-labelledby`; clicking the label focuses that control, as `for` does for an input. Floating: `anchor` also takes a virtual element (`FloatingVirtualElement`: `getBoundingClientRect()`, optional `getClientRects()` and `contextElement`), such as a text selection's rect; pass a new object when the rect moves, and set `contextElement` so scrolling moves the layer with it.
