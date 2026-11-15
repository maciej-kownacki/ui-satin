---
"@uisatin/ui": patch
---

SelectableRadio and SelectableCheckbox (`md`) set their text like Radio and Checkbox: a 14/20 medium title over a 14/20 muted description, where the title used to sit on an 18px line and the description took the theme's body size. The two lines sit flush, so the text stays 40px next to the 40px icon tile, and the checkbox sits on the middle of the 20px title line. `sm` keeps its compact 13/18.
