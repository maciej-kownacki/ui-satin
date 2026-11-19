---
'@uisatin/pro': minor
---

Agent plan (`@uisatin/pro/agent-plan`): the steps an agent proposes before it acts. In a draft the person renames, reorders (drag, Alt+↑/↓ or the step's ⋯ menu) and leaves out steps, then Run plan (disabled while no step is left in). Once it runs, the steps are drawn like Thinking's: the current one shows AgentLoading, a finished step's check fades in, a failed one shows its error with Retry and Skip. One polite live region reads out each step as it finishes. Parts: `AgentPlanRoot`, `AgentPlanHeader`, `AgentPlanSteps`, `AgentPlanActions`. Its words join SatinLabels.
