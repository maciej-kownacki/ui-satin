// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://uisatin.dev',
  integrations: [react()],
  // Old addresses from before the Intro and Foundations groups became Docs.
  redirects: {
    '/intro/who-is-satin-for': '/introduction',
    '/intro/how-to-use-satin': '/introduction',
    // All components became the home page; Introduction moved to /introduction.
    '/components': '/',
    '/foundations/tokens': '/theming',
    '/tokens': '/theming',
    '/tokens/[role]': '/theming/[role]',
    '/ai-patterns/empty-state': '/components/empty-state',
    '/components/chart': '/components/bar-chart',
    // Charts moved from their own group into Components, under Chart.
    '/charts/bar-chart': '/components/bar-chart',
    '/charts/channel-chart': '/components/channel-chart',
    '/foundations/tokens/[role]': '/theming/[role]',
  },
  vite: { plugins: [tailwindcss()] },
})
