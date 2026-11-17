---
'@uisatin/ui': patch
---

No keyboard focus ring after a mouse click on a tab, a menu row or a menu's trigger. Radix focuses these from script on a pointer press (Tabs on mousedown, menus on hover and when they close), which Chrome shows as `:focus-visible`. Satin now notes a pointer press on `<html>` (`data-satin-pointer`, cleared by the next key) and draws no ring on them until a key is pressed; Tab and the arrow keys show it as before.
