---
"@uisatin/ui": patch
---

Type declarations now resolve under TypeScript `moduleResolution` `node16` and `nodenext`: relative imports in the `.d.ts` files carry their `.js` extension (folders point at `index.js`). `bundler` resolution is unchanged.
