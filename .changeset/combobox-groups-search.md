---
'@uisatin/ui': minor
---

Combobox takes titled groups (`options={[{ label, options }]}`, as Select does): each is a `group` named by its header, and a group the query empties is left out. For a list the app searches itself: `filter={false}` lists `options` as given (or pass your own `(option, query) => boolean`), `onQueryChange` gets the query, `loading` puts a Spinner in the search row and marks the list `aria-busy` (with `loadingText` while nothing is listed), and `selectedOptions` keeps the chips of picks the current results don't hold. `renderOption` draws a row's content and `renderValue` the picks in the field. Clear now gives focus back to the field instead of dropping it, and "No results" sits outside the listbox in a `status` region, so screen readers hear it and the empty list no longer fails axe's required-children rule.
