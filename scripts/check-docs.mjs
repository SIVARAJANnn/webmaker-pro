import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'))
const files = ['README.md', 'CONTRIBUTING.md']
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(name)
    else if (name.endsWith('.md')) files.push(name)
  }
}
walk('docs')
for (const name of files) {
  const body = fs.readFileSync(path.join(root, name), 'utf8')
  for (const [, target] of body.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue
    const local = target.split('#')[0]
    assert(fs.existsSync(path.resolve(root, path.dirname(name), local)), `${name}: missing ${target}`)
  }
}
for (const skill of catalog.skills) {
  assert(fs.existsSync(path.join(root, 'docs/packages', skill.name + '.md')), `Missing guide: ${skill.name}`)
  const png = fs.readFileSync(path.join(root, 'docs/assets', skill.name + '.png'))
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
}
console.log(`Documentation checks passed: ${files.length} Markdown files and ${catalog.skills.length} illustrated guides.`)
