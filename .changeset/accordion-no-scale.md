---
"@uisatin/ui": patch
---

Accordion and expanding groups: the content no longer scales while it opens. Chrome drew the scaled text as a bitmap, so it looked heavier until the animation ended, and the Accordion's open item did it on every page load. The section still grows downwards from under its header.
