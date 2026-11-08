import { cp, mkdir, lstat, readdir, realpath, symlink, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const project = args[0] === '--project'
const hosts = { codex: '.agents', antigravity: '.agents', cursor: '.agents', claude: '.claude' }
if (project ? args.length !== 4 || args[2] !== '--target' || !Object.hasOwn(hosts, args[3])
  : args.length && (args.length !== 2 || args[0] !== '--dest')) {
  throw new Error('Usage: npm run skills:install -- [--dest <skills-directory> | --project <path> --target codex|antigravity|claude|cursor]')
}
const destination = project ? path.join(await realpath(args[1]), hosts[args[3]], 'skills')
  : path.resolve(args[1] || path.join(os.homedir(), '.agents', 'skills'))
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'))
const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value
const plans = []

async function sameFiles(left, right) {
  const [source, target] = await Promise.all([readdir(left, { withFileTypes: true }), readdir(right, { withFileTypes: true })])
  if (source.length !== target.length) return false
  const files = new Map(target.map(item => [item.name, item]))
  for (const item of source) {
    const other = files.get(item.name)
    if (item.isDirectory() && other?.isDirectory()) {
      if (!await sameFiles(path.join(left, item.name), path.join(right, item.name))) return false
    } else if (item.isFile() && other?.isFile()) {
      const [a, b] = await Promise.all([readFile(path.join(left, item.name)), readFile(path.join(right, item.name))])
      if (!a.equals(b)) return false
    } else return false
  }
  return true
}
// Preflight every entry before creating anything; never replace an existing user's skill.
for (const item of catalog.skills) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name)) throw new Error('Invalid skill name')
  const source = path.join(root, 'skills', item.name)
  await readFile(path.join(source, 'SKILL.md'), 'utf8')
  const target = path.join(destination, item.name)
  let existing
  try { existing = await lstat(target) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (existing) {
    if ((existing.isSymbolicLink() && normalize(await realpath(target)) === normalize(await realpath(source))) ||
      (project && existing.isDirectory() && await sameFiles(source, target))) {
      plans.push({ name: item.name, source, target, installed: true })
      continue
    }
    throw new Error(`Refusing to replace existing skill: ${target}`)
  }
  plans.push({ name: item.name, source, target, installed: false })
}
await mkdir(destination, { recursive: true })
for (const plan of plans) {
  if (!plan.installed) {
    if (project) await cp(plan.source, plan.target, { recursive: true, force: false, errorOnExist: true })
    else await symlink(plan.source, plan.target, process.platform === 'win32' ? 'junction' : 'dir')
  }
  console.log(`${plan.installed ? 'Already installed' : 'Installed'} ${plan.name}: ${plan.target}`)
}
console.log(project ? 'Project skills are ready. Open the project in your selected editor.'
  : 'The installed links follow edits in this package. Keep the package at its current path.')
