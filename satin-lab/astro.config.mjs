// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://uisatin.dev',
  integrations: [react()],
  // Old addresses from before the Intro and Foundations groups became Docs.
  redirects: {
    '/intro/who-is-satin-for': '/',
    '/intro/how-to-use-satin': '/',
    '/foundations/tokens': '/theming',
    '/tokens': '/theming',
    '/tokens/[role]': '/theming/[role]',
    '/ai-patterns/empty-state': '/components/empty-state',
    '/components/chart': '/charts/bar-chart',
    '/foundations/tokens/[role]': '/theming/[role]',
  },
  vite: { plugins: [tailwindcss()] },
})
