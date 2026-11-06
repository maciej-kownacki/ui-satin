# uisatin

Design system docs site, live at [uisatin.dev](https://uisatin.dev).

Right now the site is a single placeholder page (`index.html`).

## Deploy

The folder is linked to the Vercel project `uisatin` (`.vercel/`, not committed). Deploy from a clean checkout:

```bash
vercel deploy --prod
```

DNS lives at name.com: A `@` → 216.198.79.1, CNAME `www` → Vercel. Nothing to change there when the site changes.
