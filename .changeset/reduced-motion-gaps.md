---
'@uisatin/ui': patch
---

Reduced motion now also stops two things it missed. Toaster's viewport carries `data-slot="toast-viewport"`, so its height no longer eases when toasts come and go. Expanding groups (`satin-expand`) open and fold at once wherever the class is used, not only inside a Satin element.
