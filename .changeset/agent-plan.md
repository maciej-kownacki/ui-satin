---
'@uisatin/pro': minor
---

Agent plan (`@uisatin/pro/agent-plan`): the steps an agent proposes before it acts. In a draft each step shows its number, its tool as a plain Badge with the tool's icon (`toolIcon`), and an × that removes it; pressing the label renames the step, and dragging the number or Alt+↑/↓ reorders it. Run plan is disabled while the plan is empty. Once it runs, the steps are drawn like Thinking's: the current one shows AgentLoading, a finished step's check fades in, a failed one shows its error with Retry and Skip. One polite live region reads out each step as it finishes. Parts: `AgentPlanRoot`, `AgentPlanHeader`, `AgentPlanSteps`, `AgentPlanActions`. Its words join SatinLabels.
