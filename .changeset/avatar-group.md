---
"@uisatin/ui": minor
---

AvatarGroup: avatars side by side share one name tooltip. The first name still waits 400 ms; after that, moving to the next person slides the tooltip over to them and eases its width to the new name, instead of closing one tooltip and opening another. It closes 150 ms after the pointer leaves the row, so the gaps between faces don't close it. Focus shows it at once; Escape and blur hide it.
