/**
 * Icons from the docs template (uiKit 3857:5968), path for path. The exported SVGs hard-code
 * their dark-mode colour, so they are inlined here with currentColor to follow the theme.
 */
type IconProps = { className?: string }

const icon14 = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true } as const
const icon16 = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true } as const
const stroke14 = { stroke: 'currentColor', strokeWidth: 1.09375, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const stroke16 = { stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IntroIcon = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} d="M2.97748 12.1718V2.97748C2.97748 2.34274 3.49203 1.82819 4.12677 1.82819H9.87323C10.508 1.82819 11.0225 2.34274 11.0225 2.97748V12.1718L7.62148 9.98546C7.2429 9.74204 6.7571 9.74204 6.37852 9.98546L2.97748 12.1718Z" />
  </svg>
)

export const ComponentsIcon = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} strokeLinejoin={undefined} d="M7 1.53125L9.05625 3.5875L7 5.64375L4.94375 3.5875L7 1.53125ZM10.4125 4.94375L12.4688 7L10.4125 9.05625L8.35625 7L10.4125 4.94375ZM7 8.35625L9.05625 10.4125L7 12.4688L4.94375 10.4125L7 8.35625ZM3.5875 4.94375L5.64375 7L3.5875 9.05625L1.53125 7L3.5875 4.94375Z" />
  </svg>
)

export const AiPatternsIcon = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} d="M5.23147 4.94668L6.57757 2.09243C6.75037 1.72601 7.24965 1.72601 7.42245 2.09243L8.76855 4.94668L11.7789 5.40721C12.1652 5.4663 12.3191 5.9632 12.0395 6.24827L9.86159 8.46843L10.3755 11.605C10.4416 12.0077 10.0376 12.3149 9.69205 12.1247L7.00001 10.643L4.30797 12.1247C3.96238 12.3149 3.55845 12.0077 3.62448 11.605L4.13843 8.46843L1.96049 6.24827C1.68093 5.9632 1.83478 5.4663 2.22109 5.40721L5.23147 4.94668Z" />
  </svg>
)

export const ChevronRight = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} d="M5.25 3.5L8.75 7L5.25 10.5" />
  </svg>
)

export const ChevronDown = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} d="M3.5 5.25L7 8.75L10.5 5.25" />
  </svg>
)

export const PreviewIcon = ({ className }: IconProps) => (
  <svg {...icon16} className={className}>
    <path {...stroke16} d="M2 8.66663C4.4 3.33329 11.6 3.33329 14 8.66663M8 11.3334C6.8954 11.3334 6 10.438 6 9.33337C6 8.22877 6.8954 7.33337 8 7.33337C9.1046 7.33337 10 8.22877 10 9.33337C10 10.438 9.1046 11.3334 8 11.3334Z" />
  </svg>
)

export const CodeIcon = ({ className }: IconProps) => (
  <svg {...icon16} className={className}>
    <path {...stroke16} d="M8.99996 4L6.66663 12.3333M4.33333 5.66663L2 7.99996L4.33333 10.3333M11.6666 5.66663L14 7.99996L11.6666 10.3333" />
  </svg>
)

/** Foundations has no icon in the template; a palette drawn to the same 14px, 1.09 stroke grid. */
export const FoundationsIcon = ({ className }: IconProps) => (
  <svg {...icon14} className={className}>
    <path {...stroke14} d="M7 1.75A5.25 5.25 0 0 0 7 12.25c.73 0 1.17-.6 1.17-1.17 0-.3-.12-.57-.3-.77a1.15 1.15 0 0 1-.29-.77c0-.64.52-1.16 1.17-1.16h1.36A2.62 2.62 0 0 0 12.25 5.75C12.25 3.54 9.9 1.75 7 1.75Z" />
    <circle cx="4.38" cy="6.13" r="0.6" fill="currentColor" />
    <circle cx="6.13" cy="4.08" r="0.6" fill="currentColor" />
    <circle cx="8.75" cy="4.38" r="0.6" fill="currentColor" />
  </svg>
)
