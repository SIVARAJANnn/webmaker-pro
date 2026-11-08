import { constants, copyFileSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [input, output, ...extra] = process.argv.slice(2)
if (!input || !output || extra.length || !/\.gl(?:tf|b)$/i.test(input) || !/\.glb$/i.test(output)) {
  throw new Error('Usage: npm run model:prepare -- <input.gltf|input.glb> <output.glb>')
}
const source = path.resolve(input)
const target = path.resolve(output)
if (!statSync(source).isFile()) throw new Error('Input must be a file.')
if (existsSync(target)) throw new Error('Output already exists. Choose a new path.')
const tool = new URL('../node_modules/@gltf-transform/cli/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('package.json', tool), 'utf8'))
const cli = fileURLToPath(new URL(manifest.bin['gltf-transform'], tool))
const gltf = (...args) => execFileSync(process.execPath, [cli, ...args], { stdio: 'inherit' })
const temporary = path.join(path.dirname(target), `.webmaker-${randomUUID()}.glb`)

try {
  console.log('Input model')
  gltf('inspect', source)
  // Keep material and mesh identities intact for controls and per-part animation.
  gltf('dedup', source, temporary, '--materials', 'false', '--meshes', 'false', '--skins', 'false')
  console.log('Prepared model')
  gltf('inspect', temporary)
  const before = statSync(source).size
  const after = statSync(temporary).size
  copyFileSync(temporary, target, constants.COPYFILE_EXCL)
  console.log(`${before.toLocaleString()} → ${after.toLocaleString()} bytes (${((after - before) / before * 100).toFixed(1)}% change in file size)`)
  console.log(`Saved ${target}`)
} finally {
  rmSync(temporary, { force: true })
}
