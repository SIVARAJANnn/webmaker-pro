import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const catalog = json('catalog.json')
const sources = json('sources.lock.json')
const plugin = json('plugin.json')
const mainPackage = json('package.json')
assert.equal(plugin.version, mainPackage.version)
assert.equal(catalog.version, mainPackage.version)
assert.equal(catalog.schemaVersion, 1)
assert.equal(new Set(catalog.skills.map(s => s.name)).size, catalog.skills.length)
const directories = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()
assert.deepEqual(directories, catalog.skills.map(s => s.name).sort())
for (const skill of catalog.skills) {
  const dir = path.join(root, 'skills', skill.name)
  const entry = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n')
  assert(entry.includes(`name: ${skill.name}\n`), `${skill.name}: name mismatch`)
  assert(fs.existsSync(path.join(dir, 'agents', 'openai.yaml')), `${skill.name}: missing UI metadata`)
  assert(fs.existsSync(path.join(dir, 'LICENSE')), `${skill.name}: missing source license`)
  const provenance = JSON.parse(fs.readFileSync(path.join(dir, 'source.json'), 'utf8'))
  const locked = sources.sources.find(s => s.repository === skill.repository)
  assert(locked && provenance.repository === skill.repository && locked.commit === provenance.commit, `${skill.name}: source lock mismatch`)
  assert.equal(skill.sourceDirectory, `vendor/${locked.directory}`)
  const manifest = skill.dependencyProfile ? json(`${skill.dependencyProfile}/package.json`) : mainPackage
  if (skill.dependencyProfile) json(`${skill.dependencyProfile}/npm-shrinkwrap.json`)
  for (const dependency of skill.packages) {
    assert(manifest.dependencies?.[dependency] || manifest.devDependencies?.[dependency], `${skill.name}: missing dependency ${dependency}`)
  }
  for (const match of entry.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue
    assert(fs.existsSync(path.resolve(dir, match[1])), `${skill.name}: missing reference ${match[1]}`)
  }
  console.log(`Valid package entry: ${skill.name}`)
}
const registry = json('templates/registry.json')
assert.equal(new Set(registry.templates.map(template => template.id)).size, registry.templates.length)
for (const template of registry.templates) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.id), 'Invalid template id')
  const templatePath = path.resolve(root, 'templates', template.id)
  assert(fs.existsSync(templatePath), `Missing template directory: ${template.id}`)
  assert(template.source && template.license && template.framework, `Missing template metadata: ${template.id}`)
  for (const name of template.skills) assert(catalog.skills.some(skill => skill.name === name), `Unknown template skill: ${name}`)
}
json('templates/product-showcase/npm-shrinkwrap.json')
assert(fs.existsSync(path.join(root, 'templates/product-showcase/assets/form-01.glb')), 'Missing starter model')
const studioPresets = json('studio/presets.json')
for (const preset of Object.values(studioPresets)) {
  assert(/^[a-z0-9-]+\.glb$/.test(preset.model) && preset.license && preset.tags.length, 'Invalid Studio starter metadata')
  const asset = preset.model === 'form-01.glb' ? 'templates/product-showcase/assets/form-01.glb' : 'studio/assets/' + preset.model
  assert.equal(fs.readFileSync(path.join(root, asset)).subarray(0, 4).toString(), 'glTF', `Invalid Studio model: ${asset}`)
  assert(/^[a-z0-9-]+-poster\.svg$/.test(preset.poster) && fs.existsSync(path.join(root, 'studio/assets', preset.poster)), 'Missing Studio poster')
}
for (const file of ['main.js', 'shaders.js', 'vertex-shader.glsl', 'fragment-shader.glsl', 'gui-controls.js', 'presets.js', 'LICENSE.txt']) {
  assert(fs.existsSync(path.join(root, 'skills', 'webmaker-liquidlogo', 'assets', 'source', file)), `Missing liquid logo source: ${file}`)
}
console.log(`Package checks passed; ${catalog.skills.length} skills, ${registry.templates.length} website templates.`)
