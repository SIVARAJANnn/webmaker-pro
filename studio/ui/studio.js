const app = document.querySelector('#app')
const status = document.querySelector('#status')
const projects = document.querySelector('#projects')
const token = document.querySelector('meta[name="webmaker-token"]').content
const kinds = { text: 'Text', image: 'Image', tabs: 'Content tabs', gallery: 'Gallery', button: 'Button / link', viewer: '3D viewer', custom: 'Custom component' }
const panels = { content: 'Content', resize: 'Resize', ai: 'AI Editor', behavior: '3D Behavior', code: 'Custom Code', capture: 'Screenshot' }
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const options = (items, selected) => Object.entries(items).map(([value, label]) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(label)}</option>`).join('')
const selected = (a, b) => a === b ? 'true' : 'false'
let current, brief, selection, previewOrigin, pageId, regionId, blockIds = [], panel = 'content'
let scopeLevel = 'area', editing = true, phone = false, nonce, rectangle, capture, draft, restore, resolveFrame, busy = false
let resizeMode = 'block'
let packageRequest

function notice(message = '', error = false) {
  const local = app.querySelector('#package-status')
  const target = local || status
  if (local) status.hidden = true
  target.textContent = message
  target.hidden = !message
  target.classList.toggle('error', error)
}

async function api(action, body, raw, signal) {
  const headers = { 'X-Webmaker-Token': token }
  if (body && !raw) headers['Content-Type'] = 'application/json'
  const response = await fetch('/api/' + action, { headers, signal, method: body ? 'POST' : 'GET', body: raw ? body : body ? JSON.stringify(body) : undefined })
  const result = await response.json()
  if (result.code === 'SESSION_EXPIRED') document.querySelector('#reconnect').hidden = false
  if (!response.ok) throw new Error(result.error || 'The request failed.')
  return result
}

async function run(message, fn) {
  if (busy) return
  busy = true
  notice(message)
  app.setAttribute('aria-busy', 'true')
  const buttons = [...app.querySelectorAll('[data-package-controls] button:enabled')]
  buttons.forEach(button => { button.disabled = true })
  try { await fn() } catch (error) { notice(error.message, true) }
  finally {
    buttons.forEach(button => { button.disabled = false })
    app.removeAttribute('aria-busy')
    busy = false
  }
}

const getPage = () => current?.project.pages.find(item => item.id === pageId)
const getArea = () => getPage()?.regions.find(item => item.id === regionId)
const getBlock = () => blockIds.length === 1 ? getArea()?.blocks.find(item => item.id === blockIds[0]) : null
const areaScope = (ids = blockIds) => ({ level: 'area', pageId, regionId, blockIds: ids })
const projectAPI = (action, body) => api(`projects/${current.project.id}/${action}`, { revision: current.revision, ...body })
const preview = () => document.querySelector('#preview')
const tellFrame = (type, detail) => preview()?.contentWindow?.postMessage({ type, detail, nonce }, '*')
const syncFrame = () => tellFrame('selection', { regionId, blockIds, editing, resizeMode: panel === 'resize' ? resizeMode : 'block' })

async function refreshProjects() {
  const result = await api('projects')
  previewOrigin = result.previewOrigin
  projects.innerHTML = '<option value="">Saved projects</option>' + options(Object.fromEntries(result.projects.map(item => [item.id, item.name])), current?.project.id)
}

const artwork = `<div class="welcome-art" aria-hidden="true"><svg viewBox="0 0 260 160" fill="none">
<path d="M30 112 130 143 231 112 130 82Z M30 96 130 127 231 96 M30 128 130 158 231 128" stroke="#49706a"/>
<path d="M72 43 130 22 189 43 130 66Z" fill="#78d6b4" stroke="#a3f0d2"/>
<path d="M72 43v59l58 22V66Z" fill="#30776a" stroke="#8bdbbf"/>
<path d="M130 66v58l59-22V43Z" fill="#21534b" stroke="#8bdbbf"/>
<path d="M130 9v22M60 43H40m179 0h-20" stroke="#85dfc4"/>
</svg></div>`

function welcome(step, content) {
  app.innerHTML = `<div class="welcome"><section class="welcome-copy"><p class="eyebrow">${step}</p>
    <h1>Build your first<br>3D website.</h1><p class="muted">Start with an idea. Choose how visitors interact with your model, then shape the site in a live preview.</p>${artwork}</section>
    <section class="card">${content}</section></div>`
}

function showBrief() {
  cancelPackageRequest()
  current = null
  projects.value = ''
  welcome('01 / YOUR IDEA', `<h2>Tell us about the site</h2><form class="fields" data-form="brief">
    <label class="field">Site name<input name="name" maxlength="70" required placeholder="Orbit Studio" value="${esc(brief?.name)}"></label>
    <label class="field">What are you making?<textarea name="idea" maxlength="2000" required placeholder="A product showcase for a desk lamp.">${esc(brief?.idea)}</textarea></label>
    <label class="field">Who is it for?<input name="audience" maxlength="200" placeholder="People setting up a home workspace" value="${esc(brief?.audience)}"></label>
    <label class="field">Starter layout<select name="preset">${options({ 'form-01': 'Form 01 · Product', 'object-study': 'Object Study · Portfolio', 'orbit-launch': 'Orbit · Launch' }, brief?.preset || 'form-01')}</select></label>
    <div class="row"><label class="field">Visual style<select name="theme">${options({ graphite: 'Graphite', paper: 'Warm paper', midnight: 'Midnight blue' }, brief?.theme || 'graphite')}</select></label>
    <label class="field">3D interaction<select name="interaction">${options({ orbit: 'Rotate and zoom', custom: 'Move objects and add behaviors' }, brief?.interaction || 'orbit')}</select></label></div>
    <fieldset class="choices"><legend>Optional effects</legend>
    ${Object.entries({ '@shadergradient/react': 'Animated background', '@react-three/postprocessing': 'Bloom', 'liquid-glass-react': 'Liquid Glass' }).map(([key, label]) => `<label><input type="checkbox" name="effect" value="${key}" ${brief?.effects.includes(key) ? 'checked' : ''}>${label}</label>`).join('')}</fieldset>
    <label class="field">3D model (.glb, optional)<input name="model" type="file" accept=".glb"><small>${brief?.model ? 'Uploaded model saved for this draft.' : 'Leave blank to start with the sample speaker.'}</small></label>
    <button class="primary" type="submit">Show recommended packages</button>
  </form>`)
}

function showPackages(result, mode = '') {
  selection = result
  const choosing = mode === 'choosing'
  const manual = mode === 'manual'
  status.hidden = true
  welcome('02 / YOUR TOOLKIT', `<h2>Choose the packages</h2><p class="muted">Webmaker uses these packages to build the site. Tools marked development stay out of the browser.</p>
    ${result.note ? `<p class="panel-note">${esc(result.note)}</p>` : ''}
    ${result.model ? `<p class="panel-note">Selected with ${esc(result.model)}</p>` : ''}
    <ul class="recommendations">${result.recommendations.map(item => `<li><code>${esc(item.name)}</code> <small>${esc(item.version)} · ${item.toolkit ? 'Webmaker toolkit' : item.development ? 'development tool' : 'site runtime'}</small><p>${esc(item.explanation)}</p></li>`).join('')}</ul>
    <div data-package-controls>
      <div class="row"><button type="button" data-action="manual" aria-pressed="${manual}">Type my packages</button>
      <button type="button" data-action="choose-ai" ${choosing ? 'disabled' : ''}>${choosing ? 'Choosing packages…' : 'Let AI choose'}</button></div>
      ${manual ? `<form class="fields" data-form="manual"><label class="field">Package names or /webmaker aliases
        <textarea name="packages" required>${esc(result.packages.join(', '))}</textarea></label><button class="primary" type="submit">Resolve packages</button></form>` : ''}
      <p id="package-status" class="panel-note" role="status" aria-live="polite" ${choosing ? '' : 'hidden'}>${choosing ? 'Codex is choosing packages. You can switch to manual selection or use the current list.' : ''}</p>
      <hr><div class="row"><button type="button" data-action="brief">Back</button>
      ${choosing ? '<button type="button" data-action="use-current">Use current packages</button>' :
      manual ? '<small>Resolve the typed list to review it before building.</small>' : '<button type="button" class="primary" data-action="build">Build website</button>'}</div>
    </div>`)
}

function cancelPackageRequest() {
  packageRequest?.abort()
  packageRequest = undefined
}

async function choosePackagesWithAI() {
  const request = new AbortController()
  packageRequest = request
  showPackages(selection, 'choosing')
  try {
    const result = await api('recommend', { brief, mode: 'ai' }, false, request.signal)
    if (packageRequest !== request) return
    showPackages(result)
    notice(result.model ? 'AI selection is ready. Review it, then build your website.' : 'The compatible Webmaker list is ready to build.')
  } catch {
    if (packageRequest !== request) return
    showPackages(selection)
    notice('Could not get an AI recommendation. You can build with the current list or try again.', true)
  } finally {
    if (packageRequest === request) packageRequest = undefined
  }
}

function loadPreview() {
  const frame = preview()
  if (!frame || !getPage()) return
  const address = `${previewOrigin}/${current.project.id}/${current.revision}/${getPage().slug ? getPage().slug + '/' : ''}`
  nonce = crypto.randomUUID()
  frame.src = address + '#' + nonce
}

function accept(result, reset = false) {
  current = result
  if (result.previewOrigin) previewOrigin = result.previewOrigin
  if (reset || !getPage()) pageId = current.project.pages[0].id
  if (reset || !getArea()) regionId = getPage().regions[0]?.id
  blockIds = reset ? [] : blockIds.filter(id => getArea()?.blocks.some(block => block.id === id))
  rectangle = null
  draft = null
  if (reset) { capture = null; panel = 'content'; scopeLevel = 'area'; editing = true }
  if (!preview()) {
    app.innerHTML = `<div class="workspace"><aside class="left" id="sidebar" aria-label="Pages and blocks"></aside>
      <section class="viewport" aria-label="Live preview"><div class="toolbar" id="toolbar"></div>
      <div class="preview-wrap"><iframe id="preview" title="Live website preview" sandbox="allow-scripts"></iframe></div></section>
      <aside class="right" id="inspector" aria-label="Editing tools"></aside></div>`
  }
  redraw()
  loadPreview()
}

function redraw() {
  if (!current || !preview()) return
  const page = getPage(), area = getArea()
  preview().classList.toggle('phone', phone)
  document.querySelector('#toolbar').innerHTML = `
    <button type="button" data-action="selection-mode" aria-pressed="${editing}">Select Area</button>
    <button type="button" data-action="interact" aria-pressed="${!editing}">Interact</button>
    <button type="button" data-action="phone" aria-pressed="${phone}">Phone</button>
    <div class="spacer"></div><button type="button" data-action="undo" ${current.canUndo ? '' : 'disabled'}>Undo</button>
    <button type="button" data-action="export" class="primary">Export site</button>`
  document.querySelector('#sidebar').innerHTML = `<h2>${esc(current.project.name)}</h2>
    <div class="side-section"><h3>Pages</h3>${current.project.pages.map(item => `<button type="button" data-action="page" data-id="${item.id}" aria-current="${selected(page.id, item.id)}">${esc(item.title)}</button>`).join('')}
    <button type="button" data-action="add-page">+ Add page</button><button type="button" data-action="rename-page">Rename page</button></div>
    <div class="side-section"><h3>Areas</h3>${page.regions.map(item => `<button type="button" data-action="area" data-id="${item.id}" aria-pressed="${regionId === item.id && !blockIds.length}">${esc(item.title)}</button>`).join('')}
    <button type="button" data-action="add-area">+ Add area</button></div>
    <div class="side-section"><h3>Block palette</h3><small>Select an area, then click or drag a block into it.</small>
    ${Object.entries(kinds).map(([key, label]) => `<button type="button" draggable="true" data-action="add-block" data-kind="${key}" ${area && !blockIds.length ? '' : 'disabled'}>+ ${label}</button>`).join('')}</div>`
  redrawInspector()
  syncFrame()
}

const label = (name, control) => `<label class="field">${esc(name)}${control}</label>`
const input = (name, value = '', props = '') => `<input name="${name}" value="${esc(value)}" ${props}>`
const textarea = (name, value = '', props = '') => `<textarea name="${name}" ${props}>${esc(value)}</textarea>`
const number = (name, title, value, min, max, step = 1) => label(title, input(name, value, `type="number" min="${min}" max="${max}" step="${step}" required`))
const checkbox = (name, title, on) => `<label><input name="${name}" type="checkbox" ${on ? 'checked' : ''}> ${esc(title)}</label>`
const select = (name, value, entries) => `<select name="${name}">${options(entries, value)}</select>`
const form = (name, inner, submit = 'Save changes') => `<form class="inspector-form" data-form="${name}">${inner}<button class="primary" type="submit">${submit}</button></form>`
const row = content => `<div class="pair">${content}</div>`

function redrawInspector() {
  const area = getArea(), block = getBlock()
  const info = !area ? 'Select or add an area.' : block ? `${area.title} / ${kinds[block.kind]}` : blockIds.length ? `${area.title} / ${blockIds.length} blocks` : area.title
  const render = { content: contentPanel, resize: resizePanel, ai: aiPanel, behavior: behaviorPanel, code: codePanel, capture: capturePanel }
  document.querySelector('#inspector').innerHTML = `<h2>Editing tools</h2><p class="muted">${esc(info)}</p><div class="tabs-list" aria-label="Editing tabs">
    ${Object.entries(panels).map(([key, text]) => `<button type="button" data-action="panel" data-id="${key}" aria-pressed="${selected(panel, key)}">${text}</button>`).join('')}</div>
    ${render[panel](area, block)}`
}

function contentPanel(area, block) {
  if (!area) return '<p class="muted">Choose an area in the preview or add one from the sidebar.</p>'
  if (!block) return `<div class="outline-list"><button type="button" data-action="area" data-id="${area.id}">Select entire area</button>
    ${area.blocks.map(item => `<button type="button" data-action="block" data-id="${item.id}" aria-pressed="${blockIds.includes(item.id)}">${kinds[item.kind]} · ${esc(item.text.slice(0, 32))}</button>`).join('')}</div>
    ${blockIds.length > 1 ? '<p class="panel-note">The AI Editor can edit these selected blocks together.</p>' : ''}
    ${!blockIds.length ? stylePanel(area.style, 'area-style') : ''}`
  let fields = label(block.kind === 'viewer' ? 'Viewer button label' : 'Text', textarea('text', block.text, 'maxlength="2000"'))
  if (block.kind === 'button') fields += label('Page path or HTTPS link', input('url', block.url, 'placeholder="/showcase/"'))
  if (block.kind === 'tabs') fields += block.tabs.map((tab, i) => `<fieldset class="choices"><legend>Tab ${i + 1}</legend>
    ${label('Label', input('tab-label', tab.label, 'maxlength="50" required'))}${label('Content', textarea('tab-text', tab.text, 'maxlength="2000"'))}</fieldset>`).join('') +
    '<div class="row"><button type="button" data-action="tab-add">Add tab</button><button type="button" data-action="tab-remove">Remove last tab</button></div>'
  if (['image', 'gallery'].includes(block.kind)) fields += label('Upload image', '<input type="file" name="image-file" accept=".png,.jpg,.jpeg,.webp">') +
    label('Image description', input('alt', block.images.at(-1)?.alt || '', 'maxlength="160"')) +
    (block.images.length ? '<button type="button" data-action="image-remove">Remove last image</button>' : '')
  if (block.kind === 'viewer') fields += label('Replace model for this viewer', '<input name="model-file" type="file" accept=".glb">') +
    label('Fallback image (with replacement model)', '<input name="poster-file" type="file" accept=".png,.jpg,.jpeg,.webp">')
  return `<div class="row"><button type="button" data-action="move-up">Move up</button><button type="button" data-action="move-down">Move down</button>
    <button type="button" data-action="duplicate">Duplicate</button><button class="danger" type="button" data-action="delete">Remove</button></div><hr>
    ${form('content', fields)}<hr>${stylePanel(block.style, 'block-style')}`
}

function stylePanel(style, target) {
  const colorInput = (key, name) => label(name, input(key, style[key], 'placeholder="#aabbcc or blank" pattern="#[0-9a-fA-F]{6}"'))
  return form(target, row(colorInput('color', 'Text color') + colorInput('background', 'Background')) +
    label('Font', select('font', style.font, { system: 'System sans', serif: 'Serif', mono: 'Monospace' })) +
    label('Animation', select('motion', style.motion, { none: 'None', fade: 'Fade in', rise: 'Rise in' })) +
    checkbox('glass', 'Liquid Glass', style.glass), 'Save style') +
    (!current.project.packages.includes('liquid-glass-react') ? '<small>The glass style has a CSS fallback. Enable the package for refraction.</small><button type="button" data-action="enable-glass">Enable Liquid Glass package</button>' : '')
}

function resizePanel(area, block) {
  if (!area || (!block && blockIds.length)) return '<p class="muted">Select one block or an entire area to resize.</p>'
  const style = block?.style || area.style
  let fields = `<p class="muted">${block ? 'Drag the corner handle in Select Area mode, or enter exact values here.' : 'Area height can grow as its content reflows.'}</p>`
  if (block) {
    const modes = { block: 'Block dimensions', text: 'Text size' }
    if (['image', 'gallery'].includes(block.kind)) Object.assign(modes, { 'image-size': 'Image size', 'image-move': 'Image position' })
    if (block.kind === 'viewer' && current.project.renderer === 'fiber') modes.model = 'Model scale'
    fields += label('Drag handle controls', select('resize-mode', resizeMode, modes))
  }
  fields += row((block ? number('span', 'Grid columns', style.span, 1, 12) : '') + number('minHeight', 'Min height (px)', style.minHeight, 0, 1200))
  fields += row(number('padding', 'Padding (px)', style.padding, 0, 160) + (block ? number('fontSize', 'Text size (px)', style.fontSize, 12, 120) : ''))
  if (['image', 'gallery'].includes(block?.kind)) {
    const { image } = block
    fields += '<h3 class="resize-group">Image</h3>' + row(number('width', 'Width (%)', image.width, 5, 200) + number('height', 'Height (0 = auto)', image.height, 0, 1200)) +
      row(number('ix', 'Move X (%)', image.x, -100, 100) + number('iy', 'Move Y (%)', image.y, -100, 100)) +
      number('rotation', 'Rotation (degrees)', image.rotation, -360, 360) + row(checkbox('flipX', 'Flip horizontal', image.flipX) + checkbox('flipY', 'Flip vertical', image.flipY))
  }
  if (block?.kind === 'viewer' && current.project.renderer === 'fiber') {
    const t = block.transform
    const model = current.project.scenes.find(scene => scene.id === block.sceneId)
    fields += '<h3 class="resize-group">3D object</h3>' + label('Transform target', select('object', t.object || '', { '': 'Entire model', ...Object.fromEntries((model?.objects || []).map(name => [name, name])) })) +
      number('scale', 'Scale', t.scale, .05, 10, .01) +
      row(['x', 'y', 'z'].map(axis => number(axis, `Position ${axis.toUpperCase()}`, t[axis], -20, 20, .01)).join('')) +
      row(['x', 'y', 'z'].map(axis => number('r' + axis, `Rotate ${axis.toUpperCase()} (°)`, t['r' + axis], -360, 360, .1)).join(''))
  }
  if (block?.kind === 'viewer' && current.project.renderer === 'viewer') {
    fields += '<p class="panel-note">Object transforms use Fiber + Drei. Switch this site’s runtime from Model Viewer to @react-three/fiber and @react-three/drei.</p><button type="button" data-action="switch-renderer">Switch to Fiber + Drei</button>'
  }
  return form('resize', fields, 'Apply resize') + (block?.kind === 'viewer' && current.project.renderer === 'fiber'
    ? '<p class="panel-note">Changes apply to this viewer. Use the button below to copy its placement to every viewer sharing this model.</p><button type="button" data-action="share">Apply placement to all instances</button>' : '')
}

function aiPanel() {
  return form('ai', label('Edit scope', select('scope', scopeLevel, { area: 'Selected area or blocks', page: 'This page', site: 'Whole site' })) +
    label('What should change?', textarea('prompt', '', 'required maxlength="4000" placeholder="Make the selected heading larger and add a light background."')) +
    (capture ? checkbox('attach', 'Attach the last screenshot to this request', false) : '') + '<small>Uses your local Codex login. Applied changes can be undone.</small>', 'Apply with AI')
}

function behaviorPanel(area, block) {
  if (block?.kind !== 'viewer') return '<p class="muted">Select a 3D viewer in the canvas to set its behavior.</p>'
  const b = block.behavior
  const model = current.project.scenes.find(scene => scene.id === block.sceneId)
  return `<p class="panel-note"><code>${esc(b.skill)}</code><br>${b.action === 'none' ? 'No automatic motion is set.' : `${esc(b.action)} · ${esc(b.trigger)} · ${b.seconds}s${b.object ? ' · ' + esc(b.object) : ''}`}</p>
  ${form('behavior-ai', label('Tell AI what the model should do', textarea('prompt', '', 'required maxlength="4000" placeholder="/webmaker-reactthreefiber Rotate once when opened."')), 'Set behavior with AI')}
  <hr>${form('behavior', label('Action', select('action', b.action, { none: 'None', spin: 'Rotate once', tilt: 'Tilt', clip: 'Play a model animation', reset: 'Reset transform' })) +
    label('Trigger', select('trigger', b.trigger, { open: 'Viewer opens', press: 'Visitor presses Play', hover: 'Hover or keyboard focus' })) +
    number('seconds', 'Duration (seconds)', b.seconds, .25, 30, .25) +
    label('Animation clip (optional)', select('clip', b.clip, { '': 'First available clip', ...Object.fromEntries((model?.clips || []).map(name => [name, name])) })) +
    label('Behavior target', select('object', b.object, { '': 'Entire model', ...Object.fromEntries((current.project.renderer === 'fiber' ? model?.objects || [] : []).map(name => [name, name])) })) +
    label('Webmaker skill', select('skill', b.skill, { '/webmaker-reactthreefiber': 'React Three Fiber', '/webmaker-drei': 'Drei', '/webmaker-model-viewer': 'Model Viewer' })), 'Save behavior')}
  <div class="row"><button type="button" data-action="test-behavior">Test</button><button type="button" data-action="reset-behavior">Reset behavior</button></div>
  <p class="panel-note">Custom interactions can be staged in a Custom Component block.</p>`
}

function codePanel(area, block) {
  if (block?.kind !== 'custom') return '<p class="muted">Add a Custom component block to this area, then select it.</p>'
  return `${form('code-ai', label('Describe the component', textarea('prompt', '', 'required maxlength="4000" placeholder="Create a card with a rounded border and a counter."')), 'Stage AI component')}
    <hr>${form('code', label('React component', textarea('jsx', block.code?.jsx || 'import React from "react"\n\nexport default function Custom() {\n  return <p>My custom block</p>\n}', 'required maxlength="16000" spellcheck="false"')) +
      label('CSS', textarea('css', block.code?.css || '', 'maxlength="12000" spellcheck="false"')), 'Stage code')}
    ${draft ? `<hr><h3>Staged preview</h3><iframe class="draft-view" title="Staged custom component preview" sandbox="allow-scripts" src="${esc(draft.url)}"></iframe>
      <details><summary>Before and after code</summary><p>Before</p><pre>${esc(draft.before ? draft.before.jsx + '\n' + draft.before.css : '(empty)')}</pre>
      <p>After</p><pre>${esc(draft.after.jsx + '\n' + draft.after.css)}</pre></details>
      <button type="button" class="primary" data-action="apply-code">Apply staged code</button><button type="button" data-action="discard-code">Discard</button>` : ''}`
}

function capturePanel() {
  return `<p class="muted">Save a PNG of this page or the highlighted area. You can attach the last capture to an AI edit.</p>
    <div class="row"><button type="button" data-action="capture-page">Capture page</button><button type="button" data-action="capture-area" ${getArea() ? '' : 'disabled'}>Capture area</button></div>
    ${capture ? `<img class="screenshot" src="${esc(capture.image)}" alt="Last screenshot"><a class="download" download="webmaker.png" href="${esc(capture.image)}">Download PNG</a>` : ''}`
}

function chooseArea(nextArea, nextBlocks = []) {
  regionId = nextArea
  blockIds = nextBlocks
  rectangle = null
  resizeMode = 'block'
  if (panel === 'code' && getBlock()?.kind !== 'custom') panel = 'content'
  redraw()
}

function editAt(op, extra = {}, target = getBlock()) {
  return { op, pageId, regionId, ...(target ? { blockId: target.id } : {}), ...extra }
}

function frameState() {
  return new Promise(resolve => {
    if (!preview()) return resolve(null)
    const timer = setTimeout(() => { resolveFrame = null; resolve(null) }, 900)
    resolveFrame = value => { clearTimeout(timer); resolveFrame = null; resolve(value) }
    tellFrame('state', {})
  })
}

async function save(edits, scope = areaScope(), message = 'Changes saved.') {
  restore = await frameState()
  accept(await projectAPI('edit', { edits, scope }))
  notice(message)
}

async function upload(file) {
  return (await api(`upload?name=${encodeURIComponent(file.name)}`, file, true)).asset
}

const asNumber = (values, key) => Number(values.get(key))
const numbers = (values, keys) => Object.fromEntries(keys.map(key => [key, asNumber(values, key)]))
function nonemptyFile(values, key) { const file = values.get(key); return file?.size ? file : null }

app.addEventListener('submit', event => {
  event.preventDefault()
  const name = event.target.dataset.form
  const values = new FormData(event.target)
  run(name === 'ai' || name.endsWith('-ai') ? 'Codex is working on the selected edit…' : 'Updating the website…', async () => {
    if (name === 'brief') {
      const file = nonemptyFile(values, 'model')
      brief = { name: values.get('name'), idea: values.get('idea'), audience: values.get('audience'),
        theme: values.get('theme'), preset: values.get('preset'), interaction: values.get('interaction'), effects: values.getAll('effect'),
        model: file ? await upload(file) : brief?.model }
      showPackages(await api('recommend', { brief }))
      return notice()
    }
    if (name === 'manual') {
      showPackages(await api('recommend', { brief, mode: 'manual', packages: values.get('packages').split(/[\s,]+/).filter(Boolean) }))
      return notice('Packages resolved.')
    }
    const block = getBlock()
    if (name === 'ai' || name === 'behavior-ai') {
      scopeLevel = values.get('scope') || 'area'
      const scope = scopeLevel === 'area' ? areaScope() : { level: scopeLevel, pageId }
      restore = await frameState()
      const result = await projectAPI(name === 'ai' ? 'ai' : 'behavior', { scope, prompt: values.get('prompt'), captureId: values.get('attach') ? capture?.captureId : undefined })
      accept(result)
      return notice(`${result.summary || 'Changes applied.'} · ${result.model}`)
    }
    if (name === 'code' || name === 'code-ai') {
      draft = await projectAPI('stage', { scope: { pageId, regionId, blockId: block.id },
        ...(name === 'code' ? { code: { jsx: values.get('jsx'), css: values.get('css') } } : { prompt: values.get('prompt') }) })
      redrawInspector()
      return notice(draft.model ? `Candidate staged with ${draft.model}.` : 'Candidate built. Review it before applying.')
    }
    if (name === 'behavior') {
      const behavior = Object.fromEntries(['action', 'trigger', 'clip', 'object', 'skill'].map(key => [key, values.get(key)]))
      behavior.seconds = asNumber(values, 'seconds')
      return save([editAt('patch', { patch: { behavior } })])
    }
    if (name === 'resize') {
      const style = numbers(values, ['padding', 'minHeight'])
      if (!block) return save([editAt('areaStyle', { patch: style })])
      Object.assign(style, numbers(values, ['span', 'fontSize']))
      const patch = { style }
      if (values.has('width')) patch.image = { ...numbers(values, ['width', 'height', 'rotation']), x: asNumber(values, 'ix'), y: asNumber(values, 'iy'), flipX: values.has('flipX'), flipY: values.has('flipY') }
      if (values.has('scale')) patch.transform = { ...numbers(values, ['scale', 'x', 'y', 'z', 'rx', 'ry', 'rz']), object: values.get('object') }
      return save([editAt('patch', { patch })])
    }
    if (name.endsWith('-style')) {
      const style = { ...Object.fromEntries(['color', 'background', 'font', 'motion'].map(key => [key, values.get(key)])), glass: values.has('glass') }
      return save([name === 'area-style' ? editAt('areaStyle', { patch: style }) : editAt('patch', { patch: { style } })])
    }
    if (name === 'content') {
      const patch = { text: values.get('text') }
      if (block.kind === 'button') patch.url = values.get('url')
      if (block.kind === 'tabs') patch.tabs = values.getAll('tab-label').map((label, i) => ({ label, text: values.getAll('tab-text')[i] }))
      if (['image', 'gallery'].includes(block.kind)) {
        const file = nonemptyFile(values, 'image-file')
        if (file) {
          const image = { src: await upload(file), alt: values.get('alt') }
          patch.images = block.kind === 'image' ? [image] : [...block.images, image]
        } else if (block.images.length) patch.images = block.images.map((item, i) => i === block.images.length - 1 ? { ...item, alt: values.get('alt') } : item)
      }
      const edits = [editAt('patch', { patch })]
      const model = nonemptyFile(values, 'model-file'), poster = nonemptyFile(values, 'poster-file')
      if (model || poster) {
        const scene = current.project.scenes.find(item => item.id === block.sceneId)
        edits.push(editAt('model', { model: model ? await upload(model) : scene.model, poster: poster ? await upload(poster) : model ? '' : scene.poster }))
      }
      return save(edits)
    }
  })
})

app.addEventListener('change', event => {
  if (event.target.name === 'resize-mode') { resizeMode = event.target.value; syncFrame() }
})

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (!button || busy) return
  const { action, id, kind } = button.dataset
  if (action === 'brief') return showBrief()
  if (action === 'manual') { cancelPackageRequest(); showPackages(selection, 'manual'); return app.querySelector('[name="packages"]').focus() }
  if (action === 'use-current') { cancelPackageRequest(); return showPackages(selection) }
  if (action === 'choose-ai') return choosePackagesWithAI()
  if (action === 'panel') { panel = id; redrawInspector(); return syncFrame() }
  if (action === 'area') return chooseArea(id)
  if (action === 'block') return chooseArea(regionId, [id])
  if (action === 'page') { pageId = id; chooseArea(getPage().regions[0]?.id); return loadPreview() }
  if (action === 'selection-mode' || action === 'interact') { editing = action === 'selection-mode'; return redraw() }
  if (action === 'phone') { phone = !phone; return redraw() }
  if (action === 'discard-code') { draft = null; return redrawInspector() }
  if (action === 'test-behavior') {
    editing = false
    redraw()
    return tellFrame('test', { id: getBlock()?.id })
  }
  const messages = { build: 'Building your website…', export: 'Creating the static build and lockfile…', 'capture-page': 'Capturing the page…', 'capture-area': 'Capturing the selected area…' }
  run(messages[action] || 'Updating the website…', async () => {
    const block = getBlock()
    if (action === 'build') {
      accept(await api('projects', { brief, packages: selection.packages, draft: selection.draft }), true)
      window.scrollTo(0, 0)
      await refreshProjects()
      return notice('Website ready. Select an area to edit it.')
    }
    if (action === 'undo') { accept(await projectAPI('undo', {})); return notice('Previous revision restored.') }
    if (action === 'export') { const result = await projectAPI('export', {}); return notice(`Exported source and static dist to ${result.directory}`) }
    if (action === 'switch-renderer') { accept(await projectAPI('renderer', {})); return notice('React Three Fiber and Drei are ready for object transforms.') }
    if (action === 'enable-glass') { accept(await projectAPI('glass', {})); return notice('Liquid Glass added. Turn on the glass style for the selected area or block.') }
    if (action === 'apply-code') { accept(await projectAPI('apply', { draft: draft.draft })); return notice('Custom component applied.') }
    if (action === 'capture-page' || action === 'capture-area') {
      const view = await frameState()
      if (!view) throw new Error('Wait for the live preview to load before taking a screenshot.')
      const clip = action === 'capture-area' ? rectangle || view.rectangle : null
      if (action === 'capture-area' && !clip) throw new Error('Select a visible area first.')
      capture = await projectAPI('capture', { pageId, viewport: { width: view.width, height: view.height }, rectangle: clip, viewers: view.viewers, tabs: view.tabs })
      redrawInspector()
      return notice('Screenshot ready to download or attach.')
    }
    if (['add-page', 'rename-page', 'add-area'].includes(action)) {
      const title = window.prompt(action === 'add-area' ? 'Area name' : 'Page name', action === 'rename-page' ? getPage().title : '')
      if (!title?.trim()) return notice()
      const op = { 'add-page': 'addPage', 'rename-page': 'renamePage', 'add-area': 'addArea' }[action]
      await save([editAt(op, { title })], { level: action === 'add-page' ? 'site' : 'page', pageId })
      if (action === 'add-page') { pageId = current.project.pages.at(-1).id; chooseArea(getPage().regions[0].id); loadPreview() }
      if (action === 'add-area') chooseArea(getPage().regions.at(-1).id)
      return
    }
    if (action === 'add-block') return save([editAt('add', { kind }, null)], areaScope([]))
    if (action === 'share') return save([editAt('share')], { level: 'site' }, 'Placement copied to all instances of this model.')
    if (action === 'delete' || action === 'duplicate') return save([editAt(action)])
    if (action === 'move-up' || action === 'move-down') {
      const at = getArea().blocks.indexOf(block)
      const index = at + (action === 'move-up' ? -1 : 1)
      return index < 0 || index >= getArea().blocks.length ? notice('The block is already at this edge.') : save([editAt('move', { index })])
    }
    if (action === 'tab-add' || action === 'tab-remove') {
      const tabs = action === 'tab-add' ? [...block.tabs, { label: `Tab ${block.tabs.length + 1}`, text: 'Add content here.' }] : block.tabs.slice(0, -1)
      return save([editAt('patch', { patch: { tabs } })])
    }
    if (action === 'image-remove') return save([editAt('patch', { patch: { images: block.images.slice(0, -1) } })])
    if (action === 'reset-behavior') return save([editAt('patch', { patch: { behavior: { ...block.behavior, action: 'none' } } })])
  })
})

app.addEventListener('dragstart', event => {
  const button = event.target.closest('[draggable][data-kind]')
  if (button) event.dataTransfer.setData('application/webmaker-kind', button.dataset.kind)
})

window.addEventListener('message', event => {
  if (event.source !== preview()?.contentWindow || event.data?.nonce !== nonce) return
  const { type, detail } = event.data
  if (type === 'ready') { syncFrame(); if (restore) { tellFrame('restore', restore); restore = null }; return }
  if (type === 'state') return resolveFrame?.(detail)
  if (type === 'navigate') {
    const page = current.project.pages.find(item => item.slug === detail)
    if (page) { pageId = page.id; chooseArea(getPage().regions[0]?.id); loadPreview() }
    return
  }
  if (type === 'pick') {
    if (!getPage().regions.some(area => area.id === detail.regionId)) return
    chooseArea(detail.regionId, detail.blockId ? [detail.blockId] : [])
    rectangle = detail.rectangle
  }
  if (type === 'marquee') {
    if (detail.regions.length !== 1 || (!detail.blocks.length && !detail.entireArea)) {
      rectangle = detail.rectangle
      return notice('For edits, choose one area or draw around complete adjacent blocks. The rectangle can still be captured.')
    }
    const area = getPage().regions.find(item => item.id === detail.regions[0])
    if (!area) return
    const indices = detail.blocks.map(id => area.blocks.findIndex(item => item.id === id)).sort((a, b) => a - b)
    if (indices.some((index, i) => i && index !== indices[i - 1] + 1)) return notice('Draw around adjacent blocks or select the whole area.')
    chooseArea(detail.regions[0], detail.entireArea ? [] : detail.blocks)
    rectangle = detail.rectangle
    if (detail.blocks.length > 1) notice('Adjacent blocks selected together. AI edits are limited to this group.')
  }
  if (type === 'resize' && detail.regionId === regionId && blockIds[0] === detail.blockId) {
    const block = getBlock()
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
    let patch = { style: { span: detail.span, minHeight: detail.minHeight } }
    const dx = detail.dx, dy = detail.dy, width = Math.max(1, detail.width), height = Math.max(1, detail.height)
    if (panel === 'resize' && resizeMode === 'text') patch = { style: { fontSize: clamp(Math.round(block.style.fontSize + dx / 4), 12, 120) } }
    if (panel === 'resize' && resizeMode === 'image-size') patch = { image: { width: clamp(Math.round(block.image.width + dx / width * 100), 5, 200) } }
    if (panel === 'resize' && resizeMode === 'image-move') patch = { image: {
      x: clamp(Math.round(block.image.x + dx / width * 100), -100, 100), y: clamp(Math.round(block.image.y + dy / height * 100), -100, 100)
    } }
    if (panel === 'resize' && resizeMode === 'model') patch = { transform: { scale: clamp(Math.round((block.transform.scale + dx / 180) * 100) / 100, .05, 10) } }
    run('Resizing selected block…', () => save([editAt('patch', { patch })]))
  }
  if (type === 'drop') {
    if (detail.regionId !== regionId) return notice('Select the destination area before dropping a block.')
    const area = getArea()
    const index = detail.before ? area.blocks.findIndex(item => item.id === detail.before) : area.blocks.length
    if (detail.kind && Object.hasOwn(kinds, detail.kind) && !blockIds.length) {
      return run('Adding block…', () => save([editAt('add', { kind: detail.kind, index }, null)], areaScope([])))
    }
    if (detail.blockId === blockIds[0]) {
      const old = area.blocks.findIndex(item => item.id === detail.blockId)
      const target = Math.max(0, Math.min(area.blocks.length - 1, index > old ? index - 1 : index))
      return run('Moving block…', () => save([editAt('move', { index: target })]))
    }
  }
})

document.querySelector('#new-site').addEventListener('click', () => { if (!busy) { brief = null; showBrief(); notice() } })
projects.addEventListener('change', () => {
  const id = projects.value
  if (id) {
    cancelPackageRequest()
    run('Opening saved project…', async () => { accept(await api(`projects/${id}`), true); notice() })
  }
})

document.querySelector('#reconnect-button').addEventListener('click', () => {
  const form = app.querySelector('[data-form="brief"]')
  if (form) {
    const values = new FormData(form)
    brief = { ...brief, ...Object.fromEntries(['name', 'idea', 'audience', 'theme', 'preset', 'interaction'].map(key => [key, values.get(key)])), effects: values.getAll('effect') }
  }
  const manual = app.querySelector('[name="packages"]')?.value
  try {
    sessionStorage.setItem('webmaker-reconnect', JSON.stringify({ brief, selection: form ? null : selection, manual, projectId: current?.project.id }))
    location.reload()
  } catch { notice('Browser storage is unavailable. Copy your brief before refreshing this page.', true) }
})

async function initialize() {
  let saved
  try {
    saved = JSON.parse(sessionStorage.getItem('webmaker-reconnect') || 'null')
    sessionStorage.removeItem('webmaker-reconnect')
  } catch {}
  brief = saved?.brief
  showBrief()
  await refreshProjects()
  if (saved?.projectId) accept(await api(`projects/${saved.projectId}`), true)
  else if (saved?.selection) {
    showPackages(saved.selection, saved.manual === undefined ? '' : 'manual')
    if (saved.manual !== undefined) app.querySelector('[name="packages"]').value = saved.manual
  }
  if (saved) notice('Reconnected. Review your restored work and retry the action. Reselect any file that was not uploaded.')
}
initialize().catch(error => notice(error.message, true))
