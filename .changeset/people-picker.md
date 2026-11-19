---
'@uisatin/pro': minor
---

People picker (`@uisatin/pro/people-picker`): Combobox for people. Rows show a 20px avatar, the name and the role (or email), read as "Marta Nowak, Hiring manager"; picks show as chips with avatars, folded into "+N" after `maxChips`. People come from `people`, titled `groups`, or `search(query, { signal })`, debounced (`searchDelay`, 250 ms), with stale requests aborted, a Spinner while searching, and a message when it fails. `recent` is listed first while the query is empty. A `disabled` person is listed but can't be picked. Removing a chip moves focus to the next one, or to the field. Its words (`recentPeople`, `allPeople`, `addPeople`, `choosePerson`, `searchPeople`, `searchingPeople`, `noPeopleFound`, `peopleSearchFailed`) are translated with SatinLabels.
