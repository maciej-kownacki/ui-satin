---
'@uisatin/ui': minor
---

PromptBar takes `mentions` (`{ trigger, search(query) }`) and `commands` (`[{ name, description, icon, run }]`): `@` and `/` open a menu above the bar, and a pick goes into the text as a token ("@Tara Mendes", "/schedule"), set in medium like the menu's labels, that the caret steps over and Backspace removes whole. `value` and `defaultValue` also take a `PromptValue` (`{ text, mentions, command }`), which `onValueChange` and `onSubmit` now pass as an extra argument; a message whose command has `run` goes to `run` with its arguments. No menu opens while an input method composes. New entry `@uisatin/ui/prompt-mentions` (`usePromptMentions`, `promptValue`, the types) and labels `mentions`, `suggestionsCount`, `tokenAdded`, `tokenRemoved`. PromptBar without the new props is unchanged.
