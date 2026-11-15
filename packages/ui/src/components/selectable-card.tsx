'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * SelectableCard: what SelectableRadio and SelectableCheckbox share. A card with an optional
 * icon and a title over a description; the card's border shows the state
 * (styles/components.css): border/default, border/strong on hover, an action/primary border
 * with a 1px ring of the same when selected, the focus ring around the whole card.
 *
 * `icon` is a 16px glyph in a square muted tile as tall as the title and description; it takes
 * the text colour once the card is selected. `children` go under the description (a price,
 * Badges). Two sizes, the padding even on every side, every size on the scale:
 *
 * - `md` (default): 12px padding, radius-xl, 12px gap. The type of Radio and Checkbox: title
 *   14/20 medium in text/default over a 14/20 description in text/muted, line on line (their
 *   2px gap would make the text 42px, off the scale): 40px of text, a 40px tile.
 * - `sm`: 8px padding, radius-lg, 10px gap. Title 13/18 medium over a 13/18 description:
 *   36px of text, a 36px tile.
 * - A title alone is one 20px line next to a 20px tile.
 */
export interface SelectableCardBaseProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** A 16px glyph, shown in a tile as tall as the title and description. */
  icon?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
  /** Extra content under the description. */
  children?: React.ReactNode
}

/** @internal The icon tile and the text of a selectable card. */
export function SelectableCardBody({
  id,
  title,
  description,
  icon,
  size = 'md',
  children,
}: Omit<SelectableCardBaseProps, 'className'> & { id: string }) {
  const sm = size === 'sm'
  // The tile is on the spacing scale, and the text is set to be exactly that tall:
  // md 20 + 20 = 40, sm 18 + 18 = 36; a title alone is one 20px line on a 20px tile.
  // A description that wraps grows the text; the tile stays put, top-aligned with the title.
  const tile = description ? (sm ? 36 : 40) : 20
  const titleLine = sm && description ? 'leading-[18px]' : 'leading-5'

  return (
    <span className={cn('flex min-w-0 flex-1 items-start', sm ? 'gap-2.5' : 'gap-3')}>
      {icon && (
        <span
          data-slot="selectable-card-icon"
          aria-hidden
          style={{ width: tile, height: tile, borderRadius: tile === 20 ? 'var(--radius-sm)' : sm ? 'var(--radius-md)' : undefined }}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-start">
        <span className="grid">
          <span id={`${id}-title`} className={cn('block font-medium text-text-default', sm ? 'text-sm' : 'text-base', titleLine)}>
            {title}
          </span>
          {description && (
            // md: 14/20 like Radio's and Checkbox's description; sm: 13/18.
            <span id={`${id}-description`} className={cn('block text-text-muted', sm ? 'text-sm leading-[18px]' : 'text-base leading-5')}>
              {description}
            </span>
          )}
        </span>
        {children && <span className={cn('block', sm ? 'mt-1.5' : 'mt-2')}>{children}</span>}
      </span>
    </span>
  )
}

/** The ids SelectableRadio and SelectableCheckbox give the control, title and description. */
export function useSelectableIds(id: string | undefined, description: React.ReactNode) {
  const autoId = React.useId()
  const controlId = id ?? autoId
  return {
    controlId,
    'aria-labelledby': `${controlId}-title`,
    'aria-describedby': description ? `${controlId}-description` : undefined,
  }
}
