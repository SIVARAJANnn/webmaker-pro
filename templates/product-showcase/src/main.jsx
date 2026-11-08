import React, { Component, Suspense, lazy, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const Scene = lazy(() => import('./scene.jsx'))
const finishes = [
  { name: 'Ochre', color: '#e3a946', poster: '#d39b3c' },
  { name: 'Moss', color: '#7c9d7b', poster: '#719474' },
  { name: 'Clay', color: '#c98171', poster: '#bc786b' }
]

class ViewerBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Poster({ color }) {
  return <svg className="poster" viewBox="0 0 620 520" role="img" aria-label="Illustration of the Form 01 speaker">
    <defs>
      <linearGradient id="front" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#383d41"/><stop offset="1" stopColor="#171a1e"/>
      </linearGradient>
      <radialGradient id="cone">
        <stop stopColor="#5e6468"/><stop offset=".45" stopColor="#24282c"/><stop offset="1" stopColor="#0d1013"/>
      </radialGradient>
    </defs>
    <ellipse cx="310" cy="441" rx="187" ry="27" fill="#0e1012" opacity=".62"/>
    <path d="M189 134 261 87H434Q451 87 451 105V360L390 415Z" fill={color}/>
    <path d="M389 149 451 105V360L389 415Z" fill="#000" opacity=".23"/>
    <rect x="178" y="131" width="222" height="284" rx="15" fill={color}/>
    <rect x="192" y="145" width="194" height="256" rx="9" fill="url(#front)"/>
    <circle cx="289" cy="213" r="27" fill="#0d1013" stroke="#565b5f" strokeWidth="3"/>
    <circle cx="289" cy="213" r="15" fill="url(#cone)"/>
    <circle cx="289" cy="315" r="68" fill="#101316" stroke="#555b60" strokeWidth="3"/>
    <circle cx="289" cy="315" r="53" fill="url(#cone)" stroke="#353b40" strokeWidth="2"/>
    <circle cx="289" cy="315" r="23" fill="#2e3336"/>
    <circle cx="209" cy="383" r="3" fill={color}/>
  </svg>
}

function App() {
  const [finish, setFinish] = useState(finishes[0])
  const [interactive, setInteractive] = useState(false)
  const [camera, setCamera] = useState(0)
  const fallback = <p className="viewer-notice" role="status">3D preview unavailable. The product illustration is shown.</p>
  return <>
    <header className="top"><a href="./" aria-label="Fieldwork Audio home">FIELDWORK<span> / AUDIO</span></a><span>OBJECT SERIES / 01</span></header>
    <main className="showcase">
      <section className="details" aria-labelledby="title">
        <p className="eyebrow"><span /> DESKTOP AUDIO</p>
        <h1 id="title">Form 01<span>.</span></h1>
        <p className="lede">A compact speaker with a solid shell and a single, clean front face.</p>
        <fieldset className="finishes">
          <legend>Finish <strong>{finish.name}</strong></legend>
          {finishes.map(option => <label key={option.name} className="swatch" style={{ '--swatch': option.color }}>
            <input type="radio" name="finish" checked={finish === option} onChange={() => setFinish(option)} aria-label={option.name}/>
            <span aria-hidden="true" />
          </label>)}
        </fieldset>
        <button className="primary" type="button" onClick={() => setInteractive(value => !value)} aria-controls="product-view">
          {interactive ? 'Show illustration' : 'Explore in 3D'} <span aria-hidden="true">{interactive ? '←' : '↗'}</span>
        </button>
      </section>
      <section id="product-view" className="stage" aria-label="Product preview">
        <div className="stage-label" aria-hidden="true"><span>FORM / 01</span><span>FIG. 01</span></div>
        <Poster color={finish.poster}/>
        {interactive && <ViewerBoundary key={camera} fallback={fallback}>
          <Suspense fallback={<p className="viewer-notice" role="status">Loading 3D preview…</p>}>
            <Scene color={finish.color} fallback={fallback}/>
          </Suspense>
        </ViewerBoundary>}
        <div className="stage-controls">
          <span>{interactive ? 'Drag to rotate · Scroll or pinch to zoom' : 'DESKTOP SPEAKER / FRONT VIEW'}</span>
          {interactive && <button type="button" onClick={() => setCamera(value => value + 1)}>Reset view</button>}
        </div>
      </section>
    </main>
    <footer className="bottom"><span>FIELDWORK AUDIO</span><span>FORM SERIES — 01</span></footer>
  </>
}

createRoot(document.getElementById('root')).render(<App/>)
