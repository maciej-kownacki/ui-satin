---
'@uisatin/ui': patch
---

Two component tokens for Satin Pro's Reviewable changes: `--component-changes-review-card-bg` (zinc-50 in Light, the popover fill in Dark) for each change's card, and `--component-changes-review-source-bg` (bg/card in Light, bg/muted in Dark) for the source preview inside it. `npm run tokens` no longer stops on a theme token without a Dark value; it keeps the Light one, as theme.css already did.
