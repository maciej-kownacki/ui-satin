---
'@uisatin/ui': minor
---

Tool call (`@uisatin/ui/tool-call`): one call an agent made to a tool, as a card of its own. The header is Thinking's tool step (icon, name, mono target) with the status: pending, running with the time so far, success with how long it took, error, cancelled; the status icons cross-fade. It opens onto the input and the output, as JSON in CodeBlocks or nodes of your own, cut at `maxLines` with Show all. A failed call opens on its own with the error and Retry. Parts: ToolCallRoot, ToolCallHeader, ToolCallContent, ToolCallSection, ToolCallError. New words in SatinLabels: `toolCallPending`, `toolCallRunning`, `toolCallDone`, `toolCallFailed`, `toolCallCancelled`, `toolCallInput`, `toolCallOutput`, `toolCallRetry`, `toolCallShowAll`, `toolCallShowLess`.
