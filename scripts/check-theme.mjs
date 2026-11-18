/**
 * The built themeVars() and themeCss() (packages/ui/dist/theme), as an app gets them from npm:
 * every value is a real CSS value for a spread of brands and corner scales, with and without a
 * scope. The npm build rewrites variable names in the JS, so a value that reads another key back
 * can come out broken in the package while the source is fine (0.7.0 shipped
 * `--sa-color-blue-500-a20: undefined33`). Run after `npm run build:ui`.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const entry = join(import.meta.dirname, '../packages/ui/dist/theme/index.js')
if (!existsSync(entry)) {
  console.error('packages/ui/dist is missing: run npm run build:ui first')
  process.exit(1)
}
const { themeVars, themeCss } = await import(pathToFileURL(entry).href)

const BRANDS = ['#4633D7', '#E5533D', '#0F766E', '#2563EB', '#D97706', '#111111', '#9333EA', '#16A34A', '#F5D90A']
const RADII = [0, 0.5, 1, 1.5]
const BROKEN = /undefined|NaN|null|Infinity|\[object/
const COLOR = /^#[0-9A-F]{6}([0-9A-F]{2})?$/i

const problems = []
let values = 0
for (const brand of BRANDS)
  for (const radius of RADII) {
    const theme = { brand, radius }
    const { root, dark } = themeVars(theme)
    for (const [mode, vars] of [['root', root], ['dark', dark]])
      for (const [name, value] of Object.entries(vars)) {
        values++
        const where = `${brand} radius ${radius} ${mode} ${name}`
        if (typeof value !== 'string' || !value || BROKEN.test(value)) problems.push(`${where}: ${JSON.stringify(value)}`)
        else if (/--sa-color-/.test(name) && !COLOR.test(value)) problems.push(`${where}: ${value} is not a hex colour`)
      }
    for (const scope of [undefined, '.brand'])
      if (BROKEN.test(themeCss(theme, scope))) problems.push(`themeCss ${brand} radius ${radius} scope ${scope ?? '(none)'}: ${themeCss(theme, scope).match(BROKEN)[0]}`)
  }

if (problems.length) {
  console.error(`themeVars()/themeCss() from the build return broken values:\n  ${problems.slice(0, 20).join('\n  ')}`)
  process.exit(1)
}
console.log(`theme: ${values} values from the built themeVars() are valid for ${BRANDS.length} brands × ${RADII.length} corner scales, themeCss() too`)
