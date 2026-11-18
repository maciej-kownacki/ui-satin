---
"@uisatin/ui": patch
---

`themeVars()` and `themeCss()` from the package give real values for `--sa-color-blue-500-a20` and `--sa-color-blue-600-a20` with a custom brand. In 0.7.0 both came out as `undefined33`, so the selected Decision card chip lost its fill in Dark with any brand of your own. The source was right; the build's prefixing missed a key read back by name.
