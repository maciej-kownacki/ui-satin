# @uisatin/ui

## 0.2.0

### Minor Changes

- c1fdcb5: AvatarGroup: avatars side by side share one name tooltip. The first name still waits 400 ms; after that, moving to the next person slides the tooltip over to them and eases its width to the new name, instead of closing one tooltip and opening another. It closes 150 ms after the pointer leaves the row, so the gaps between faces don't close it. Focus shows it at once; Escape and blur hide it.

### Patch Changes

- c1fdcb5: Accordion and expanding groups: the content no longer scales while it opens. Chrome drew the scaled text as a bitmap, so it looked heavier until the animation ended, and the Accordion's open item did it on every page load. The section still grows downwards from under its header.
- 2fdb885: The package now links its source (`repository`, `bugs`), states `engines.node >=20.19` (it's ESM only), ships its CHANGELOG, and is published with npm provenance from the public repository.

## 0.1.1

### Patch Changes

- fd01b6e: Banner and Announcement bar: the mesh glows are now inlined as WebP data URIs (`banner-mesh`), so they show in any app. In 0.1.0 they pointed at `/figma/*.png` on uisatin.dev and were missing everywhere else.
- cb6f3e1: Type declarations now resolve under TypeScript `moduleResolution` `node16` and `nodenext`: relative imports in the `.d.ts` files carry their `.js` extension (folders point at `index.js`). `bundler` resolution is unchanged.
