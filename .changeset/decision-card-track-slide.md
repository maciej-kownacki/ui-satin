---
'@uisatin/ui': patch
---

DecisionCard steps slide as one horizontal track: the old and the new step sit side by side, 24px apart, and move a card's width together over 360 ms (cubic-bezier(0.22, 1, 0.36, 1)), the one leaving fading out, while each part's box eases to the new height on the same curve. The "1/3" count rolls its changed digit like an odometer (up going forward, down going back, 350 ms); screen readers read the plain count. Under reduced motion the step just changes, with no cross-fade.
