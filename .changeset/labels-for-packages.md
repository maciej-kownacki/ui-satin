---
'@uisatin/ui': minor
---

`SatinLabelSet` is an interface, so a package built on Satin (Satin Pro) adds its own words to it and one `SatinLabels` translates them all. A toast action's `label` and `altText` can be functions of the labels in effect under the Toaster (`(labels) => labels.cancel`), so code that calls `toast()` outside React still speaks the app's language. New type `ToastText`.
