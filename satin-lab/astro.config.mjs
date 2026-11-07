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
    '/foundations/tokens': '/tokens',
    '/foundations/tokens/[role]': '/tokens/[role]',
  },
  vite: { plugins: [tailwindcss()] },
})
