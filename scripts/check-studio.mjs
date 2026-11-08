import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { firefox, webkit } from 'playwright'
import { launch } from '../skills/webmaker/scripts/browser.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = path.join(root, '.checks', 'studio-' + randomUUID())
process.env.WEBMAKER_STUDIO_DATA = scratch
const { startStudio } = await import('../studio/server.mjs')
let sawScreenshot = false
const aiStarted = Promise.withResolvers()
const aiCanceled = Promise.withResolvers()
const waitForSignal = (promise, label) => Promise.race([promise, new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), 5000).unref()
})])
const studio = await startStudio({ ai: async (mode, input, image, { signal } = {}) => {
  if (mode === 'packages' && input.brief.name === 'Form test') {
    aiStarted.resolve()
    return new Promise((_, reject) => signal.addEventListener('abort', () => {
      aiCanceled.resolve()
      reject(new Error('Canceled by the user.'))
    }, { once: true }))
  }
  if (mode === 'packages') return { model: 'test-model', packages: ['@react-three/fiber', 'liquid-glass-react', '@react-three/postprocessing', '@shadergradient/react'] }
  if (mode === 'edit') {
    sawScreenshot = Boolean(image && existsSync(image))
    const { pageId, regionId, blockIds } = input.scope
    return { model: 'test-model', summary: 'Text resized inside the selected block.',
      editsJson: JSON.stringify([{ op: 'patch', pageId, regionId, blockId: blockIds[0], patch: { text: 'A focused AI edit', style: { fontSize: 50 } } }]) }
  }
  if (mode === 'behavior') return { model: 'test-model', summary: 'The model rotates once when opened.',
    behaviorJson: JSON.stringify({ action: 'spin', trigger: 'open', seconds: 2, skill: '/webmaker-reactthreefiber' }) }
  throw new Error('Unexpected AI request.')
} })

let browser
let simpleAddress
let page
const diagnostics = []
try {
  browser = await launch()
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', message => { if (message.type() === 'error') diagnostics.push(message.text()) })
  page.on('requestfailed', request => diagnostics.push(`${request.failure()?.errorText} ${request.url()}`))
  page.on('response', response => { if (response.status() >= 400) diagnostics.push(`${response.status()} ${response.url()}`) })
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); diagnostics.push(error.message) })
  const frame = page.frameLocator('#preview')
  const status = page.locator('#status')
  // An open tab can retain the previous server's token after a restart.
  await page.route(studio.studioOrigin + '/', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, body: (await response.text()).replace(/name="webmaker-token" content="[^"]+"/, 'name="webmaker-token" content="expired-session"') })
  }, { times: 1 })
  await page.goto(studio.studioOrigin)
  await page.getByRole('button', { name: 'Reconnect Studio' }).waitFor()
  await page.getByLabel('Site name').fill('Recovered draft')
  await page.getByLabel('Visual style').selectOption('paper')
  await page.getByRole('button', { name: 'Reconnect Studio' }).click()
  await page.getByRole('status').filter({ hasText: 'Reconnected.' }).waitFor()
  assert.equal(await page.getByLabel('Site name').inputValue(), 'Recovered draft')
  assert.equal(await page.getByLabel('Visual style').inputValue(), 'paper')
  await page.getByLabel('Visual style').selectOption('graphite')
  await page.getByLabel('Site name').fill('Form test')
  await page.getByLabel('What are you making?').fill('A multi-page speaker showcase.')
  await page.getByLabel('Who is it for?').fill('Sound designers')
  await page.getByRole('button', { name: 'Show recommended packages' }).click()
  const packageStatus = page.locator('#package-status')
  await page.getByRole('button', { name: 'Let AI choose' }).click()
  await packageStatus.getByText('Codex is choosing packages.', { exact: false }).waitFor()
  await waitForSignal(aiStarted.promise, 'the AI request')
  assert.equal(await page.getByRole('button', { name: 'Use current packages' }).isEnabled(), true)
  await page.getByRole('button', { name: 'Type my packages' }).click()
  await waitForSignal(aiCanceled.promise, 'the canceled AI request')
  assert.equal(await page.getByRole('button', { name: 'Build website' }).count(), 0)
  await page.getByLabel('Package names or /webmaker aliases').fill('not-a-supported-package')
  await page.getByRole('button', { name: 'Resolve packages' }).click()
  await packageStatus.getByText('not a Studio package', { exact: false }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Build website' }).count(), 0)
  await page.getByLabel('Package names or /webmaker aliases').fill('/webmaker-model-viewer')
  await page.getByRole('button', { name: 'Resolve packages' }).click()
  await packageStatus.getByText('Packages resolved.').waitFor()
  await page.getByRole('button', { name: 'Build website' }).click()
  await frame.getByRole('heading', { name: 'Form test.' }).waitFor()
  const url = (await page.locator('#preview').getAttribute('src')).split('#')[0]
  simpleAddress = url
  await page.screenshot({ path: path.join(scratch, 'editor.png'), fullPage: true })
  await page.getByRole('button', { name: 'Interact', exact: true }).click()
  await frame.getByRole('button', { name: 'Explore in 3D' }).click()
  await frame.locator('.scene[data-ready=true] model-viewer').waitFor({ timeout: 12000 })
  await frame.getByRole('link', { name: 'Showcase', exact: true }).click()
  await frame.getByRole('heading', { name: 'Showcase.' }).waitFor()
  await frame.getByRole('tab', { name: 'About' }).click()
  await frame.getByRole('tabpanel').getByText('Created for Sound designers.').waitFor()
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await frame.getByRole('heading', { name: 'Form test.' }).waitFor()
  await page.getByRole('button', { name: 'Select Area', exact: true }).click()
  await frame.getByText('A multi-page speaker showcase.').click()
  await page.getByRole('button', { name: 'Resize', exact: true }).click()
  await page.getByLabel('Text size (px)').fill('45')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  await status.getByText('Changes saved.').waitFor()
  await frame.locator('[data-block][style*="45px"]').waitFor()
  const grip = await frame.locator('.wm-grip').boundingBox()
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x - 110, grip.y + 16, { steps: 5 })
  await page.mouse.up()
  await frame.locator('[data-block][style*="45px"]:not([style*="--span: 12"])').waitFor()
  await page.getByRole('button', { name: 'Screenshot', exact: true }).click()
  await page.getByRole('button', { name: 'Capture area' }).click()
  await page.getByRole('img', { name: 'Last screenshot' }).waitFor()
  await page.getByRole('button', { name: 'AI Editor', exact: true }).click()
  await page.getByLabel('What should change?').fill('Increase the selected text size.')
  await page.getByLabel('Attach the last screenshot').check()
  await page.getByRole('button', { name: 'Apply with AI' }).click()
  await frame.getByText('A focused AI edit').waitFor()
  assert(sawScreenshot)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await frame.getByText('A multi-page speaker showcase.').waitFor()

  const token = await page.locator('meta[name=webmaker-token]').getAttribute('content')
  const api = async (route, body, expected = 200) => {
    const result = await fetch(`${studio.studioOrigin}/api/${route}`, {
      method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
      headers: { 'X-Webmaker-Token': token, 'Content-Type': 'application/json' }
    })
    const payload = await result.json()
    assert.equal(result.status, expected, payload.error)
    return payload
  }
  const projectId = url.split('/').at(-3)
  let state = await api(`projects/${projectId}`)
  const [home, showcase] = state.project.pages
  const [intro, viewerRegion] = home.regions
  const edit = (route, body, expected) => api(`projects/${projectId}/${route}`, { revision: state.revision, ...body }, expected)
  const scope = { level: 'area', pageId: home.id, regionId: intro.id }
  const rejected = await edit('edit', { scope, edits: [{ op: 'delete', pageId: showcase.id, regionId: showcase.regions[0].id, blockId: showcase.regions[0].blocks[0].id }] }, 400)
  assert.match(rejected.error, /outside the selection/i)
  state = await edit('edit', { scope, edits: [{ op: 'add', pageId: home.id, regionId: intro.id, kind: 'custom' }] })
  const custom = state.project.pages[0].regions[0].blocks.at(-1)
  const customScope = { ...scope, blockId: custom.id }
  const beforeStage = state.revision
  await edit('stage', { scope: customScope, code: { jsx: 'export default < invalid' } }, 400)
  assert.equal((await api(`projects/${projectId}`)).revision, beforeStage)
  const draft = await edit('stage', { scope: customScope, code: { jsx: 'import React from "react"; export default function Card(){return <p>Staged example</p>}', css: 'p { color: #17241f }' } })
  await page.goto(draft.url)
  await page.frameLocator('iframe[title="Custom component"]').getByText('Staged example').waitFor()
  state = await edit('apply', { draft: draft.draft })
  assert(state.project.pages[0].regions[0].blocks.at(-1).code)
  state = await edit('undo', {})
  assert.equal(state.project.pages[0].regions[0].blocks.at(-1).code, null)
  assert.equal(state.project.pages[0].regions[1].id, viewerRegion.id)
  if (process.env.WEBMAKER_CHECK_EXPORT === '1') {
    const { directory } = await edit('export', {})
    const lock = JSON.parse(await readFile(path.join(directory, 'package-lock.json'), 'utf8'))
    assert.equal(lock.packages['node_modules/three'].version, '0.183.0')
    assert(existsSync(path.join(directory, 'dist', 'showcase', 'index.html')))
    assert(!(await readFile(path.join(directory, 'dist', 'index.html'), 'utf8')).includes('bridge.js'))
    console.log(`Independent source and static export verified: ${directory}`)
  }

  const brief = { name: 'Fiber fixture', idea: 'A speaker with animated light and glass.', interaction: 'custom', effects: ['liquid-glass-react'] }
  const selected = await api('recommend', { brief, mode: 'ai' })
  assert.equal(selected.model, 'test-model')
  assert.equal(selected.renderer, 'fiber')
  await api('recommend', { brief, mode: 'manual', packages: ['@google/model-viewer', '@react-three/fiber'] }, 400)
  let fiber = await api('projects', { brief, packages: selected.packages }, 201)
  const fiberHome = fiber.project.pages[0]
  const fiberArea = fiberHome.regions[1]
  const model = fiberArea.blocks[0]
  const fiberScope = { level: 'area', pageId: fiberHome.id, regionId: fiberArea.id, blockIds: [model.id] }
  fiber = await api(`projects/${fiber.project.id}/edit`, { revision: fiber.revision, scope: fiberScope, edits: [{
    op: 'patch', pageId: fiberHome.id, regionId: fiberArea.id, blockId: model.id,
    patch: { transform: { scale: 1.1, x: .3, ry: 30 }, style: { glass: true } }
  }] })
  fiber = await api(`projects/${fiber.project.id}/behavior`, { revision: fiber.revision, scope: fiberScope, prompt: '/webmaker-reactthreefiber Rotate once when opened.' })
  assert.equal(fiber.project.pages[0].regions[1].blocks[0].behavior.action, 'spin')
  assert.equal(fiber.project.pages[1].regions[0].blocks[0].transform.x, 0)
  const fiberAddress = `${studio.previewOrigin}/${fiber.project.id}/${fiber.revision}/`
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(fiberAddress)
  await page.getByRole('heading', { name: 'Fiber fixture.' }).waitFor()
  assert(!requests.some(url => /\.glb|viewer-|\/api\//.test(url)))
  await page.locator('.glass-engine').waitFor({ state: 'attached' })
  await page.getByRole('button', { name: 'Explore in 3D' }).click()
  await page.locator('.scene[data-ready=true] canvas').waitFor()
  await page.getByRole('button', { name: 'Close 3D' }).click()
  assert.equal(await page.locator('canvas').count(), 0)
  await page.getByRole('button', { name: 'Enable ambient motion' }).click()
  await page.locator('.ambient canvas').waitFor()
  await page.getByRole('button', { name: 'Pause ambient motion' }).click()
  await page.locator('.ambient canvas').waitFor({ state: 'detached' })
  assert.deepEqual(errors, [])

  const baselineDir = path.join(root, 'templates', 'product-showcase', 'dist', 'assets')
  if (!existsSync(baselineDir)) {
    const vite = path.join(root, 'templates', 'product-showcase', 'node_modules', 'vite', 'bin', 'vite.js')
    execFileSync(process.execPath, [vite, 'build'], { cwd: path.join(root, 'templates', 'product-showcase') })
  }
  const baseline = (await readdir(baselineDir)).find(name => /^index-.*\.js$/.test(name))
  const baseSize = gzipSync(await readFile(path.join(baselineDir, baseline))).length
  const comparable = await api('projects', { brief: { name: 'Form benchmark', idea: 'A compact speaker showcase.', interaction: 'custom' }, packages: ['@react-three/fiber'] }, 201)
  requests.length = 0
  const comparableURL = `${studio.previewOrigin}/${comparable.project.id}/${comparable.revision}/`
  await page.goto(comparableURL)
  await page.getByRole('heading', { name: 'Form benchmark.' }).waitFor()
  const directory = path.join(scratch, 'projects', comparable.project.id, 'snapshots', comparable.revision, 'dist')
  const initial = [...new Set(requests.filter(url => /\/assets\/.*\.js$/.test(url)))].map(url => path.basename(url))
  assert(!requests.some(url => /\.glb|viewer-|\/api\//.test(url)))
  const entries = await Promise.all(initial.map(file => readFile(path.join(directory, 'assets', file))))
  const size = entries.reduce((total, contents) => total + gzipSync(contents).length, 0)
  assert(size <= baseSize * 1.1, `Initial bundle ${size} exceeds 110% of ${baseSize}`)
  assert(entries.every(contents => !/Webmaker Studio|bridge\.js|\/api\//.test(contents.toString())))
  assert(initial.length > 0)
  const noGL = await browser.newPage({ reducedMotion: 'reduce' })
  await noGL.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null
      return getContext.call(this, type, ...args)
    }
  })
  await noGL.goto(comparableURL)
  await noGL.getByRole('button', { name: 'Explore in 3D' }).click()
  await noGL.getByText('3D preview unavailable.', { exact: false }).waitFor()
  assert.equal(await noGL.getByRole('img', { name: 'Sample speaker model' }).isVisible(), true)
  await noGL.close()
  for (const engine of [firefox, webkit]) {
    if (!existsSync(engine.executablePath())) { console.log(`${engine.name()}: binary unavailable`); continue }
    const runner = await engine.launch()
    try {
      const tab = await runner.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
      await tab.goto(fiberAddress)
      await tab.getByRole('heading', { name: 'Fiber fixture.' }).waitFor()
      await tab.locator('.glass .surface').waitFor()
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await tab.goto(simpleAddress + 'about/')
      await tab.getByRole('heading', { name: 'About.' }).waitFor()
      console.log(`${engine.name()}: mobile layout, reduced-motion glass fallback and direct route passed.`)
    } finally { await runner.close() }
  }
  await mkdir(path.join(scratch, 'agents'), { recursive: true })
  for (const [target, destination] of Object.entries({ codex: '.agents', antigravity: '.agents', claude: '.claude', cursor: '.agents' })) {
    const dir = path.join(scratch, 'agents', target)
    await mkdir(dir)
    execFileSync(process.execPath, [path.join(root, 'scripts', 'install-skills.mjs'), '--project', dir, '--target', target])
    assert(existsSync(path.join(dir, destination, 'skills', 'webmaker', 'SKILL.md')))
  }
  console.log(`Studio checks passed. Initial JS ${size} bytes gzip against ${baseSize} bytes for Form 01. Artifacts: ${scratch}`)
} catch (error) {
  console.error(diagnostics.slice(-15).join('\n'))
  await page?.screenshot({ path: path.join(scratch, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await studio.close()
}
