---
'@uisatin/ui': patch
---

Charts: the hover hit area reaches 16px past the marks up and down (Line, Area, Bar, Channel), so a point at the plot's top or bottom and the 14px Channel bar keep their tooltip while the cursor strays off them; only the cursor's x picks the point. The Donut's ring takes 8px either side.
