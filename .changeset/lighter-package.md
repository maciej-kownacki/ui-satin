---
"@uisatin/ui": patch
---

Banner and AnnouncementBar weigh about 22 kB gzipped instead of 150: their mesh glows ship at a quarter of Figma's 2× export and the browser scales them up, which, composited, differs from the full-size renders by under 1/255 on average. CI now holds Button, Banner, Dialog and the stylesheet to size budgets. The published types no longer carry the Figma node ids from the source comments. The package ships an `AGENTS.md` with the rules for coding agents that use it. The font tokens also name "Geist Variable" and "Geist Mono Variable", the families `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` register, so importing those packages is enough; before, Satin fell back to the system font.
