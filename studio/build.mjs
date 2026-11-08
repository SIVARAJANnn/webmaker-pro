import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile, copyFile, readdir, rename, access, link } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PropertyBinding } from 'three'
import { assetPattern, id, need, presetModels, projectAssets, projectManifest, sample } from './project.mjs'

const exec = promisify(execFile)
export const root = fileURLToPath(new URL('../', import.meta.url))
const studio = path.join(root, 'studio')
export const data = path.resolve(process.env.WEBMAKER_STUDIO_DATA || path.join(root, '.studio'))
const starter = path.join(root, 'templates', 'product-showcase')
const requireStarter = createRequire(path.join(starter, 'package.json'))
const requireViewer = createRequire(path.join(root, 'integrations', 'model-viewer', 'package.json'))
const { build } = await import(pathToFileURL(requireStarter.resolve('vite')).href)
const assetDir = path.join(data, 'uploads')
const html = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const json = value => JSON.stringify(value, null, 2) + '\n'
const storageId = /^[a-f0-9-]{36}$/
export const projectPath = projectId => path.join(data, 'projects', validId(projectId))
export const snapshotPath = (projectId, revision) => path.join(projectPath(projectId), 'snapshots', validId(revision))

function validId(value) {
  need(storageId.test(value), 'Invalid project or revision.')
  return value
}

function assetSource(filename) {
  if (filename === sample) return path.join(starter, 'assets', sample)
  return path.join(Object.hasOwn(presetModels, filename) || filename.endsWith('-poster.svg') ? path.join(studio, 'assets') : assetDir, filename)
}

async function linkAsset(source, target) {
  try { await link(source, target) } catch (error) {
    if (!['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error
    await copyFile(source, target)
  }
}

function glbDocument(bytes) {
  need(bytes.length >= 20 && bytes.readUInt32LE(16) === 0x4e4f534a && 20 + bytes.readUInt32LE(12) <= bytes.length, 'The GLB is missing model data.')
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8').trim())
}

export async function saveAsset(name, bytes) {
  const extension = path.extname(name).toLowerCase().replace('.jpeg', '.jpg')
  const mime = {
    '.glb': bytes.length >= 20 && bytes.subarray(0, 4).toString() === 'glTF' && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length,
    '.png': bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    '.jpg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    '.webp': bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
  }
  need(mime[extension] && bytes.length <= (extension === '.glb' ? 40 : 10) * 1024 * 1024, 'Use a valid GLB (up to 40 MB) or PNG, JPG, or WebP image (up to 10 MB).')
  if (extension === '.glb') {
    const model = glbDocument(bytes)
    need(!(model.buffers || []).some(buffer => buffer.uri && !buffer.uri.startsWith('data:')) &&
      !(model.images || []).some(image => image.uri && !image.uri.startsWith('data:')), 'Export a self-contained GLB with embedded geometry and textures.')
    const required = model.extensionsRequired || []
    need(!required.some(item => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(item)), 'For this Studio import, export a GLB without Draco, Meshopt, or KTX2 compression.')
  }
  const filename = createHash('sha256').update(bytes).digest('hex') + extension
  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, filename), bytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error })
  return filename
}

export async function state(projectId) {
  const pointer = JSON.parse(await readFile(path.join(projectPath(projectId), 'current.json'), 'utf8'))
  const revision = pointer.history.at(-1)
  const project = JSON.parse(await readFile(path.join(snapshotPath(projectId, revision), 'site.json'), 'utf8'))
  return { project, revision, canUndo: pointer.history.length > 1, history: pointer.history }
}

export async function projects() {
  const items = await readdir(path.join(data, 'projects'), { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const list = await Promise.all(items.filter(item => item.isDirectory() && storageId.test(item.name)).map(async item => {
    try {
      const { project } = await state(item.name)
      return { id: project.id, name: project.name }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }))
  return list.filter(Boolean)
}

export async function activate(projectId, history) {
  const directory = projectPath(projectId)
  const pending = path.join(directory, `current-${id()}.json`)
  await writeFile(pending, json({ history }))
  await rename(pending, path.join(directory, 'current.json'))
}

const config = `import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import site from './src/site.json' with { type: 'json' }
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(site.pages.map(page => [page.slug || 'home', fileURLToPath(new URL(page.slug ? './' + page.slug + '/index.html' : './index.html', import.meta.url))]))
    }
  }
})
`

function resolver(project) {
  const aliases = []
  if (project.renderer === 'viewer') {
    aliases.push({ find: /^@google\/model-viewer$/, replacement: requireViewer.resolve('@google/model-viewer') })
    aliases.push({ find: /^three$/, replacement: requireViewer.resolve('three').replace(/three\.cjs$/, 'three.module.js') })
  }
  return { alias: aliases, dedupe: ['react', 'react-dom'] }
}

async function customBlock(directory, project, item) {
  need(!/\bimport\s*\.\s*meta\b/.test(item.code.jsx), 'Custom blocks cannot read files through import.meta.')
  need(!/@import\b|\burl\s*\(/i.test(item.code.css), 'Use self-contained CSS in custom blocks.')
  const source = path.join(directory, 'src', 'custom', item.id)
  await mkdir(source, { recursive: true })
  const component = path.join(source, 'component.jsx')
  await writeFile(component, item.code.jsx)
  await writeFile(path.join(source, 'custom.css'), item.code.css)
  const entry = path.join(source, 'entry.jsx')
  await writeFile(entry, `import React from 'react'
import { createRoot } from 'react-dom/client'
import Custom from './component.jsx'
import './custom.css'
createRoot(document.getElementById('app')).render(<Custom />)
`)
  const packages = Object.keys(projectManifest(project).dependencies)
  const bundles = await build({ root: directory, configFile: false, logLevel: 'silent', publicDir: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    resolve: resolver(project),
    plugins: [{
      name: 'webmaker-custom-boundary',
      enforce: 'pre',
      resolveId(specifier, importer) {
        if (!importer || ![entry, component].some(file => path.resolve(importer) === file)) return
        if (importer.endsWith('entry.jsx') && ['./component.jsx', './custom.css'].includes(specifier)) return
        if (!['react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client'].includes(specifier) && !packages.includes(specifier)) {
          this.error(`Custom blocks can only import selected runtime packages. Unsupported import: ${specifier}`)
        }
      }
    }],
    build: { write: false, lib: { entry, name: 'WebmakerBlock', formats: ['iife'] }, assetsInlineLimit: 0 }
  })
  const output = (Array.isArray(bundles) ? bundles : [bundles]).flatMap(bundle => bundle.output)
  const code = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n').replace(/<\/script/gi, '<\\/script')
  const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => item.source).join('\n').replace(/<\/style/gi, '<\\/style')
  await mkdir(path.join(directory, 'public', 'custom'), { recursive: true })
  await writeFile(path.join(directory, 'public', 'custom', `${item.id}.html`), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>Custom component</title><style>body{margin:0;font-family:system-ui} ${css}</style><div id="app"></div><script>${code}</script></html>`)
}

export async function snapshot(project) {
  const revision = id()
  const directory = snapshotPath(project.id, revision)
  const src = path.join(directory, 'src')
  await mkdir(path.join(directory, 'public', 'media'), { recursive: true })
  await mkdir(src, { recursive: true })
  for (const file of ['main.jsx', 'site.css']) await copyFile(path.join(studio, 'site', file), path.join(src, file))
  await copyFile(path.join(studio, 'site', project.renderer === 'fiber' ? 'fiber.jsx' : 'model-viewer.jsx'), path.join(src, 'viewer.jsx'))
  const imports = {}
  for (const [key, name] of Object.entries({ glass: 'liquid-glass-react', bloom: '@react-three/postprocessing', shader: '@shadergradient/react' })) {
    if (!project.packages.includes(name)) continue
    await copyFile(path.join(studio, 'site', `${key}.jsx`), path.join(src, `${key}.jsx`))
    imports[key] = `() => import('./${key}.jsx')`
  }
  await writeFile(path.join(src, 'features.js'), `export default { ${Object.entries(imports).map(([key, value]) => `${key}: ${value}`).join(', ')} }\n`)
  for (const filename of projectAssets(project)) {
    need(assetPattern.test(filename), 'Invalid asset path.')
    await linkAsset(assetSource(filename), path.join(directory, 'public', 'media', filename)).catch(error => {
      if (error.code === 'ENOENT') throw new Error('An asset is missing. Upload it before saving.')
      throw error
    })
  }
  for (const scene of project.scenes) {
    if (scene.objects && scene.clips) continue
    const model = glbDocument(await readFile(assetSource(scene.model)))
    scene.objects = [...new Set((model.nodes || []).map(node => node.name && PropertyBinding.sanitizeNodeName(node.name)).filter(name => name && name.length <= 100))].slice(0, 300)
    scene.clips = [...new Set((model.animations || []).map((animation, index) => animation.name || 'animation_' + index).filter(name => name.length <= 100))]
  }
  // Keep user copy and configuration out of HTML attributes unless escaped here.
  const inputs = {}
  for (const [index, page] of project.pages.entries()) {
    const folder = path.join(directory, page.slug)
    await mkdir(folder, { recursive: true })
    const target = path.join(folder, 'index.html')
    inputs[page.slug || 'home'] = target
    await writeFile(target, `<!doctype html>
<html lang="en" data-page="${index}" data-theme="${project.theme}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="webmaker-root" content="${page.slug ? '../' : './'}"><meta name="description" content="${html(project.idea.slice(0, 160))}">
<title>${html(page.slug ? `${page.title} — ${project.name}` : project.name)}</title></head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`)
  }
  await writeFile(path.join(directory, 'site.json'), json(project))
  const { pages, scenes, name, renderer } = project
  // The browser doesn't need code drafts, workspace metadata, or other editor state.
  const publicPages = pages.map(page => ({ ...page, regions: page.regions.map(area => ({
    ...area, blocks: area.blocks.map(item => ({ ...item, code: Boolean(item.code) }))
  })) }))
  await writeFile(path.join(src, 'site.json'), json({ name, renderer, pages: publicPages, scenes }))
  await writeFile(path.join(directory, 'package.json'), json(projectManifest(project)))
  await writeFile(path.join(directory, 'vite.config.mjs'), config)
  for (const item of pages.flatMap(page => page.regions.flatMap(area => area.blocks))) {
    if (item.kind === 'custom' && item.code) await customBlock(directory, project, item)
  }
  await build({ root: directory, configFile: false, base: './', logLevel: 'silent',
    resolve: resolver(project),
    build: { copyPublicDir: false, assetsInlineLimit: 0, rollupOptions: { input: inputs } }
  })
  await mkdir(path.join(directory, 'dist', 'media'), { recursive: true })
  for (const filename of projectAssets(project)) await linkAsset(assetSource(filename), path.join(directory, 'dist', 'media', filename))
  const custom = path.join(directory, 'public', 'custom')
  if (await access(custom).then(() => true, () => false)) await cp(custom, path.join(directory, 'dist', 'custom'), { recursive: true })
  return revision
}

export async function exportProject(projectId, revision) {
  const source = snapshotPath(projectId, revision)
  const project = JSON.parse(await readFile(path.join(source, 'site.json'), 'utf8'))
  const name = projectManifest(project).name
  const exports = path.join(data, 'exports')
  await mkdir(exports, { recursive: true })
  const destination = path.join(exports, `${name}-${revision.slice(0, 8)}`)
  const lock = path.join(destination, 'package-lock.json')
  if (await access(lock).then(() => true, () => false)) return destination
  await cp(source, destination, { recursive: true })
  const npm = process.env.npm_execpath
  need(npm, 'Start Studio with npm run studio to export a dependency lockfile.')
  try {
    await exec(process.execPath, [npm, 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'], {
      cwd: destination, windowsHide: true, timeout: 120_000, maxBuffer: 200_000
    })
  } catch {
    throw new Error(`The site built successfully, but npm could not create its lockfile. The static dist is at ${destination}. Retry export once npm is reachable.`)
  }
  await writeFile(path.join(destination, 'README.md'), '# Webmaker export\n\nUpload the contents of dist to a static host, or run npm ci and npm run dev to edit the source. Reopen Studio to rebuild custom code blocks.\n')
  return destination
}
