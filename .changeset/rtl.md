---
"@uisatin/ui": minor
---

Every component now works right to left. With `dir="rtl"` on `<html>`, spacing, corners, borders and text alignment mirror: Satin sets them with start and end (logical properties) instead of left and right. Button group, Split button and Input group join from the right with round outer corners; close buttons sit in the top-left corner; the Table's first column sticks on the right and its row outline, scroll fade and scroll bar follow; the user's Message bubble has its tail on the left; values in Select and the date picker start at the right.

Arrows that mean next, previous or forward point the other way: Breadcrumb, Pagination, the date picker's months, Context menu's submenus, Sidebar groups, Decision card's steps, Announcement bar, Action button, Agent suggestion, and Link's and Attachment's open-elsewhere arrow (↖). Icons that aren't directional, such as close and check, stay.

Switch shows on with its thumb on the left. Toaster sits in the bottom-left corner and swipes away to the left. In the date picker Left moves to the next day and Right to the one before; Page Up, Page Down, Home and End are unchanged. Pagination's numbers, Decision card's questions, Progress's indeterminate bar and Skeleton's shimmer move the right-to-left way, and Textarea's grip moves to the bottom-left corner, with the browser's resizer.

Code blocks and InputOTP stay left to right, and the Line, Area and Bar charts keep time running left to right. A Table column with `align: 'right'` lines up at the end, so on the left in right-to-left. Left-to-right pages look exactly as before.
