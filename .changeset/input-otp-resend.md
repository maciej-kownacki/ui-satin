---
'@uisatin/ui': minor
---

InputOTP: `onResend` adds "Didn’t get it?" under the cells with a resend that opens after a countdown (`resendAfter`, 30 s by default) and starts it again once the code is sent. `suggestion` offers a code that arrived by text in a popover under the cells ("428 193 From Messages"); choosing it fills the cells. A code that arrives at once (the suggestion, a paste, the browser's autofill) rolls into the cells like slot-machine reels, one cell after another. New labels `didntGetCode`, `resendCode`, `resendIn`, `useCode`, `fromMessages` and `codeReceived`, and `component/input-otp/suggestion-*` tokens for the popover: a dark chip in both themes, pressed like a Button, with a Messages mark drawn in small squares.
