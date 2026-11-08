import React, { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

const radians = angle => angle * Math.PI / 180

function Model({ source, transform, behavior, play, reduce, hovering, visible, ready }) {
  const { scene, animations } = useGLTF(source, false, false)
  const model = useMemo(() => clone(scene), [scene])
  const pivot = useRef()
  const elapsed = useRef(0)
  const { actions, names } = useAnimations(animations, model)
  const active = !reduce && behavior.action !== 'none' &&
    (behavior.trigger === 'open' || (behavior.trigger === 'press' && play > 0) || (behavior.trigger === 'hover' && hovering))
  const target = behavior.object ? model.getObjectByName(behavior.object) : null
  const part = transform.object ? model.getObjectByName(transform.object) : null
  const basePart = useMemo(() => part && { position: part.position.clone(), rotation: part.rotation.clone(), scale: part.scale.clone() }, [part])
  const baseRotation = useRef()
  const invalidate = useThree(state => state.invalidate)
  useLayoutEffect(() => {
    if (part && basePart) {
      part.position.copy(basePart.position).set(part.position.x + transform.x, part.position.y + transform.y, part.position.z + transform.z)
      part.rotation.set(basePart.rotation.x + radians(transform.rx), basePart.rotation.y + radians(transform.ry), basePart.rotation.z + radians(transform.rz))
      part.scale.copy(basePart.scale).multiplyScalar(transform.scale)
    }
    baseRotation.current = target?.rotation.clone()
  }, [part, basePart, target, transform])
  useEffect(() => { ready(true) }, [ready])
  useEffect(() => {
    elapsed.current = 0
    if (pivot.current) pivot.current.rotation.set(0, 0, 0)
    if (target && baseRotation.current) target.rotation.copy(baseRotation.current)
    if (!active) { invalidate(); return }
    if (behavior.action === 'reset') {
      if (part && basePart) {
        part.position.copy(basePart.position)
        part.rotation.copy(basePart.rotation)
        part.scale.copy(basePart.scale)
      } else {
        pivot.current.parent.position.set(0, 0, 0)
        pivot.current.parent.rotation.set(0, 0, 0)
        pivot.current.parent.scale.setScalar(1)
      }
      invalidate()
      return
    }
    const action = behavior.action === 'clip' ? actions[behavior.clip || names[0]] : null
    if (action) action.reset().play()
    invalidate()
    return () => action?.stop()
  }, [active, play, behavior, actions, names, invalidate, target, part, basePart])

  useEffect(() => { if (visible) invalidate() }, [visible, invalidate])
  useFrame((_, delta) => {
    if (!active || elapsed.current >= behavior.seconds || document.hidden || !visible || (behavior.object && !target)) return
    elapsed.current = Math.min(behavior.seconds, elapsed.current + Math.min(delta, .05))
    const rotation = target?.rotation || pivot.current.rotation
    if (behavior.action === 'spin') rotation.y = (baseRotation.current?.y || 0) + elapsed.current / behavior.seconds * Math.PI * 2
    if (behavior.action === 'tilt') rotation.x = (baseRotation.current?.x || 0) + Math.min(1, elapsed.current * 5) * .22
    if (['spin', 'tilt', 'clip'].includes(behavior.action) && elapsed.current < behavior.seconds) invalidate()
    if (behavior.action === 'clip' && elapsed.current >= behavior.seconds) actions[behavior.clip || names[0]]?.stop()
  })

  useEffect(() => {
    const resume = () => { if (!document.hidden) invalidate() }
    document.addEventListener('visibilitychange', resume)
    return () => document.removeEventListener('visibilitychange', resume)
  }, [invalidate])

  return <group position={part ? [0, 0, 0] : [transform.x, transform.y, transform.z]}
    rotation={part ? [0, 0, 0] : [radians(transform.rx), radians(transform.ry), radians(transform.rz)]} scale={part ? 1 : transform.scale}>
    <group ref={pivot}><primitive object={model} /></group>
  </group>
}

function Camera({ box }) {
  const camera = useThree(state => state.camera)
  const invalidate = useThree(state => state.invalidate)
  const controls = useRef()
  useEffect(() => {
    const node = box.current
    const save = () => { if (node && controls.current) node.dataset.camera = JSON.stringify({ position: camera.position.toArray(), target: controls.current.target.toArray() }) }
    const restore = event => {
      if (!controls.current) return
      camera.position.fromArray(event.detail.position)
      controls.current.target.fromArray(event.detail.target)
      controls.current.update()
      invalidate()
    }
    node?.addEventListener('wm-camera', restore)
    controls.current?.addEventListener('change', save)
    const current = controls.current
    save()
    return () => { node?.removeEventListener('wm-camera', restore); current?.removeEventListener('change', save) }
  }, [box, camera, invalidate])
  return <OrbitControls ref={controls} makeDefault enableDamping={false} />
}

export default function FiberViewer(props) {
  const [ready, setReady] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(true)
  const box = useRef()
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [])
  const Bloom = useMemo(() => props.bloom ? lazy(props.bloom) : null, [props.bloom])
  return <div className="scene" ref={box} data-ready={ready} tabIndex={0} aria-label={props.label}
    onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)}
    onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [3.4, 2.1, 5.4], fov: 38 }} fallback={props.fallback}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 6, 5]} intensity={3} />
      <directionalLight color="#a8c5ff" position={[-4, 2, -5]} intensity={1.8} />
      <Suspense fallback={null}><Bounds fit clip margin={1.35}>
        <Model {...props} hovering={hovering} visible={visible} ready={setReady} />
      </Bounds></Suspense>
      <Camera box={box} />
      {Bloom && <Suspense fallback={null}><Bloom /></Suspense>}
    </Canvas>
  </div>
}
