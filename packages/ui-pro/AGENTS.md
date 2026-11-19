# Using @uisatin/pro (for coding agents)

Satin Pro adds larger components and AI patterns to Satin Free (`@uisatin/ui`). Every rule in `@uisatin/ui`'s AGENTS.md applies; these are the additions.

- Install both at the same version: `npm i @uisatin/ui @uisatin/pro`. Pro's stylesheet only holds what Free's doesn't, so it never works alone.
- Import `@uisatin/ui/styles.css`, then `@uisatin/pro/styles.css`, once, at the root of the app.
- Import each Pro component from its own entry: `import { BulkActionBar } from '@uisatin/pro/bulk-action-bar'`. Free components still come from `@uisatin/ui/<name>`.
- Translate Pro's built-in words with the same `SatinLabels` from `@uisatin/ui/labels`; its `labels` prop takes Pro's keys too.
- Docs pages of Pro components carry a Pro badge, and their markdown twins (`https://uisatin.dev/components/<name>.md`) say `Edition: Pro`.
