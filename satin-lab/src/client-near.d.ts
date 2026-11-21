// The client:near directive (integrations/near.mjs).
declare module 'astro' {
  interface AstroClientDirectives {
    'client:near'?: boolean | string
  }
}
export {}
