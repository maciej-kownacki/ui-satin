---
"@uisatin/ui": minor
---

Text that fell below WCAG's 4.5:1 now passes, and a check in CI holds it there:

- Error text (FormField, Input, Textarea, Select, InputOTP, error toasts) uses a new `--sa-text-destructive` token, red-700 in Light and red-400 in Dark; the destructive fill it used before read 3.3:1 as text in Dark.
- The destructive button gets darker on hover (red-700) and pressed (red-900), so its white label stays above 4.5:1; it used to get lighter and drop to 2.8:1 in Dark.
- DatePicker's placeholder, the group names in Dropdown and Select, the old value in AgentSuggestion and Popover's close icon use `--sa-text-muted` instead of the fainter tokens.
- A toast action takes `altText`, what Radix reads in place of the button: how to do the same without the toast ("Undo with Ctrl+Z"). It still defaults to the label.
