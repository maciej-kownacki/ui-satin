---
'@uisatin/ui': minor
---

Stepper (`@uisatin/ui/stepper`): where a multi-step flow is, as an ordered list of steps with a number, a label and a description, joined by connectors. Steps are upcoming, current, complete (a check), error (an exclamation mark) or disabled. Linear by default (the steps before the current one are complete, none clickable); with `linear={false}` each step is a button that sets `value`. Horizontal or vertical, where the current step's content opens under its label (`StepperItem` children). A horizontal stepper narrower than 120px a step shows "Step 3 of 4" over a Progress bar, from a container query, so nothing shifts on load (`layout`). When a step completes its connector fills and the check fades in; right to left it mirrors. New words in SatinLabels: `stepOf`, `stepCompleted`, `stepError`.
