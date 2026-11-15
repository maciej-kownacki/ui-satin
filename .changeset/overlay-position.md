---
"@uisatin/ui": patch
---

Dialog, Sheet and Command menu open over the page again when installed from npm or the registry. Their `fixed` (or, inside a `container`, `absolute`) class sat in a variable the build didn't recognise as classes, so it shipped without the `sa:` prefix and matched nothing: the panel landed at the end of the page instead of centred over it. The build now prefixes every variable the source passes to `cn()` or `className`.
