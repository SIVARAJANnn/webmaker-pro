import React, { useEffect, useRef, useState } from 'react'
import '@google/model-viewer'

export default function SimpleViewer({ source, label, behavior, play, reduce, fallback }) {
  const viewer = useRef()
  const box = useRef()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const node = viewer.current
    if (!node) return
    const load = () => setReady(true)
    const error = () => setFailed(true)
    const frame = box.current
    const camera = () => { frame.dataset.camera = JSON.stringify({ orbit: node.getCameraOrbit().toString(), target: node.getCameraTarget().toString() }) }
    const restore = event => { node.cameraOrbit = event.detail.orbit; node.cameraTarget = event.detail.target; node.jumpCameraToGoal() }
    node.addEventListener('load', load)
    node.addEventListener('error', error)
    node.addEventListener('camera-change', camera)
    frame.addEventListener('wm-camera', restore)
    if (node.loaded) load()
    return () => {
      node.removeEventListener('load', load)
      node.removeEventListener('error', error)
      node.removeEventListener('camera-change', camera)
      frame.removeEventListener('wm-camera', restore)
    }
  }, [])
  useEffect(() => {
    const node = viewer.current
    if (!ready || !node || reduce || behavior.action !== 'clip' || (behavior.trigger === 'press' && !play)) return
    const animation = behavior.clip || node.availableAnimations[0]
    if (!animation || !node.availableAnimations.includes(animation)) return
    node.animationName = animation
    const visible = () => { if (document.hidden) node.pause(); else node.play({ repetitions: 1 }) }
    visible()
    document.addEventListener('visibilitychange', visible)
    return () => { node.pause(); document.removeEventListener('visibilitychange', visible) }
  }, [ready, behavior, play, reduce])

  if (failed) return fallback
  return <div className="scene" ref={box} data-ready={ready}>
    <model-viewer ref={viewer} src={source} alt={label} camera-controls loading="eager" />
  </div>
}
