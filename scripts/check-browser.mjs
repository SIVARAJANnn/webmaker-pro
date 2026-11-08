import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launch } from '../skills/webmaker/scripts/browser.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const template = path.join(root, 'templates', 'product-showcase')
const require = createRequire(import.meta.url)
const requireTemplate = createRequire(path.join(template, 'package.json'))
const viteBin = path.join(path.dirname(requireTemplate.resolve('vite/package.json')), 'bin', 'vite.js')
const { preview } = await import(pathToFileURL(requireTemplate.resolve('vite')).href)
execFileSync(process.execPath, [viteBin, 'build'], { cwd: template, stdio: 'inherit' })
const report = path.join(root, '.checks', 'product-showcase')
await mkdir(report, { recursive: true })
const server = await preview({ root: template, preview: { host: '127.0.0.1', port: 0 } })
const url = `http://127.0.0.1:${server.httpServer.address().port}/`
let browser

try {
  browser = await launch()
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  await desktop.goto(url)
  await desktop.getByRole('heading', { name: 'Form 01.' }).waitFor()
  assert.equal(await desktop.locator('canvas').count(), 0, 'The model must be opt-in.')
  await desktop.screenshot({ path: path.join(report, 'desktop-poster.png'), fullPage: true })
  await desktop.getByRole('button', { name: 'Explore in 3D' }).click()
  await desktop.locator('[data-model-ready="true"] canvas').waitFor()
  await desktop.getByRole('radio', { name: 'Moss' }).check()
  await desktop.getByRole('button', { name: 'Reset view' }).click()
  await desktop.locator('[data-model-ready="true"] canvas').waitFor()
  await desktop.screenshot({ path: path.join(report, 'desktop-model.png'), fullPage: true })
  await desktop.getByRole('button', { name: 'Show illustration' }).click()
  assert.equal(await desktop.locator('canvas').count(), 0, 'Leaving 3D must unmount the canvas.')
  assert.deepEqual(errors, [])

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await mobile.goto(url)
  await mobile.getByRole('heading', { name: 'Form 01.' }).waitFor()
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile page overflows.')
  await mobile.getByRole('radio', { name: 'Ochre' }).focus()
  await mobile.keyboard.press('ArrowRight')
  assert.equal(await mobile.getByRole('radio', { name: 'Moss' }).isChecked(), true)
  assert.equal(await mobile.locator('canvas').count(), 0)
  await mobile.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const audit = await mobile.evaluate(() => window.axe.run())
  assert.deepEqual(audit.violations.map(item => item.id), [])
  await mobile.screenshot({ path: path.join(report, 'mobile.png'), fullPage: true })

  const fallback = await browser.newPage()
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null
      return getContext.call(this, type, ...args)
    }
  })
  await fallback.goto(url)
  await fallback.getByRole('button', { name: 'Explore in 3D' }).click()
  await fallback.getByText('3D preview unavailable.', { exact: false }).waitFor()
  assert.equal(await fallback.getByRole('img', { name: 'Illustration of the Form 01 speaker' }).isVisible(), true)
  console.log('Product showcase passed desktop 3D, mobile layout, keyboard, axe and no-WebGL checks.')
} finally {
  await browser?.close()
  await server.close()
}
