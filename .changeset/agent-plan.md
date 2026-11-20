---
'@uisatin/pro': minor
---

Agent plan (`@uisatin/pro/agent-plan`): the steps an agent proposes before it acts. In a draft each step shows its number, its label, and under the label one muted line with its tool (the app's logo from `toolIcon`, an `img` at 16px or an icon, then the name) and detail. Pressing a step opens Rename and Remove under it; Rename turns the label into a field. Dragging the number or Alt+↑/↓ reorders it: a dragged step lifts and follows the pointer, the others make room, and the number shows a grip on hover or keyboard focus. Run plan is disabled while the plan is empty. Once it runs, the steps are drawn like Thinking's: the current one shows AgentLoading, a finished step's check fades in, a failed one shows its error with Retry and Skip. One polite live region reads out each step as it finishes. Parts: `AgentPlanRoot`, `AgentPlanHeader`, `AgentPlanSteps`, `AgentPlanActions`. Its words join SatinLabels.
