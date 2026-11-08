import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
const catalog = read('../catalog.json').skills
const runtime = read('../package.json').dependencies
const viewerProfile = read('../integrations/model-viewer/package.json').dependencies
const starter = read('../templates/product-showcase/package.json')
export const kinds = ['text', 'image', 'tabs', 'gallery', 'button', 'viewer', 'custom']
export const themes = ['graphite', 'paper', 'midnight']
export const sample = 'form-01.glb'
export const presets = read('./presets.json')
export const presetModels = Object.fromEntries(Object.values(presets).map(preset => [preset.model, preset.label]))
const fiber = '@react-three/fiber'
const drei = '@react-three/drei'
const viewer = '@google/model-viewer'
const shader = '@shadergradient/react'
const post = '@react-three/postprocessing'
const glass = 'liquid-glass-react'
const supported = [fiber, drei, viewer, shader, post, glass]
const tools = ['@gltf-transform/cli', 'gltfjsx']
const explanations = {
  react: 'Renders editable pages and blocks.',
  'react-dom': 'Mounts the React site in the browser.',
  three: 'Provides the compatible 3D engine for the selected viewer.',
  vite: 'Builds the static site and provides a local development preview.',
  'three-stdlib': 'Provides Three.js helpers used by ShaderGradient.',
  'camera-controls': 'Provides camera movement for ShaderGradient scenes.',
  [fiber]: 'Builds a custom React scene with editable objects and materials.',
  [drei]: 'Adds GLB loading, model framing, and orbit controls to the scene.',
  [viewer]: 'Provides a ready-made model viewer for rotation and zoom.',
  [shader]: 'Adds an animated shader background when visitors enable motion.',
  [post]: 'Adds an optional bloom pass to selected 3D viewers.',
  [glass]: 'Adds refractive glass surfaces with a readable CSS fallback.',
  '@gltf-transform/cli': 'Inspects and optimizes models before publishing.',
  gltfjsx: 'Turns model parts into editable React components during development.'
}

export function need(condition, message) {
  if (!condition) throw new Error(message)
}

export const id = () => randomUUID()
export const slug = value => String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55).replace(/-$/, '') || 'site'
export const assetPattern = /^(?:(?:form-01|object-study|orbit-launch)(?:\.glb|-poster\.svg)|[a-f0-9]{64}\.(?:glb|png|jpg|webp))$/

function clean(value, name, max, required = false) {
  need(typeof value === 'string' && value.length <= max && (!required || value.trim()), `${name} must be ${required ? '1 to' : 'at most'} ${max} characters.`)
  return value.trim()
}

function choice(value, allowed, label) {
  need(allowed.includes(value), `Choose a valid ${label}.`)
  return value
}

function number(value, min, max, label) {
  need(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `${label} must be between ${min} and ${max}.`)
  return value
}

function asset(value, pattern) {
  need(typeof value === 'string' && assetPattern.test(value) && pattern.test(value), 'Upload a supported asset first.')
  return value
}

export function readBrief(input) {
  const preset = choice(input.preset || 'form-01', Object.keys(presets), 'starter')
  return {
    name: clean(input.name, 'Name', 70, true),
    idea: clean(input.idea, 'Idea', 2000, true),
    audience: clean(input.audience || '', 'Audience', 200),
    theme: choice(input.theme || 'graphite', themes, 'visual style'),
    preset,
    interaction: choice(input.interaction || 'orbit', ['orbit', 'custom'], '3D interaction'),
    effects: [...new Set((input.effects || []).map(name => choice(name, [shader, post, glass], 'effect')))],
    model: asset(input.model || presets[preset].model, /\.glb$/)
  }
}

export function recommend(brief) {
  const names = [brief.interaction === 'custom' || brief.effects.some(name => name === shader || name === post) ? fiber : viewer, ...brief.effects]
  return resolvePackages(brief, names)
}

export function resolvePackages(brief, tokens) {
  need(Array.isArray(tokens) && tokens.length > 0 && tokens.length <= 15, 'Enter package names or use the recommendations.')
  const requested = new Set()
  for (const token of tokens) {
    const name = clean(token, 'Package name', 80, true).toLowerCase()
    const skill = catalog.find(item => [item.command, item.name, item.codexInvocation].includes(name))
    const shared = ['react', 'react-dom', 'three', 'vite', 'three-stdlib', 'camera-controls']
    const names = skill ? skill.packages.filter(pkg => supported.includes(pkg) || tools.includes(pkg) || shared.includes(pkg)) : [name]
    need(names.length && names.every(pkg => supported.includes(pkg) || tools.includes(pkg) || shared.includes(pkg)), `${token} is not a Studio package. Choose a listed package or use its skill separately.`)
    for (const pkg of names) requested.add(pkg)
  }
  const needsFiber = brief.interaction === 'custom' || [fiber, drei, shader, post].some(pkg => requested.has(pkg))
  need(!(requested.has(viewer) && needsFiber), 'Model Viewer uses a different Three.js version. Use Fiber + Drei for object transforms, shaders, and bloom.')
  const renderer = needsFiber ? 'fiber' : 'viewer'
  const list = renderer === 'fiber' ? [fiber, drei] : [viewer]
  for (const pkg of requested) if (!list.includes(pkg)) list.push(pkg)
  const dev = [...new Set([...list.filter(pkg => tools.includes(pkg)), '@gltf-transform/cli', ...(renderer === 'fiber' ? ['gltfjsx'] : [])])]
  const packages = list.filter(pkg => supported.includes(pkg))
  const manifest = projectManifest({ renderer, packages, name: brief.name || 'site' })
  const dependencies = [...packages, ...Object.keys(manifest.dependencies).filter(name => !packages.includes(name)), 'vite']
  return { renderer, packages, recommendations: [...dependencies, ...dev].map(name => ({
    name, version: manifest.dependencies[name] || manifest.devDependencies[name] || read('../package.json').devDependencies[name],
    explanation: explanations[name], development: tools.includes(name) || name === 'vite', toolkit: tools.includes(name)
  })) }
}

export function projectManifest(project) {
  const dependencies = { react: runtime.react, 'react-dom': runtime['react-dom'], three: project.renderer === 'viewer' ? viewerProfile.three : runtime.three }
  for (const name of project.packages) dependencies[name] = runtime[name] || viewerProfile[name]
  if (project.packages.includes(shader)) {
    for (const name of ['three-stdlib', 'camera-controls']) dependencies[name] = runtime[name]
  }
  return { name: `webmaker-${slug(project.name)}`, version: '1.0.0', private: true, type: 'module',
    scripts: { dev: 'vite --host 127.0.0.1', build: 'vite build', preview: 'vite preview --host 127.0.0.1' },
    dependencies, devDependencies: { vite: starter.devDependencies.vite } }
}

const styles = () => ({ span: 12, minHeight: 0, padding: 24, fontSize: 32, font: 'system', color: '', background: '', motion: 'none', glass: false })
const imageSettings = () => ({ width: 100, height: 0, x: 0, y: 0, rotation: 0, flipX: false, flipY: false })
const transform = () => ({ scale: 1, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, object: '' })
export const noBehavior = () => ({ action: 'none', trigger: 'open', seconds: 3, clip: '', skill: '/webmaker-reactthreefiber', object: '' })

export function block(kind, text = '', extra = {}) {
  return { id: id(), kind: choice(kind, kinds, 'block'), text, url: '', images: [], tabs: [{ label: 'Details', text: 'Add your details here.' }],
    style: styles(), image: imageSettings(), transform: transform(), behavior: noBehavior(), sceneId: '', code: null, ...extra }
}

const region = (title, blocks = []) => ({ id: id(), title, style: styles(), blocks })

export function newProject(brief, selection, draft = {}) {
  const bundled = Object.values(presets).find(preset => preset.model === brief.model)
  const scene = { id: id(), model: brief.model, poster: bundled?.poster || '', label: bundled?.label || 'Uploaded model' }
  const intro = clean(draft.intro || brief.idea, 'Introduction', 2000)
  const about = clean(draft.about || (brief.audience ? `Created for ${brief.audience}.` : 'Add more about your project here.'), 'About copy', 2000)
  const project = {
    id: id(), name: brief.name, idea: brief.idea, audience: brief.audience, theme: brief.theme,
    renderer: selection.renderer, packages: selection.packages, scenes: [scene],
    pages: [
      { id: id(), slug: '', title: 'Home', regions: [
        region('Introduction', [block('text', intro, { style: { ...styles(), fontSize: 34 } }), block('button', 'View showcase', { url: '/showcase/' })]),
        region('3D preview', [block('viewer', 'Explore in 3D', { sceneId: scene.id })])
      ] },
      { id: id(), slug: 'showcase', title: 'Showcase', regions: [
        region('Interactive model', [block('viewer', 'Explore in 3D', { sceneId: scene.id })]),
        region('Details', [block('tabs', 'Details', { tabs: [{ label: 'Overview', text: intro }, { label: 'About', text: about }] })])
      ] },
      { id: id(), slug: 'about', title: 'About', regions: [region('About this project', [block('text', about)])] }
    ]
  }
  if (brief.preset === 'object-study') {
    project.pages[1].regions.push(region('Gallery', [block('gallery', 'Selected images')]))
    project.pages[2].regions[0].title = 'About the artist'
  }
  if (brief.preset === 'orbit-launch') {
    project.pages[0].regions.push(region('Launch details', [block('tabs', 'Launch details', {
      tabs: [{ label: 'The idea', text: intro }, { label: 'Who it is for', text: about }]
    })]))
  }
  return project
}

const rules = {
  style: {
    span: [1, 12], minHeight: [0, 1200], padding: [0, 160], fontSize: [12, 120],
    font: ['system', 'serif', 'mono'], color: 'color', background: 'color',
    motion: ['none', 'rise', 'fade'], glass: 'boolean'
  },
  image: { width: [5, 200], height: [0, 1200], x: [-100, 100], y: [-100, 100], rotation: [-360, 360], flipX: 'boolean', flipY: 'boolean' },
  transform: { scale: [.05, 10], x: [-20, 20], y: [-20, 20], z: [-20, 20], rx: [-360, 360], ry: [-360, 360], rz: [-360, 360], object: 'name' }
}

function updateProperties(previous, values, group) {
  need(values && typeof values === 'object' && !Array.isArray(values), `Invalid ${group} settings.`)
  const next = { ...previous }
  for (const [key, value] of Object.entries(values)) {
    const rule = Object.hasOwn(rules[group], key) && rules[group][key]
    need(rule, `Unknown ${group} property ${key}.`)
    if (rule === 'color') need(value === '' || /^#[0-9a-f]{6}$/i.test(value), 'Use a six-digit hex color.')
    else if (rule === 'boolean') need(typeof value === 'boolean', `${key} must be on or off.`)
    else if (rule === 'name') clean(value, 'Object name', 100)
    else if (typeof rule[0] === 'number') number(value, ...rule, key)
    else choice(value, rule, key)
    next[key] = key === 'span' ? Math.round(value) : value
  }
  return next
}

function readBehavior(value) {
  return {
    action: choice(value.action, ['none', 'spin', 'tilt', 'clip', 'reset'], '3D action'),
    trigger: choice(value.trigger, ['open', 'press', 'hover'], '3D trigger'),
    seconds: number(value.seconds ?? 3, .25, 30, 'Duration'),
    clip: clean(value.clip || '', 'Animation name', 100),
    object: clean(value.object || '', 'Object name', 100),
    skill: choice(value.skill || '/webmaker-reactthreefiber', catalog.filter(item =>
      ['webmaker-reactthreefiber', 'webmaker-drei', 'webmaker-model-viewer', 'webmaker-react-postprocessing'].includes(item.name)
    ).map(item => item.command), '3D skill')
  }
}

function patchBlock(project, target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'style' || key === 'image' || key === 'transform') {
      if (key === 'image') need(['image', 'gallery'].includes(target.kind), 'Select an image or gallery.')
      if (key === 'transform') need(target.kind === 'viewer' && project.renderer === 'fiber', 'Object transforms require React Three Fiber and Drei.')
      target[key] = updateProperties(target[key], value, key)
      if (key === 'transform' && target.transform.object) {
        const scene = project.scenes.find(item => item.id === target.sceneId)
        need(scene?.objects?.includes(target.transform.object), 'Select a named object in this model.')
      }
    } else if (key === 'text') target.text = clean(value, 'Text', 2000)
    else if (key === 'url') {
      need(target.kind === 'button' && typeof value === 'string' && value.length <= 500 &&
        (value === '' || /^\/(?:[a-z0-9-]+\/)?$/.test(value) || /^https:\/\/[^\s]+$/.test(value)), 'Use a page path or HTTPS link.')
      target.url = value
    } else if (key === 'images') {
      need(['image', 'gallery'].includes(target.kind) && Array.isArray(value) && value.length <= 8, 'Select an image or gallery.')
      target.images = value.map(entry => ({ src: asset(entry.src, /\.(png|jpg|webp)$/), alt: clean(entry.alt || '', 'Image description', 160) }))
    } else if (key === 'tabs') {
      need(target.kind === 'tabs' && Array.isArray(value) && value.length > 0 && value.length <= 8, 'Use one to eight content tabs.')
      target.tabs = value.map(entry => ({ label: clean(entry.label, 'Tab label', 50, true), text: clean(entry.text, 'Tab content', 2000) }))
    } else if (key === 'behavior') {
      need(target.kind === 'viewer', 'Select a 3D viewer.')
      const behavior = readBehavior(value)
      const scene = project.scenes.find(item => item.id === target.sceneId)
      need(!behavior.object || scene?.objects?.includes(behavior.object), 'Select a named object in this model.')
      need(behavior.action !== 'clip' || (scene?.clips?.length && (!behavior.clip || scene.clips.includes(behavior.clip))), 'Choose a model that has the requested animation clip.')
      need(project.renderer === 'fiber' || behavior.action === 'none' || (behavior.action === 'clip' && behavior.trigger !== 'hover' && !behavior.object), 'This behavior requires React Three Fiber and Drei.')
      target.behavior = behavior
    } else throw new Error(`Unknown block setting ${key}.`)
  }
}

function blockAt(area, blockId, scope) {
  const target = area.blocks.find(item => item.id === blockId)
  need(target && (!scope.blockIds?.length || scope.blockIds.includes(blockId)), 'That block is outside the selection.')
  return target
}

export function applyEdits(previous, scope, edits) {
  need(scope && ['area', 'page', 'site'].includes(scope.level), 'Select an edit scope.')
  need(Array.isArray(edits) && edits.length > 0 && edits.length <= 30, 'Use one to thirty edits at a time.')
  const project = structuredClone(previous)
  for (const edit of edits) {
    if (edit.op === 'site') {
      need(scope.level === 'site', 'Switch to whole site scope to change site settings.')
      if (edit.name !== undefined) project.name = clean(edit.name, 'Site name', 70, true)
      if (edit.theme !== undefined) project.theme = choice(edit.theme, themes, 'visual style')
      continue
    }
    if (edit.op === 'addPage') {
      need(scope.level === 'site' && project.pages.length < 20, 'Use whole site scope to add a page.')
      const title = clean(edit.title, 'Page title', 60, true)
      const pageSlug = slug(title)
      need(!['media', 'assets', 'index-html'].includes(pageSlug) && !project.pages.some(item => item.slug === pageSlug), 'That page URL is already in use or reserved.')
      project.pages.push({ id: id(), slug: pageSlug, title, regions: [region('Main', [block('text', 'Add your text here.')])] })
      continue
    }
    const page = project.pages.find(item => item.id === edit.pageId)
    need(page && (scope.level === 'site' || page.id === scope.pageId), 'That page is outside the selection.')
    if (edit.op === 'renamePage' || edit.op === 'addArea') {
      need(scope.level !== 'area', 'Switch to page scope to edit the page.')
      const title = clean(edit.title, 'Title', 60, true)
      if (edit.op === 'renamePage') page.title = title
      else page.regions.push(region(title))
      continue
    }
    const area = page.regions.find(item => item.id === edit.regionId)
    need(area && (scope.level !== 'area' || area.id === scope.regionId), 'That area is outside the selection.')
    if (edit.op === 'areaStyle') {
      need(!scope.blockIds?.length, 'Select the entire area to change its style.')
      area.style = updateProperties(area.style, edit.patch, 'style')
      continue
    }
    if (edit.op === 'add') {
      need(!scope.blockIds?.length && area.blocks.length < 50, 'Select the entire area to insert a block.')
      const next = block(edit.kind, edit.kind === 'viewer' ? 'Explore in 3D' : edit.kind === 'button' ? 'Learn more' : 'Add your content here.')
      if (next.kind === 'viewer') next.sceneId = project.scenes[0].id
      if (edit.patch) patchBlock(project, next, edit.patch)
      area.blocks.splice(edit.index === undefined ? area.blocks.length : Math.round(number(edit.index, 0, area.blocks.length, 'Position')), 0, next)
      continue
    }
    const target = blockAt(area, edit.blockId, scope)
    const index = area.blocks.indexOf(target)
    switch (edit.op) {
      case 'patch': patchBlock(project, target, edit.patch); break
      case 'delete': area.blocks.splice(index, 1); break
      case 'duplicate':
        need(area.blocks.length < 50, 'This area has reached its block limit.')
        area.blocks.splice(index + 1, 0, { ...structuredClone(target), id: id() })
        break
      case 'move': {
        const destination = Math.round(number(edit.index, 0, area.blocks.length - 1, 'Position'))
        area.blocks.splice(index, 1)
        area.blocks.splice(destination, 0, target)
        break
      }
      case 'model': {
        need(target.kind === 'viewer', 'Select a 3D viewer.')
        const old = project.scenes.find(item => item.id === target.sceneId)
        const scene = { id: id(), model: asset(edit.model, /\.glb$/), poster: edit.poster ? asset(edit.poster, /\.(png|jpg|webp)$|^(?:form-01|object-study|orbit-launch)-poster\.svg$/) : '', label: presetModels[edit.model] || 'Uploaded model' }
        project.scenes.push(scene)
        target.sceneId = scene.id
        if (edit.model !== old?.model) {
          target.transform.object = ''
          target.behavior = noBehavior()
        }
        break
      }
      case 'share':
        need(scope.level === 'site' && target.kind === 'viewer' && project.renderer === 'fiber', 'Use whole site scope to update shared model placements.')
        for (const item of project.pages.flatMap(p => p.regions.flatMap(r => r.blocks))) {
          if (item.kind === 'viewer' && item.sceneId === target.sceneId) item.transform = { ...target.transform }
        }
        break
      default: throw new Error('Unsupported edit.')
    }
  }
  return project
}

export function withCustomCode(project, scope, code) {
  const copy = structuredClone(project)
  const page = copy.pages.find(item => item.id === scope.pageId)
  const area = page?.regions.find(item => item.id === scope.regionId)
  const target = area?.blocks.find(item => item.id === scope.blockId)
  need(target?.kind === 'custom', 'Select a custom component block first.')
  target.code = { jsx: clean(code.jsx, 'React component', 16000, true), css: clean(code.css || '', 'CSS', 12000) }
  return copy
}

export function projectAssets(project) {
  return [...new Set([
    ...project.scenes.flatMap(scene => [scene.model, scene.poster].filter(Boolean)),
    ...project.pages.flatMap(page => page.regions.flatMap(area => area.blocks.flatMap(item => item.images.map(image => image.src))))
  ])]
}
