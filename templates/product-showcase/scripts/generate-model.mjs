import { mkdir, writeFile } from 'node:fs/promises'
import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

// GLTFExporter reads Blob data with the browser FileReader interface.
globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
}

const material = (name, color, roughness) => new MeshStandardMaterial({ name, color, roughness })
const shell = material('Finish', '#e3a946', .42)
const panel = material('Baffle', '#23262b', .66)
const cone = material('Cone', '#464b50', .5)
const trim = material('Trim', '#14171a', .48)
const product = new Group()
product.name = 'Form 01'
function part(name, geometry, surface, x, y, z) {
  const mesh = new Mesh(geometry, surface)
  mesh.name = name
  mesh.position.set(x, y, z)
  product.add(mesh)
  return mesh
}
part('Cabinet', new BoxGeometry(1.8, 2.35, 1.25), shell, 0, 0, 0)
part('Baffle', new BoxGeometry(1.65, 2.19, .04), panel, 0, 0, .632)
for (const [label, y, radius] of [['Tweeter', .57, .21], ['Woofer', -.31, .51]]) {
  part(label + ' Rim', new TorusGeometry(radius, .032, 10, 48), trim, 0, y, .68)
  part(label + ' Cone', new CircleGeometry(radius - .03, 48), cone, 0, y, .67)
  const cap = part(label + ' Cap', new CylinderGeometry(radius * .42, radius * .52, .05, 32), trim, 0, y, .7)
  cap.rotation.x = Math.PI / 2
}
part('Indicator', new CircleGeometry(.024, 16), shell, -.7, -.97, .66)

const directory = new URL('../assets/', import.meta.url)
await mkdir(directory, { recursive: true })
const glb = await new GLTFExporter().parseAsync(product, { binary: true })
await writeFile(new URL('form-01.glb', directory), Buffer.from(glb))
console.log('Generated Form 01 GLB')
