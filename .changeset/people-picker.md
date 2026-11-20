---
'@uisatin/pro': minor
---

People picker (`@uisatin/pro/people-picker`): Combobox for people. Rows show a 20px avatar, the name and the role (or email), read as "Marta Nowak, Hiring manager"; picks show as chips with avatars, folded into "+N" after `maxChips`. People come from `people`, titled `groups`, or `search(query, { signal })`, debounced (`searchDelay`, 150 ms), with stale requests aborted; while it runs, the last results stay on screen narrowed by the query, a Spinner shows only for answers later than 300 ms, and a failure says so. `people` and `groups` filter as you type, with no delay. `recent` is listed first while the query is empty. A `disabled` person is listed but can't be picked. Removing a chip moves focus to the next one, or to the field. Its words (`recentPeople`, `allPeople`, `addPeople`, `choosePerson`, `searchPeople`, `searchingPeople`, `noPeopleFound`, `peopleSearchFailed`) are translated with SatinLabels.
