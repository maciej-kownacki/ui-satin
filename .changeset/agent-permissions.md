---
'@uisatin/pro': minor
---

Permission request, a Satin Pro AI pattern (`@uisatin/pro/agent-permissions`): what an agent will touch before it first runs. One row per scope with a plain verb ("Read candidates", "Send emails") and a Checkbox; scopes that send stand apart with an amber tile and "· Sends as you" after the title. Don't allow, Allow once, or Always allow from the SplitButton's menu; unticking scopes makes a partial request. Once answered it folds to a summary row (Allowed once, Always allowed, Not allowed, Access removed) with Remove access or Change. Inside a Dialog focus starts on Don't allow. Its words (`agentPermissions*`) are translated with SatinLabels.
