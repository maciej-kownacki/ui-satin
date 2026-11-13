# @uisatin/ui

## 0.1.1

### Patch Changes

- fd01b6e: Banner and Announcement bar: the mesh glows are now inlined as WebP data URIs (`banner-mesh`), so they show in any app. In 0.1.0 they pointed at `/figma/*.png` on uisatin.dev and were missing everywhere else.
- cb6f3e1: Type declarations now resolve under TypeScript `moduleResolution` `node16` and `nodenext`: relative imports in the `.d.ts` files carry their `.js` extension (folders point at `index.js`). `bundler` resolution is unchanged.
