/**
 * client:near — hydrate an island a screen before it scrolls into view. client:visible watches the
 * window, but on wide screens the docs scroll inside <main>, which clips its content, so a margin
 * on the window never sees an island coming and it only hydrates once it is already on screen.
 * This one watches the island's own scroller (the window when nothing nearer scrolls).
 * `client:near` reaches one scroller's height ahead; `client:near="600px 0px"` sets the margin.
 */
export default function near() {
  return {
    name: 'satin-client-near',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({ name: 'near', entrypoint: new URL('./near-client.mjs', import.meta.url).pathname })
      },
    },
  }
}
