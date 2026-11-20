---
'@uisatin/ui': patch
---

DecisionCard: when Continue or Skip moves to another question, focus goes into it (its picked answer, or its first control) instead of staying on the button, so the new question is read out and answered from there; the step buttons keep focus. This includes a draft question, whose own footer replaces Continue. The docs flow now goes on to the next question on Continue, keeps an answer when you come back to it, and collapses to the summary only on the last one.
