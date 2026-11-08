(() => {
  const parentWindow = window.parent
  const nonce = location.hash.slice(1)
  if (parentWindow === window || !nonce) return
  const send = (type, detail) => parentWindow.postMessage({ type, detail, nonce }, '*')
  const style = document.createElement('style')
  style.textContent = `
    html[data-wm-select] [data-region] { cursor: crosshair }
    [data-wm-region] { outline: 2px dashed #79e5bf; outline-offset: -2px }
    [data-wm-block] { outline: 2px solid #79e5bf; outline-offset: -2px }
    .wm-box { position:fixed; z-index:2147483646; border:1px solid #79e5bf; background:#79e5bf25; pointer-events:none }
    .wm-grip { position:absolute; z-index:2147483647; width:16px; height:16px; border-radius:4px; border:2px solid #0c1a18; background:#79e5bf; right:2px; bottom:2px; cursor:nwse-resize; touch-action:none }
  `
  document.head.append(style)
  let editing = false, selection = {}, drag = null, suppressClick = false
  const box = document.createElement('div')
  box.className = 'wm-box'
  box.hidden = true
  document.body.append(box)

  function find(attr, id) {
    return [...document.querySelectorAll(`[${attr}]`)].find(node => node.getAttribute(attr) === id)
  }

  function mark() {
    document.querySelectorAll('[data-wm-region], [data-wm-block]').forEach(node => {
      node.removeAttribute('data-wm-region')
      node.removeAttribute('data-wm-block')
    })
    document.querySelectorAll('.wm-grip').forEach(node => node.remove())
    document.querySelectorAll('[data-block][draggable]').forEach(node => node.removeAttribute('draggable'))
    if (!editing) return
    find('data-region', selection.regionId)?.setAttribute('data-wm-region', '')
    for (const id of selection.blockIds || []) find('data-block', id)?.setAttribute('data-wm-block', '')
    const target = (selection.blockIds || []).length === 1 ? find('data-block', selection.blockIds[0]) : null
    if (target) {
      target.draggable = true
      const handle = document.createElement('button')
      handle.type = 'button'
      handle.className = 'wm-grip'
      handle.setAttribute('aria-label', 'Drag handle for selected item')
      target.append(handle)
    }
  }

  function bounds(rect) {
    return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height }
  }

  window.addEventListener('message', event => {
    if (event.source !== parentWindow || event.data?.nonce !== nonce) return
    const { type, detail } = event.data
    if (type === 'selection') {
      selection = detail
      editing = detail.editing
      document.documentElement.toggleAttribute('data-wm-select', editing)
      mark()
    }
    if (type === 'state') {
      const block = selection.blockIds?.length === 1 && find('data-block', selection.blockIds[0])
      const area = block || find('data-region', selection.regionId)
      send('state', { width: innerWidth, height: innerHeight, scrollX, scrollY,
        rectangle: area ? bounds(area.getBoundingClientRect()) : null,
        tabs: [...document.querySelectorAll('[role=tab][aria-selected=true]')].map(node => node.id),
        viewers: [...document.querySelectorAll('[data-viewer][data-open=true]')].map(node => ({
          id: node.dataset.viewer, camera: JSON.parse(node.querySelector('[data-camera]')?.dataset.camera || 'null')
        })) })
    }
    if (type === 'restore') {
      scrollTo(detail.scrollX, detail.scrollY)
      for (const item of detail.viewers) {
        const node = find('data-viewer', item.id)
        if (!node) continue
        node.querySelector('[data-viewer-toggle]')?.click()
        if (!item.camera) continue
        const observer = new MutationObserver(() => {
          const renderer = node.querySelector('[data-ready=true]')
          if (!renderer) return
          observer.disconnect()
          renderer.dispatchEvent(new CustomEvent('wm-camera', { detail: item.camera }))
        })
        observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ready'] })
        setTimeout(() => observer.disconnect(), 8000)
      }
    }
    if (type === 'test') {
      const node = find('data-viewer', detail.id)
      if (node?.dataset.open === 'true') {
        const play = [...node.querySelectorAll('button')].find(button => button.textContent === 'Play animation')
        if (play) play.click()
        else { node.querySelector('[data-viewer-toggle]').click(); setTimeout(() => node.querySelector('[data-viewer-toggle]')?.click(), 80) }
      } else node?.querySelector('[data-viewer-toggle]')?.click()
    }
  })

  document.addEventListener('pointerdown', event => {
    if (!editing || event.button !== 0) return
    const region = event.target.closest('[data-region]')
    if (!region && !event.target.closest('main')) return
    const block = event.target.closest('[data-block]')
    if (block?.draggable && !event.target.closest('.wm-grip') && !event.altKey) return
    drag = { x: event.clientX, y: event.clientY, region, block, handle: Boolean(event.target.closest('.wm-grip')) }
    if (drag.handle) {
      drag.rect = block.getBoundingClientRect()
      drag.grid = block.parentElement.getBoundingClientRect()
      event.preventDefault()
    }
  })
  document.addEventListener('pointermove', event => {
    if (!drag || !event.buttons) return
    const x = Math.min(event.clientX, drag.x), y = Math.min(event.clientY, drag.y)
    const width = Math.abs(event.clientX - drag.x), height = Math.abs(event.clientY - drag.y)
    if (!drag.handle && width + height < 8) return
    const size = drag.handle ? { x: drag.rect.left, y: drag.rect.top, width: Math.max(40, event.clientX - drag.rect.left), height: Math.max(30, event.clientY - drag.rect.top) } : { x, y, width, height }
    Object.assign(box.style, { left: size.x + 'px', top: size.y + 'px', width: size.width + 'px', height: size.height + 'px' })
    drag.size = size
    box.hidden = false
  })
  document.addEventListener('pointerup', event => {
    if (!drag) return
    const { size, region, block, handle, grid, rect, x, y } = drag
    drag = null
    box.hidden = true
    if (!size) return
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 0)
    if (handle) {
      send('resize', { regionId: region.dataset.region, blockId: block.dataset.block, span: Math.min(12, Math.max(1, Math.round(size.width / grid.width * 12))), minHeight: Math.min(1200, Math.round(size.height)),
        dx: event.clientX - x, dy: event.clientY - y, width: rect.width, height: rect.height })
      return
    }
    const visible = [...document.querySelectorAll('[data-region]')].filter(node => {
      const r = node.getBoundingClientRect()
      return r.left < size.x + size.width && r.right > size.x && r.top < size.y + size.height && r.bottom > size.y
    })
    const target = visible.length === 1 ? visible[0] : null
    const blocks = target ? [...target.querySelectorAll('[data-block]')].filter(node => {
      const r = node.getBoundingClientRect()
      return r.left >= size.x && r.right <= size.x + size.width && r.top >= size.y && r.bottom <= size.y + size.height
    }) : []
    const areaRect = target?.getBoundingClientRect()
    const entireArea = Boolean(areaRect && areaRect.left >= size.x && areaRect.right <= size.x + size.width && areaRect.top >= size.y && areaRect.bottom <= size.y + size.height)
    send('marquee', { regions: visible.map(node => node.dataset.region), blocks: blocks.map(node => node.dataset.block), entireArea,
      rectangle: { ...size, x: size.x + scrollX, y: size.y + scrollY } })
  })
  document.addEventListener('pointercancel', () => { drag = null; box.hidden = true })
  document.addEventListener('click', event => {
    if (!event.isTrusted) return
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); return }
    const link = event.target.closest('a[href]')
    const pageRoot = new URL(document.querySelector('meta[name="webmaker-root"]').content, location.href)
    if (link && link.origin === location.origin && link.pathname.startsWith(pageRoot.pathname) && !link.hash && !event.target.closest('[data-region]')) {
      event.preventDefault()
      send('navigate', link.pathname.slice(pageRoot.pathname.length).replace(/\/$/, ''))
      return
    }
    if (!editing) return
    const region = event.target.closest('[data-region]')
    if (!region || event.target.closest('.wm-grip')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const block = event.target.closest('[data-block]')
    send('pick', { regionId: region.dataset.region, blockId: block?.dataset.block, rectangle: bounds((block || region).getBoundingClientRect()) })
  }, true)
  document.addEventListener('dragstart', event => {
    const block = event.target.closest('[data-block][draggable]')
    if (editing && block) event.dataTransfer.setData('application/webmaker-block', block.dataset.block)
  })
  document.addEventListener('dragover', event => {
    if (editing && event.target.closest('[data-region]') && event.dataTransfer.types.some(type => type.startsWith('application/webmaker-'))) event.preventDefault()
  })
  document.addEventListener('drop', event => {
    const region = event.target.closest('[data-region]')
    if (!editing || !region) return
    event.preventDefault()
    const item = event.target.closest('[data-block]')
    send('drop', { regionId: region.dataset.region, before: item?.dataset.block,
      blockId: event.dataTransfer.getData('application/webmaker-block'), kind: event.dataTransfer.getData('application/webmaker-kind') })
  })
  window.addEventListener('load', () => { mark(); send('ready', document.documentElement.dataset.page) })
})()
