import { mkdir, writeFile } from 'node:fs/promises'
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack, SphereGeometry, TorusGeometry, TorusKnotGeometry, Vector3 } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
}

const folder = new URL('./assets/', import.meta.url)
await mkdir(folder, { recursive: true })

function shape(name, geometry, color) {
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color, roughness: .4, metalness: .15 }))
  mesh.name = name
  return mesh
}

const sculpture = new Group()
const pedestal = shape('Pedestal', new BoxGeometry(1.4, .25, 1.4), '#334d49')
pedestal.position.y = -.82
const knot = shape('Sculpture', new TorusKnotGeometry(.53, .14, 72, 10), '#7ad8bf')
sculpture.add(pedestal, knot)

const orbit = new Group()
const sphere = shape('Core', new SphereGeometry(.47, 24, 16), '#9aa9f1')
const ring = shape('Orbit ring', new TorusGeometry(.9, .085, 10, 48), '#f6bc70')
ring.rotation.x = 1
orbit.add(sphere, ring)
const axis = new Vector3(0, 1, 0)
const keyframes = [0, Math.PI, Math.PI * 2].flatMap(angle => new Quaternion().setFromAxisAngle(axis, angle).toArray())
const clip = new AnimationClip('Orbit', 4, [new QuaternionKeyframeTrack('.quaternion', [0, 2, 4], keyframes)])

const exporter = new GLTFExporter()
for (const [name, scene, animations] of [['object-study', sculpture, []], ['orbit-launch', orbit, [clip]]]) {
  const bytes = await exporter.parseAsync(scene, { binary: true, animations })
  await writeFile(new URL(name + '.glb', folder), Buffer.from(bytes))
}
