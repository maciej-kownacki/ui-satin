---
"@uisatin/ui": minor
---

Keyboard focus is now a solid ring that reads at 3:1 or more on every surface, in Light and Dark (WCAG 1.4.11); it used to be the brand colour at 20%, about 1.1–1.4:1. `--sa-action-focus-ring` is solid (blue-600 in Light, #7075FE in Dark, the same as `--sa-border-focus`, which is lighter in Dark), and `themeCss()` works out a Dark focus colour for any brand that holds the same minimum.

- Buttons, checkboxes, radios and switches draw the ring as an outline 2px off the control, so it reads against the page whatever the fill (on a primary button the old ring showed 1px, next to a fill of the same colour).
- Fields (Input, Textarea, Select, Combobox, DatePicker, InputOTP, PromptBar, SearchBar) turn their edge into a 2px line in the focus colour, and in the destructive colour when invalid, where the invalid ring used to be white at 24%.
- A menu row reached with the arrow keys takes the ring inside its edge, in Dropdown, Context menu, Select, Combobox, Command menu, AgentPicker and the PromptBar menus; with the pointer it keeps the plain highlight.
- In forced-colors mode (Windows High Contrast), which drops these rings, whatever has keyboard focus gets an outline in the system highlight colour.
