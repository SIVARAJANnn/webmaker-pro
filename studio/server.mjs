import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { activate, exportProject, projectPath, projects, root, saveAsset, snapshot, snapshotPath, state } from './build.mjs'
import { applyEdits, id, need, newProject, readBrief, recommend, resolvePackages, withCustomCode } from './project.mjs'
import { askAI } from './ai.mjs'

const token = id()
const working = new Set()
const drafts = new Map()
const bridge = await readFile(new URL('./bridge.js', import.meta.url))
const host = '127.0.0.1'
const limit = 40 * 1024 * 1024
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
let studioOrigin, previewOrigin
let assistant = askAI
const previewURL = (projectId, revision, slug = '') => `${previewOrigin}/${projectId}/${revision}/${slug ? slug + '/' : ''}`

function send(response, status, content, headers = {}) {
  response.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  response.end(content)
}

const json = (response, body, status = 200) => send(response, status, JSON.stringify(body), { 'Content-Type': 'application/json' })
const safeState = ({ history, ...payload }) => payload

async function bytes(request, max) {
  need(Number(request.headers['content-length'] || 0) <= max, 'That file or request is too large.')
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    need(total <= max, 'That file or request is too large.')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(request) {
  const body = await bytes(request, 256_000)
  return body.length ? JSON.parse(body.toString('utf8')) : {}
}

async function fileWithin(directory, parts) {
  need(parts.every(part => part && part !== '.' && part !== '..' && !/[\\:\x00]/.test(part)), 'Invalid file path.')
  const parent = await realpath(directory)
  const file = await realpath(path.join(parent, ...parts))
  const relative = path.relative(parent, file)
  need(relative && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Invalid file path.')
  return file
}

async function lock(projectId, fn) {
  need(!working.has(projectId), 'This project is busy. Wait for the current change.')
  working.add(projectId)
  try { return await fn() } finally { working.delete(projectId) }
}

function requireToken(request) {
  const provided = Buffer.from(request.headers['x-webmaker-token'] || '')
  if (provided.length !== token.length || !timingSafeEqual(provided, Buffer.from(token))) {
    throw Object.assign(new Error('Studio restarted. Reconnect to continue.'), { code: 'SESSION_EXPIRED' })
  }
  need(!request.headers.origin || request.headers.origin === studioOrigin, 'This request must come from Webmaker Studio.')
}

function prompt(value) {
  need(typeof value === 'string' && value.trim() && value.length <= 4000, 'Enter an instruction between 1 and 4000 characters.')
  return value.trim()
}

function scopedContext(project, scope) {
  need(scope && ['area', 'page', 'site'].includes(scope.level), 'Select an edit scope.')
  if (scope.level === 'site') return project
  const page = project.pages.find(item => item.id === scope.pageId)
  need(page, 'Select a page.')
  if (scope.level === 'page') return { ...project, pages: [page] }
  const area = page.regions.find(item => item.id === scope.regionId)
  need(area, 'Select an area.')
  return { name: project.name, renderer: project.renderer, packages: project.packages,
    pages: [{ ...page, regions: [{ ...area, blocks: scope.blockIds?.length ? area.blocks.filter(block => scope.blockIds.includes(block.id)) : area.blocks }] }] }
}

async function browser() {
  const options = { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { return await chromium.launch({ ...options, channel }) } catch {}
  }
  throw new Error('Install Chromium with npx playwright install chromium, or install Chrome or Edge to capture screenshots.')
}

async function capture(project, revision, options) {
  const page = project.pages.find(item => item.id === options.pageId)
  need(page, 'Select a page to capture.')
  const { width, height } = options.viewport || {}
  need(Number.isInteger(width) && width >= 250 && width <= 1920 && Number.isInteger(height) && height >= 250 && height <= 1600, 'Invalid capture size.')
  const runner = await browser()
  try {
    const tab = await runner.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    const address = previewURL(project.id, revision, page.slug)
    await tab.route('**/*', route => route.request().url().startsWith(previewOrigin + '/') ? route.continue() : route.abort())
    await tab.goto(address, { waitUntil: 'load' })
    await tab.locator('h1').waitFor()
    for (const name of (options.tabs || []).slice(0, 30)) {
      if (typeof name !== 'string' || !/^[a-f0-9-]+-tab-\d+$/.test(name)) continue
      const button = tab.locator(`[role="tab"][id="${name}"]`)
      if (await button.count()) await button.click()
    }
    for (const item of (options.viewers || []).slice(0, 8)) {
      const element = tab.locator('[data-viewer]').filter({ has: tab.locator('[data-viewer-toggle]') })
      const index = await element.evaluateAll((nodes, target) => nodes.findIndex(node => node.dataset.viewer === target), item.id)
      if (index < 0) continue
      const node = element.nth(index)
      await node.locator('[data-viewer-toggle]').click()
      const renderer = node.locator('[data-ready=true]')
      await renderer.waitFor({ timeout: 8000 }).catch(() => {})
      if (item.camera && await renderer.count()) await renderer.evaluate((target, camera) => {
        target.dispatchEvent(new CustomEvent('wm-camera', { detail: camera }))
      }, item.camera)
    }
    await tab.evaluate(async () => {
      await document.fonts.ready
      for (const image of document.images) image.loading = 'eager'
      await Promise.allSettled([...document.images].map(image => image.decode()))
    })
    const rectangle = options.rectangle
    let clip
    if (rectangle) {
      const size = await tab.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))
      const { x, y, width, height } = rectangle
      need([x, y, width, height].every(Number.isFinite) && x >= 0 && y >= 0 && width > 1 && height > 1, 'Select a visible area for the screenshot.')
      clip = { x: Math.floor(x), y: Math.floor(y), width: Math.min(Math.round(width), size.width - Math.floor(x)), height: Math.min(Math.round(height), size.height - Math.floor(y)) }
      need(clip.width > 0 && clip.height > 0, 'The selection moved outside the page.')
    }
    const captureId = id()
    const directory = path.join(projectPath(project.id), 'captures')
    await mkdir(directory, { recursive: true })
    const image = await tab.screenshot({ animations: 'disabled', ...(clip ? { clip } : { fullPage: true }) })
    await writeFile(path.join(directory, captureId + '.png'), image)
    return { captureId, image: 'data:image/png;base64,' + image.toString('base64') }
  } finally { await runner.close() }
}

async function handleAPI(request, response, url) {
  requireToken(request)
  const [, , action, projectId, method] = url.pathname.split('/')
  if (request.method === 'GET' && action === 'projects') {
    if (projectId) return json(response, { ...safeState(await state(projectId)), previewOrigin })
    return json(response, { projects: await projects(), previewOrigin })
  }
  need(request.method === 'POST', 'Unsupported request.')
  if (action === 'upload') return json(response, { asset: await saveAsset(url.searchParams.get('name') || '', await bytes(request, limit)) })
  const body = await readJson(request)
  if (action === 'recommend') {
    const brief = readBrief(body.brief)
    const suggested = recommend(brief)
    if (body.mode === 'manual') return json(response, resolvePackages(brief, body.packages))
    if (body.mode === 'ai') {
      const controller = new AbortController()
      const cancel = () => { if (!response.writableEnded) controller.abort() }
      response.once('close', cancel)
      try {
        const answer = await assistant('packages', { brief, supported: ['@google/model-viewer', '@react-three/fiber', '@react-three/drei', '@shadergradient/react', '@react-three/postprocessing', 'liquid-glass-react'], suggested: suggested.packages },
          undefined, { signal: controller.signal })
        return json(response, { ...resolvePackages(brief, [...answer.packages, ...brief.effects]), model: answer.model,
          draft: { intro: String(answer.intro || '').slice(0, 2000), about: String(answer.about || '').slice(0, 2000) } })
      } catch (error) {
        if (controller.signal.aborted) return
        return json(response, { ...suggested, note: error.message + ' Webmaker selected the compatible preset.' })
      } finally {
        response.off('close', cancel)
      }
    }
    return json(response, suggested)
  }
  need(action === 'projects', 'Unknown endpoint.')
  if (!projectId) {
    const brief = readBrief(body.brief)
    const selected = resolvePackages(brief, body.packages)
    const project = newProject(brief, selected, body.draft || {})
    const revision = await snapshot(project)
    await activate(project.id, [revision])
    return json(response, { project, revision, canUndo: false, previewOrigin }, 201)
  }
  if (method === 'capture') {
    const current = await state(projectId)
    need(current.revision === body.revision, 'Refresh the preview before capturing.')
    return json(response, await capture(current.project, current.revision, body))
  }
  return lock(projectId, async () => {
    const current = await state(projectId)
    need(current.revision === body.revision, 'This project changed. Refresh the editor and retry.')
    if (method === 'export') return json(response, { directory: await exportProject(projectId, current.revision) })
    if (method === 'undo') {
      need(current.canUndo, 'There is no edit to undo.')
      await activate(projectId, current.history.slice(0, -1))
      return json(response, safeState(await state(projectId)))
    }
    let next, summary, model, revision
    const project = current.project
    if (method === 'edit') next = applyEdits(project, body.scope, body.edits)
    else if (method === 'renderer') {
      need(project.renderer === 'viewer', 'This site already uses React Three Fiber.')
      const selection = resolvePackages({ interaction: 'custom' }, ['@react-three/fiber', ...project.packages.filter(name => name !== '@google/model-viewer')])
      next = { ...project, renderer: selection.renderer, packages: selection.packages }
    } else if (method === 'glass') {
      need(!project.packages.includes('liquid-glass-react'), 'Liquid Glass is already available.')
      next = { ...project, packages: [...project.packages, 'liquid-glass-react'] }
    } else if (method === 'apply') {
      const draft = drafts.get(body.draft)
      need(draft?.projectId === projectId && draft.base === current.revision, 'This draft is out of date. Stage it again.')
      revision = draft.revision
      drafts.delete(body.draft)
    } else if (method === 'stage') {
      let code = body.code
      const selected = scopedContext(project, { ...body.scope, level: 'area', blockIds: [body.scope.blockId] })
      const block = selected.pages[0].regions[0].blocks[0]
      need(block?.kind === 'custom', 'Select a custom component block.')
      if (body.prompt) {
        const response = await assistant('custom', { prompt: prompt(body.prompt), packages: project.packages, previous: block.code })
        code = response
        model = response.model
      }
      const draftProject = withCustomCode(project, body.scope, code)
      const candidate = await snapshot(draftProject)
      const draft = id()
      drafts.set(draft, { projectId, base: current.revision, revision: candidate })
      const page = project.pages.find(page => page.id === body.scope.pageId)
      return json(response, { draft, url: previewURL(projectId, candidate, page.slug), before: block.code, after: { jsx: code.jsx, css: code.css || '' }, model })
    } else if (method === 'ai' || method === 'behavior') {
      const scope = body.scope
      const context = scopedContext(project, scope)
      let image
      if (body.captureId) {
        need(/^[a-f0-9-]{36}$/.test(body.captureId), 'Invalid screenshot.')
        image = await fileWithin(path.join(projectPath(projectId), 'captures'), [body.captureId + '.png'])
      }
      if (method === 'behavior') {
        const block = context.pages[0]?.regions[0]?.blocks[0]
        need(scope.level === 'area' && scope.blockIds?.length === 1 && block?.kind === 'viewer', 'Select one 3D viewer.')
        const instruction = prompt(body.prompt)
        const requested = instruction.match(/\/webmaker-[a-z0-9-]+/i)?.[0].toLowerCase()
        const allowed = ['/webmaker-reactthreefiber', '/webmaker-drei', '/webmaker-model-viewer', '/webmaker-react-postprocessing']
        need(!requested || allowed.includes(requested), 'Choose a 3D behavior skill: React Three Fiber, Drei, Model Viewer, or React Postprocessing.')
        const skill = requested || (project.renderer === 'fiber' ? '/webmaker-reactthreefiber' : '/webmaker-model-viewer')
        need((skill === '/webmaker-model-viewer') === (project.renderer === 'viewer'), 'That skill uses a different renderer. Select a matching skill or switch this site to Fiber and Drei.')
        const guide = await readFile(path.join(root, 'skills', skill.slice(1), 'SKILL.md'), 'utf8')
        const scene = project.scenes.find(item => item.id === block.sceneId)
        const answer = await assistant('behavior', { prompt: instruction, skill, guide, renderer: project.renderer, existing: block.behavior, objects: scene.objects, clips: scene.clips }, image)
        summary = answer.summary
        model = answer.model
        const behavior = { ...JSON.parse(answer.behaviorJson), skill }
        next = applyEdits(project, scope, [{ op: 'patch', pageId: scope.pageId, regionId: scope.regionId, blockId: block.id, patch: { behavior } }])
      } else {
        const answer = await assistant('edit', { prompt: prompt(body.prompt), scope, context }, image)
        summary = answer.summary
        model = answer.model
        const edits = JSON.parse(answer.editsJson)
        if (Array.isArray(edits) && !edits.length) return json(response, { ...safeState(current), summary, model })
        next = applyEdits(project, scope, edits)
      }
    } else throw new Error('Unknown project action.')
    const saved = revision || await snapshot(next)
    await activate(projectId, [...current.history, saved])
    return json(response, { ...safeState(await state(projectId)), summary, model })
  })
}

const uiFiles = new Set(['index.html', 'studio.js', 'studio.css'])
const app = createServer(async (request, response) => {
  try {
    if (request.headers.host !== new URL(studioOrigin).host) return json(response, { error: 'Use the local Studio address.' }, 403)
    const url = new URL(request.url, studioOrigin)
    if (url.pathname.startsWith('/api/')) return await handleAPI(request, response, url)
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
    if (!uiFiles.has(name) || request.method !== 'GET') return send(response, 404, 'Not found')
    let body = await readFile(path.join(root, 'studio', 'ui', name))
    if (name === 'index.html') body = body.toString().replace('WEBMAKER_SESSION_TOKEN', token)
    return send(response, 200, body, { 'Content-Type': types[path.extname(name)], 'Content-Security-Policy':
      `default-src 'self'; frame-src ${previewOrigin}; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'` })
  } catch (error) {
    json(response, { error: error.code === 'ENOENT' ? 'This project or file is unavailable.' : error.message,
      code: error.code === 'SESSION_EXPIRED' ? error.code : undefined }, error.code === 'SESSION_EXPIRED' ? 401 : 400)
  }
})

const preview = createServer(async (request, response) => {
  try {
    if (request.headers.host !== new URL(previewOrigin).host || request.method !== 'GET') return send(response, 403, 'Preview unavailable')
    const url = new URL(request.url, previewOrigin)
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (url.pathname === '/bridge.js') return send(response, 200, bridge, { ...headers, 'Content-Type': types['.js'] })
    const [projectId, revision, ...parts] = decodeURIComponent(url.pathname).split('/').slice(1)
    if (!parts.at(-1)) parts[parts.length - 1] = 'index.html'
    const directory = path.join(snapshotPath(projectId, revision), 'dist')
    const file = await fileWithin(directory, parts)
    const custom = parts[0] === 'custom'
    if (!(await stat(file)).isFile()) return send(response, 404, 'Preview file unavailable')
    const extension = path.extname(file)
    let body = await readFile(file)
    if (extension === '.html' && !custom) body = body.toString().replace('</body>', '<script src="/bridge.js"></script></body>')
    const policy = custom ? `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; sandbox allow-scripts` :
      `default-src 'none'; script-src ${previewOrigin} 'wasm-unsafe-eval'; style-src 'unsafe-inline' ${previewOrigin}; img-src data: blob: ${previewOrigin}; connect-src ${previewOrigin} blob: data:; worker-src blob:; frame-src ${previewOrigin}; frame-ancestors ${studioOrigin}; base-uri 'none'`
    return send(response, 200, body, { ...headers, 'Content-Type': types[extension] || 'application/octet-stream', 'Content-Security-Policy': policy })
  } catch {
    send(response, 404, 'Preview file unavailable')
  }
})

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => { server.removeListener('error', reject); resolve(`http://${host}:${server.address().port}`) })
  })
}

export async function startStudio({ ai = askAI, port = Number(process.env.WEBMAKER_STUDIO_PORT || 0) } = {}) {
  assistant = ai
  previewOrigin = await listen(preview)
  try { studioOrigin = await listen(app, port) } catch (error) { preview.close(); throw error }
  return { studioOrigin, previewOrigin, close: () => Promise.all([app, preview].map(server => new Promise(resolve => server.close(resolve)))) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const studio = await startStudio()
  console.log(`Webmaker Studio is ready. Open ${studio.studioOrigin}`)
}
