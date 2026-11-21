---
'@uisatin/pro': minor
---

Permission request, a Satin Pro AI pattern (`@uisatin/pro/agent-permissions`): what an agent will touch before it first runs. The agent's avatar sits in a tile of its tone, over a soft aura of that tone, with the title and reason centred under it; then one row per scope with a plain verb ("Read candidates", "Send emails") and a Checkbox; scopes that send stand apart with an amber tile and "· Sends as you" after the title. Don't allow, Allow once, or Always allow from the SplitButton's menu; unticking scopes makes a partial request. It is the question only: `onAllow` gets the mode and the ticked scopes, and what follows an answer (closing the Dialog, granting the access) is the app's part; a promise from `onAllow` or `onDeny` shows a Spinner until it settles. Inside a Dialog focus starts on Don't allow. Its words (`agentPermissions*`) are translated with SatinLabels.
