---
'@uisatin/ui': patch
---

Dialog opens with more motion: the panel rises 12px and settles from 0.98 as it fades in over 300 ms (new `--duration-slower` token), and the scrim fades in with it instead of appearing at once. Closing plays the same way in 200 ms instead of cutting.
