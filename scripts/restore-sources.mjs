import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.length && (args.length !== 1 || args[0] !== '--status')) throw new Error('Only --status is supported')
const statusOnly = args[0] === '--status'
const lock = JSON.parse(fs.readFileSync(path.join(root, 'sources.lock.json'), 'utf8'))
const git = (dir, ...options) => execFileSync('git', ['-C', dir, ...options], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const vendor = path.join(root, 'vendor')
let incomplete = false
for (const source of lock.sources) {
  if (!/^[a-z0-9-]+$/.test(source.directory) || !/^[a-f0-9]{40}$/.test(source.commit) ||
      !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(source.url)) throw new Error('Invalid source lock entry')
  const dir = path.join(vendor, source.directory)
  if (fs.existsSync(dir)) {
    if (!fs.existsSync(path.join(dir, '.git'))) throw new Error(`Existing directory is not a checkout: ${dir}`)
    const actual = git(dir, 'rev-parse', 'HEAD')
    if (git(dir, 'remote', 'get-url', 'origin') !== source.url) throw new Error(`Origin differs from lock: ${dir}`)
    const dirty = git(dir, 'status', '--porcelain') !== ''
    console.log(`${source.directory}: ${actual}${dirty ? ' (local changes)' : ''}${actual !== source.commit ? ' (differs from lock)' : ''}`)
    if (dirty || actual !== source.commit) incomplete = true
    continue
  }
  if (statusOnly) { console.log(`${source.directory}: missing`); incomplete = true; continue }
  fs.mkdirSync(vendor, { recursive: true })
  const realVendor = fs.realpathSync(vendor)
  if (path.relative(fs.realpathSync(root), realVendor) !== 'vendor') {
    throw new Error(`Refusing to restore outside the package vendor directory: ${realVendor}`)
  }
  const staging = fs.mkdtempSync(path.join(realVendor, '.restore-'))
  const target = path.join(realVendor, source.directory)
  try {
    git(staging, 'init')
    git(staging, 'remote', 'add', 'origin', source.url)
    git(staging, 'fetch', '--depth', '1', 'origin', source.commit)
    git(staging, 'checkout', '--detach', source.commit)
    if (fs.existsSync(target)) throw new Error(`Checkout appeared during restore: ${target}`)
    fs.renameSync(staging, target)
    console.log(`Restored ${source.directory} at ${source.commit}`)
  } finally {
    if (fs.existsSync(staging) && path.dirname(fs.realpathSync(staging)) === realVendor) {
      fs.rmSync(staging, { recursive: true })
    }
  }
}
if (incomplete) process.exitCode = 1
