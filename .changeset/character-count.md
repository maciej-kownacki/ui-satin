---
'@uisatin/ui': minor
---

`CharacterCount`, exported from `@uisatin/ui/textarea`: the counter under Textarea, for a field of your own. With `max` it reads "134/120", with "Characters used:" before it for screen readers, and turns text/destructive once the count is over; without `max` it says "948 characters", the new `characterCount(count, formatted)` label, with the number written in `dateLocale`. Textarea renders its counter through it, so a Textarea's counter is now red too while the text is over `maxLength`.
