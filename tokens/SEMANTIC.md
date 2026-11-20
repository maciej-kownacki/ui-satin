# Warstwa semantyczna

Wdrożone 5 listopada 2026 w Figmie (kolekcje `theme` i `tone`) i w `tokens.json`. Poniżej: zasady, mapa starych nazw na nowe i to, co zostało świadomie odłożone.

Stan dziś: kolekcja `theme` (102 zmienne, Light/Dark) to mieszanka nazw shadcn (`color/*`), worka `ext/*` (45 zmiennych bez wspólnej logiki), duplikatów `sidebar/*` i palety `tone/*`. Ta sama wartość ma kilka nazw (`foreground` = `card-foreground` = `popover-foreground` = `secondary-foreground` = `accent-foreground`), a `muted`, `secondary` i `accent` to ten sam zinc-100 / zinc-800.

## Zasady

1. **Nazwa mówi, do czego służy kolor, a nie jaki jest.** `text/muted`, nie `zinc-500`.
2. **Schemat `{rola}/{wariant}/{stan}`**, zawsze w tej kolejności: `action/primary/bg-hover`.
3. **Sześć ról bazowych** pokrywa 90% użyć: `bg`, `text`, `border`, `action`, `status`, `effect`. Reszta to wyraźnie oznaczone grupy specjalne: `chart`, `code`, `component`.
4. **Prymitywy tylko przez aliasy.** Prymitywy są ukryte przy publikacji, a w komponentach podpina się wyłącznie semantykę.
5. **Jedna wartość, jedna nazwa.** Duplikaty łączymy, nie aliasujemy.
6. **Kod ma te same nazwy.** `bg/card` → `--bg-card`; ustawiamy `codeSyntax` w Figmie, więc Dev Mode pokazuje nazwę CSS.

## Mapa

### bg — tła i powierzchnie (rampa w Dark: canvas < card < field < popover)
| nowa | dziś | Light / Dark |
|---|---|---|
| `bg/canvas` | color/background | zinc-50 / zinc-950 |
| `bg/card` | color/card | white / #121215 |
| `bg/field` | ext/surface | white / #1A1A1D — tło inputów |
| `bg/popover` | color/popover | white / #222225 — dropdown, button, banner |
| `bg/muted` | color/muted | zinc-100 / zinc-800 |
| `bg/hover` | color/accent | zinc-100 / zinc-800 — hover wiersza, itemu |
| `bg/selected` | ext/menu-item-active | zinc-200 / #3D3D3F |
| `bg/card-fade` | ext/card-transparent | koniec gradientu fade (card 0%) |

### text — treść, ikony
| nowa | dziś |
|---|---|
| `text/default` | color/foreground (+ łączymy: card-, popover-, secondary-, accent-foreground) |
| `text/muted` | color/muted-foreground |
| `text/subtle` | ext/subtle-foreground |
| `text/placeholder` | ext/placeholder-foreground |
| `text/on-solid` | color/primary-foreground + color/destructive-foreground (oba white) |
| `text/on-inverse` | nowa, alias do bg/canvas (dziś inverse button używa color/background) |

### border
| nowa | dziś |
|---|---|
| `border/default` | color/border |
| `border/subtle` | ext/border-subtle |
| `border/strong` | ext/border-strong |
| `border/input` | color/input |
| `border/focus` | color/ring — obrys focusu w inputach i tabach (24 użycia), obok glow `action/focus-ring` |

### border-width — stroke widths (added 20 November 2026)
| token | value | where |
|---|---|---|
| `border-width/default` | 0.75px | Every edge: cards, menus, popovers, buttons (their outline and ring), chips, outline badges, rules and separators, table lines, the bulk action bar. Tailwind's `border`, `border-t`…, `divide-*` read it (`--default-border-width`); a box-shadow stroke writes `var(--border-width-default)`. |
| `border-width/strong` | 1px | The boundary of a form control: Input, Textarea, Select, Combobox, Date picker and Number input fields, Input group parts, OTP cells, Search bar, Prompt bar, Decision card's answer field and radios, Checkbox, Radio, Selectable cards, the Slider thumb, the outline Dot. Tailwind: `border-strong`. |

- In CSS, `default` is written as what browsers draw for a 0.75px border: whole device pixels, rounded down, at least one. 1px on 1x screens, 0.5px on 2x, 0.667px on 3x (`@media (min-resolution: …)` in theme.css). Borders would snap that way anyway; writing it out makes box-shadow strokes, which browsers don't snap, as crisp as borders instead of a soft 1.5-pixel smear.
- Field and control edges keep `strong`: their edge is what marks them (WCAG 1.4.11), and border/default and border/input on bg/field are already under 3:1 (known issues on /accessibility); thinner would be fainter still.
- Not stroke widths, so untouched: focus rings (the 2px `action/focus-ring`, the field's 1px `border/focus` ring that doubles the edge to 2px), error and success edges on fields, shadow offsets (`0 1px 2px`), the 1px top highlight on tooltips and the OTP suggestion, carets, the Thinking rail, the dash between OTP groups.

### action — przyciski, toggle, kontrolki (`bg`, `bg-hover`, `bg-pressed`, `border`, `fg`, `glow`, `shadow`)
| nowa | dziś |
|---|---|
| `action/primary/bg` · `bg-hover` · `bg-pressed` | color/primary · ext/primary-hover · ext/primary-pressed |
| `action/primary/border` · `glow` · `shadow` | ext/primary-border · ext/primary-inner-glow · ext/shadow-color-primary |
| `action/secondary/bg` · `bg-hover` · `bg-pressed` | color/secondary · ext/secondary-hover · ext/secondary-pressed |
| `action/destructive/bg` · `bg-hover` · `bg-pressed` | color/destructive · ext/destructive-hover · ext/destructive-pressed |
| `action/inverse/bg` · `bg-hover` · `bg-pressed` | nowa (alias text/default) · ext/inverse-hover · ext/inverse-pressed |
| `action/inverse/border` · `glow` | ext/inverse-border · ext/inverse-inner-glow |
| `action/focus-ring` | ext/focus-ring (primary 20%, glow 2px) |

### status — paleta tonów (chipy, badge, toast, avatar)
`status/{ton}/bg` · `status/{ton}/border` · `status/{ton}/fg`, tony: `neutral`, `brand`, `sky`, `green`, `amber`, `red`, `fuchsia`, `plum` (dziś `tone/sky`, `tone/sky-border`, `tone/sky-foreground`…).
Kolekcja przełączana trybem (dziś `tone` z 8 trybami) dostaje nazwy `tone/bg`, `tone/border`, `tone/fg`.

### effect — cienie i światła
| nowa | dziś |
|---|---|
| `effect/shadow-ambient` · `-xs` · `-sm` · `-md` · `-lg` | ext/shadow-color-* |
| `effect/highlight-top` | ext/highlight-top |

### Grupy specjalne
- `chart/1` … `chart/5` ← chart/chart-1…5
- `code/*` — zostaje bez zmian
- `component/table/zebra`, `component/table/header`, `component/segmented/selected`, `component/segmented/pressed`, `component/rail/center`, `component/rail/edge` ← odpowiednie `ext/*`. Tokeny komponentowe tylko tam, gdzie wartość jest naprawdę wyjątkowa dla komponentu.

### Usunięte
- `sidebar/*` (8) i duplikaty `card-`, `popover-`, `secondary-`, `accent-`, `destructive-foreground` (5). Najpierw przepięte (84 warstwy, 466 nadpisań w instancjach), potem usunięte.

### Zostawione
- `ext/gradient-*` są używane w decisionCard, getting started i libraryViews, więc trafiły do `component/highlight/*`.
- `component/segmented/selected` to alias `bg/selected` — aktywny segment wygląda jak aktywny pill tab.

## Prymitywy (krok 2, osobno)
`extra/*` to dziś worek: ciemne wartości bez rampy (`card-dark`, `border-dark`, `primary-dark`…), alfy i jednorazówki. Propozycja: ciemne neutralne jako dodatkowe stopnie zinc (`zinc/925`, `zinc/900`…), alfy w `alpha/white-6`, `alpha/black-12`, odcienie primary Dark jako stopnie rampy `blue`. Po tym kroku `extra/*` znika.

## Jak to zostało wdrożone
1. Zmiana nazw w miejscu — ID zmiennych zostają, więc wszystkie podpięcia w komponentach działają dalej.
2. Duplikaty: przepinamy warstwy na zmienną docelową, potem usuwamy duplikat.
3. `codeSyntax` (WEB) dla każdej zmiennej semantycznej, `hiddenFromPublishing` dla prymitywów.
4. `tokens.json`, `build.mjs`, `globals.css` i README przechodzą na te same nazwy — nic w kodzie jeszcze z nich nie korzysta, więc zmiana jest bezpieczna.
