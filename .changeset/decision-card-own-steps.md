---
'@uisatin/ui': minor
---

DecisionCard takes steps of your own: `children` take the answers' place and move with the step, `footer` takes Skip and Continue's place in the same row, and `previousStepLabel` and `nextStepLabel` name the step buttons ("Previous question" and "Next question" by default). A part that reads the same on both steps, such as a title every step shares, now stays still while the rest slides. A `ref` on the card no longer replaces the one the step slide measures with.
