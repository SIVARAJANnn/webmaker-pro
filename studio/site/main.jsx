import React, { Component, lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import site from './site.json'
import features from './features.js'
import './site.css'

const base = document.querySelector('meta[name="webmaker-root"]').content
const page = site.pages[Number(document.documentElement.dataset.page)]
const Viewer = lazy(() => import('./viewer.jsx'))
const Glass = features.glass && lazy(features.glass)
const Shader = features.shader && lazy(features.shader)
const media = filename => `${base}media/${filename}`
const route = slug => `${base}${slug ? slug + '/' : ''}`
const fonts = { system: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function style(settings) {
  return {
    '--span': settings.span,
    '--block-height': settings.minHeight + 'px',
    '--block-padding': settings.padding + 'px',
    '--block-font-size': settings.fontSize + 'px',
    fontFamily: fonts[settings.font],
    color: settings.color || undefined,
    backgroundColor: settings.background || undefined
  }
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return reduce
}

function GlassOverlay() {
  const reduce = useReducedMotion()
  return Glass && !reduce ? <Boundary fallback={null}><Suspense fallback={null}><Glass /></Suspense></Boundary> : null
}

function Model({ block }) {
  const scene = site.scenes.find(item => item.id === block.sceneId)
  const [open, setOpen] = useState(false)
  const [reset, setReset] = useState(0)
  const [play, setPlay] = useState(0)
  const reduce = useReducedMotion()
  const fallback = <p className="model-note" role="status">3D preview unavailable. The preview image is shown.</p>
  return <div className="model" data-viewer={block.id} data-open={open}>
    <div className="model-stage">
      {scene.poster ? <img className="poster" src={media(scene.poster)} alt={scene.label} /> : <div className="model-placeholder" aria-label={scene.label} role="img"><span aria-hidden="true">⬡</span><strong>{scene.label}</strong></div>}
      {open && <Boundary key={reset} fallback={fallback}>
        <Suspense fallback={<p className="model-note" role="status">Loading 3D preview…</p>}>
          <Viewer source={media(scene.model)} label={scene.label} transform={block.transform} behavior={block.behavior}
            play={play} reduce={reduce} fallback={fallback} bloom={features.bloom} />
        </Suspense>
      </Boundary>}
    </div>
    <div className="model-toolbar">
      <button type="button" data-viewer-toggle aria-expanded={open} onClick={() => { setOpen(!open); setPlay(0) }}>{open ? 'Close 3D' : block.text || 'Explore in 3D'}</button>
      {open && <>
        {block.behavior.action !== 'none' && block.behavior.trigger === 'press' && <button type="button" onClick={() => setPlay(play + 1)}>Play animation</button>}
        <button type="button" onClick={() => { setReset(reset + 1); setPlay(0) }}>Reset view</button>
      </>}
      <span>{scene.label}</span>
    </div>
  </div>
}

function Tabs({ block }) {
  const [active, select] = useState(0)
  const index = Math.min(active, block.tabs.length - 1)
  function navigate(event) {
    const offsets = { ArrowRight: 1, ArrowLeft: -1 }
    if (!(event.key in offsets) && !['Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? block.tabs.length - 1 : (index + offsets[event.key] + block.tabs.length) % block.tabs.length
    select(target)
    document.getElementById(`${block.id}-tab-${target}`)?.focus()
  }
  return <>
    <div className="tabs" role="tablist" aria-label={block.text || 'Details'} onKeyDown={navigate}>
      {block.tabs.map((tab, i) => <button key={i} type="button" role="tab" id={`${block.id}-tab-${i}`}
        aria-controls={`${block.id}-panel`} aria-selected={i === index} tabIndex={i === index ? 0 : -1} onClick={() => select(i)}>{tab.label}</button>)}
    </div>
    <div className="tab-panel" tabIndex={0} role="tabpanel" id={`${block.id}-panel`} aria-labelledby={`${block.id}-tab-${index}`}>{block.tabs[index].text}</div>
  </>
}

function Images({ block }) {
  const settings = block.image
  const imageStyle = {
    width: `${settings.width}%`,
    height: settings.height ? `${settings.height}px` : 'auto',
    objectFit: settings.height ? 'cover' : 'contain',
    transform: `translate(${settings.x}%, ${settings.y}%) rotate(${settings.rotation}deg) scale(${settings.flipX ? -1 : 1}, ${settings.flipY ? -1 : 1})`
  }
  if (!block.images.length) return <p className="empty">Add {block.kind === 'gallery' ? 'gallery images' : 'an image'} here.</p>
  return <div className={block.kind === 'gallery' ? 'gallery' : 'image-frame'}>
    {block.images.map((item, i) => <img key={i} src={media(item.src)} alt={item.alt} loading="lazy" style={imageStyle} />)}
  </div>
}

function Block({ block }) {
  let body
  if (block.kind === 'text') body = <p className="text-block">{block.text}</p>
  else if (block.kind === 'image' || block.kind === 'gallery') body = <Images block={block} />
  else if (block.kind === 'tabs') body = <Tabs block={block} />
  else if (block.kind === 'viewer') body = <Model block={block} />
  else if (block.kind === 'custom') body = block.code ? <iframe title="Custom component" loading="lazy" sandbox="allow-scripts" src={`${base}custom/${block.id}.html`} /> : <p className="empty">A custom component can go here.</p>
  else body = block.url ? <a className="cta" href={block.url.startsWith('/') ? route(block.url.slice(1).replace(/\/$/, '')) : block.url}>{block.text}</a> : <span className="cta">{block.text}</span>

  return <div className={`block motion-${block.style.motion}${block.style.glass ? ' glass' : ''}`} data-block={block.id} style={style(block.style)}>
    {block.style.glass && <GlassOverlay />}
    <div className="surface">{body}</div>
  </div>
}

function App() {
  const [effects, setEffects] = useState(false)
  const reduce = useReducedMotion()
  return <>
    <a className="skip" href="#content">Skip to content</a>
    <header className="page-top">
      <a className="brand" href={route('')}>{site.name}</a>
      <nav aria-label="Pages">{site.pages.map(item => <a key={item.id} href={route(item.slug)} aria-current={item.id === page.id ? 'page' : undefined}>{item.title}</a>)}</nav>
    </header>
    <main id="content">
      <div className="hero">
        {effects && Shader && !reduce && <Boundary fallback={null}><Suspense fallback={null}><Shader /></Suspense></Boundary>}
        <span className="eyebrow">{page.slug ? site.name : 'WEB SHOWCASE'}</span>
        <h1>{page.slug ? page.title : site.name}<span>.</span></h1>
        {Shader && !reduce && <button className="ambient-toggle" type="button" onClick={() => setEffects(!effects)}>{effects ? 'Pause ambient motion' : 'Enable ambient motion'}</button>}
      </div>
      {page.regions.map(area => <section key={area.id} className={`area motion-${area.style.motion}${area.style.glass ? ' glass' : ''}`}
        data-region={area.id} aria-labelledby={`region-${area.id}`} style={style(area.style)}>
        {area.style.glass && <GlassOverlay />}
        <h2 id={`region-${area.id}`}>{area.title}</h2>
        <div className="grid">{area.blocks.map(block => <Block key={block.id} block={block} />)}</div>
      </section>)}
    </main>
    <footer>{site.name}<span> / {page.title}</span></footer>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
