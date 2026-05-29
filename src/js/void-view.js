// ─── Void View: 2D Floating Ideas ─────────────────────────
let voidActive = false
let focusedVoidIdea = null
let voidScale = 1
var voidCanvasWidth = 0
var voidCanvasHeight = 0

function hashId(str) {
  var h = 0
  for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); h = ((h << 5) - h) + c; h |= 0 }
  return Math.abs(h)
}

function ideaPos(id, cw, ch) {
  var pad = 70
  var h = hashId(id)
  return { x: pad + (h % Math.max(cw - pad * 2, 1)), y: pad + ((h * 7) % Math.max(ch - pad * 2, 1)) }
}

function getViewport() {
  return document.getElementById('voidViewport') || document.getElementById('voidCanvas')
}

function updateVoidTransform() {
  var vp = getViewport()
  if (!vp) return
  if (focusedVoidIdea) {
    var fNode = vp.querySelector('[data-idea-id="' + focusedVoidIdea + '"]')
    if (!fNode) fNode = vp.querySelector('[data-idea-ids*="' + focusedVoidIdea + '"]')
    if (fNode && fNode._vx !== undefined) {
      var tx = -(fNode._vx + fNode.offsetWidth / 2 - voidCanvasWidth / 2)
      var ty = -(fNode._vy + fNode.offsetHeight / 2 - voidCanvasHeight / 2)
      vp.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + voidScale + ')'
      return
    }
  }
  vp.style.transform = 'scale(' + voidScale + ')'
}

function openVoidView() {
  var vv = document.getElementById('voidView')
  if (!vv) return
  vv.classList.remove('hidden')
  voidActive = true
  focusedVoidIdea = null
  voidScale = 1
  var canvas = document.getElementById('voidCanvas')
  if (canvas) {
    voidCanvasWidth = canvas.offsetWidth
    voidCanvasHeight = canvas.offsetHeight
  }
  var vp = getViewport()
  if (vp) { vp.style.transition = ''; vp.style.transform = '' }
  renderVoidView()
  document.getElementById('voidInput')?.focus()
}

function closeVoidView() {
  var vv = document.getElementById('voidView')
  vv.classList.add('hidden')
  voidActive = false
  focusedVoidIdea = null
  voidScale = 1
  var existing = document.querySelector('.void-detail')
  if (existing) existing.remove()
  document.querySelectorAll('.void-node.focused').forEach(function(n) { n.classList.remove('focused') })
  var vp = getViewport()
  if (vp) { vp.style.transition = ''; vp.style.transform = '' }
}

function renderVoidView() {
  var canvas = document.getElementById('voidCanvas')
  var vp = getViewport()
  if (!vp) return
  voidCanvasWidth = canvas.offsetWidth
  voidCanvasHeight = canvas.offsetHeight

  vp.querySelectorAll('.void-node, .void-connection, .void-welcome').forEach(function(el) { el.remove() })

  var ideas = collectVoidIdeas()
  var stages = getVaultStages()
  var connections = getVaultConnections()

  if (!ideas.length) {
    var welcome = document.createElement('div')
    welcome.className = 'void-welcome'
    welcome.textContent = 'Welcome to the Void'
    vp.appendChild(welcome)
    return
  }

  ideas.forEach(function(idea) {
    var stage = stages[idea.id] || 'void'
    var pos = ideaPos(idea.id, voidCanvasWidth, voidCanvasHeight)
    var node = document.createElement('div')
    node.className = 'void-node stage-' + stage
    node.dataset.ideaId = idea.id
    node.dataset.stage = stage
    node.style.left = pos.x + 'px'
    node.style.top = pos.y + 'px'
    node.style.animationDelay = (hashId(idea.id) % 5) + 's'
    node._vx = pos.x
    node._vy = pos.y

    node.innerHTML = '<span class="void-node-title">' + escapeHtml(idea.title || 'Untitled') + '</span>'

    node.addEventListener('click', function(e) {
      e.stopPropagation()
      focusVoidIdea(idea.id)
    })

    vp.appendChild(node)
  })

  // draw connection lines
  connections.forEach(function(conn) {
    var fromEl = vp.querySelector('[data-idea-id="' + conn.from + '"]')
    var toEl = vp.querySelector('[data-idea-id="' + conn.to + '"]')
    if (!fromEl || !toEl) return
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'void-connection')
    svg.setAttribute('data-from', conn.from)
    svg.setAttribute('data-to', conn.to)
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1'
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    var vpRect = vp.getBoundingClientRect()
    var fromRect = fromEl.getBoundingClientRect()
    var toRect = toEl.getBoundingClientRect()
    line.setAttribute('x1', fromRect.left + fromRect.width / 2 - vpRect.left)
    line.setAttribute('y1', fromRect.top + fromRect.height / 2 - vpRect.top)
    line.setAttribute('x2', toRect.left + toRect.width / 2 - vpRect.left)
    line.setAttribute('y2', toRect.top + toRect.height / 2 - vpRect.top)
    line.setAttribute('stroke', 'rgba(191, 90, 242, 0.2)')
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('stroke-dasharray', '5 4')
    svg.appendChild(line)
    vp.appendChild(svg)
  })

  // click empty space to unfocus
  canvas.addEventListener('click', function(e) {
    if (e.target === canvas || e.target === vp) unfocusVoidIdea()
  })

  document.getElementById('voidInput')?.focus()
}

function focusVoidIdea(ideaId) {
  var ids = Array.isArray(ideaId) ? ideaId : [ideaId]
  var isMerged = ids.length > 1
  focusedVoidIdea = ids[0]
  document.querySelectorAll('.void-node').forEach(function(n) { n.classList.remove('focused') })

  var node = isMerged
    ? document.querySelector('[data-idea-ids*="' + ids[0] + '"]')
    : document.querySelector('[data-idea-id="' + ids[0] + '"]')
  if (node) node.classList.add('focused')

  var vp = getViewport()
  if (vp && node) {
    vp.style.transition = 'none'
    voidScale = 1.35
    updateVoidTransform()
  }

  var allIdeas = collectVoidIdeas()
  var ideas = ids.map(function(id) { return allIdeas.find(function(i) { return i.id === id }) }).filter(Boolean)
  if (!ideas.length) return

  var stages = getVaultStages()
  var conns = getVaultConnections()

  var existing = document.querySelector('.void-detail')
  if (existing) existing.remove()

  var detail = document.createElement('div')
  detail.className = 'void-detail open'

  if (isMerged && ideas.length === 2) {
    var stage = stages[ideas[0].id] || 'void'
    var connCount = conns.filter(function(c) {
      return ids.indexOf(c.from) !== -1 || ids.indexOf(c.to) !== -1
    }).length
    detail.innerHTML =
      '<div class="void-detail-title">' + escapeHtml(ideas[0].title || 'Untitled') + ' + ' + escapeHtml(ideas[1].title || 'Untitled') + '</div>' +
      '<div class="void-detail-meta">✦ Merged Pair — Stage: ' + stage.replace('_', ' ') + ' — ' + connCount + ' connection' + (connCount !== 1 ? 's' : '') + '</div>' +
      ideas.map(function(idea, idx) {
        var iid = ids[idx]
        var st = stages[iid] || 'void'
        return '<div class="void-detail-meta" style="font-size:10px;display:flex;justify-content:space-between;align-items:center">' +
          '<span>' + escapeHtml(idea.title || 'Untitled') + ' — ' + st.replace('_', ' ') + '</span>' +
          '<span style="font-size:9px;opacity:0.5">' + new Date(idea.created || Date.now()).toLocaleDateString() + '</span>' +
        '</div>'
      }).join('') +
      '<div class="void-detail-actions">' +
        '<button class="vd-promote" id="vdMergedPromote"><i data-lucide="arrow-up" style="width:12px;height:12px"></i> Promote Both</button>' +
        '<button class="vd-demote" id="vdMergedDemote"><i data-lucide="arrow-down" style="width:12px;height:12px"></i> Demote Both</button>' +
        '<button id="vdMergedUnlink" style="color:#ff9f0a"><i data-lucide="unlink" style="width:12px;height:12px"></i> Unlink</button>' +
        '<button id="vdMergedDelete" style="color:#ff453a"><i data-lucide="trash-2" style="width:12px;height:12px"></i> Delete Pair</button>' +
      '</div>'

    document.getElementById('voidView').appendChild(detail)
    var footer = document.querySelector('.void-view-footer')
    if (footer) detail.style.bottom = footer.offsetHeight + 'px'

    document.getElementById('vdMergedPromote')?.addEventListener('click', function() {
      ids.forEach(function(id) { promoteIdea(id) })
      var fakeEvent = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
      todoBurst(fakeEvent)
      checkAchievements()
      renderVoidView()
    })
    document.getElementById('vdMergedDemote')?.addEventListener('click', function() {
      ids.forEach(function(id) { demoteIdea(id) })
      renderVoidView()
    })
    document.getElementById('vdMergedUnlink')?.addEventListener('click', function() {
      var c = getVaultConnections()
      saveVaultConnections(c.filter(function(conn) {
        return !(ids.indexOf(conn.from) !== -1 && ids.indexOf(conn.to) !== -1)
      }))
      renderVoidView()
    })
    document.getElementById('vdMergedDelete')?.addEventListener('click', function() {
      if (!confirm('Delete both ideas and their connections?')) return
      unfocusVoidIdea()
      var all = getVaultIdeas()
      saveVaultIdeas(all.filter(function(i) { return ids.indexOf(i.id) === -1 }))
      var sts = getVaultStages()
      ids.forEach(function(id) { delete sts[id] })
      saveVaultStages(sts)
      var c = getVaultConnections()
      saveVaultConnections(c.filter(function(conn) { return ids.indexOf(conn.from) === -1 && ids.indexOf(conn.to) === -1 }))
      renderVoidView()
    })
  } else {
    var idea = ideas[0]
    var sid = ids[0]
    var stage = stages[sid] || 'void'
    var connCount = conns.filter(function(c) { return c.from === sid || c.to === sid }).length
    detail.innerHTML =
      '<div class="void-detail-title">' + escapeHtml(idea.title || 'Untitled') + '</div>' +
      '<div class="void-detail-meta">Stage: ' + stage.replace('_', ' ') + ' — ' + connCount + ' connection' + (connCount !== 1 ? 's' : '') + '</div>' +
      '<div class="void-detail-meta" style="font-size:10px">Created ' + new Date(idea.created || Date.now()).toLocaleDateString() + '</div>' +
      '<div class="void-detail-actions">' +
        '<button class="vd-promote" id="vdPromote"><i data-lucide="arrow-up" style="width:12px;height:12px"></i> Promote</button>' +
        '<button class="vd-demote" id="vdDemote"><i data-lucide="arrow-down" style="width:12px;height:12px"></i> Demote</button>' +
        '<button id="vdRename"><i data-lucide="edit-3" style="width:12px;height:12px"></i> Rename</button>' +
        '<button id="vdDelete" style="color:#ff453a"><i data-lucide="trash-2" style="width:12px;height:12px"></i> Delete</button>' +
      '</div>'

    document.getElementById('voidView').appendChild(detail)
    var footer = document.querySelector('.void-view-footer')
    if (footer) detail.style.bottom = footer.offsetHeight + 'px'

    document.getElementById('vdPromote')?.addEventListener('click', function() {
      promoteIdea(sid)
      var fakeEvent = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
      todoBurst(fakeEvent)
      checkAchievements()
      renderVoidView()
    })
    document.getElementById('vdDemote')?.addEventListener('click', function() {
      demoteIdea(sid)
      var c = getVaultConnections()
      var hadConn = c.some(function(conn) { return conn.from === sid || conn.to === sid })
      if (hadConn) {
        saveVaultConnections(c.filter(function(conn) { return conn.from !== sid && conn.to !== sid }))
      }
      renderVoidView()
    })
    document.getElementById('vdRename')?.addEventListener('click', function() {
      var newName = prompt('Rename idea:', idea.title || '')
      if (newName && newName.trim()) {
        var all = getVaultIdeas()
        var found = all.find(function(i) { return i.id === sid })
        if (found) { found.title = newName.trim(); found.updated = Date.now(); saveVaultIdeas(all) }
        renderVoidView()
      }
    })
    document.getElementById('vdDelete')?.addEventListener('click', function() {
      if (!confirm('Delete this idea?')) return
      unfocusVoidIdea()
      var all = getVaultIdeas()
      saveVaultIdeas(all.filter(function(i) { return i.id !== sid }))
      var sts = getVaultStages()
      delete sts[sid]; saveVaultStages(sts)
      var c = getVaultConnections()
      saveVaultConnections(c.filter(function(conn) { return conn.from !== sid && conn.to !== sid }))
      renderVoidView()
    })
  }

  loadIcons(detail)
}

function zoomVoid(factor) {
  var vp = getViewport()
  if (!vp) return
  voidScale = Math.max(0.15, Math.min(5, voidScale * factor))
  vp.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
  updateVoidTransform()
  setTimeout(function() { vp.style.transition = '' }, 400)
}

function resetVoidZoom() {
  var vp = getViewport()
  if (!vp) return
  voidScale = 1
  vp.style.transition = 'transform 0.3s ease'
  updateVoidTransform()
  setTimeout(function() { vp.style.transition = '' }, 300)
}

function unfocusVoidIdea() {
  focusedVoidIdea = null
  var existing = document.querySelector('.void-detail')
  if (existing) existing.remove()
  document.querySelectorAll('.void-node.focused').forEach(function(n) { n.classList.remove('focused') })
  var vp = getViewport()
  if (vp) {
    vp.style.transition = ''
    updateVoidTransform()
  }
}

function collectVoidIdeas() {
  var result = []
  var seen = new Set()
  getVaultIdeas().forEach(function(i) { if (!seen.has(i.id)) { seen.add(i.id); result.push(i) } })
  var videos = getVideos()
  Object.keys(videos).forEach(function(id) {
    if (!seen.has(id)) {
      seen.add(id)
      result.push({ id: id, title: videos[id].title, type: 'video', source: 'youtube', created: videos[id].added })
    }
  })
  var notes = getNotes()
  notes.forEach(function(n) {
    if (!seen.has(n.id) && !n.id.startsWith('_nt_')) {
      seen.add(n.id)
      result.push({ id: n.id, title: n.title || 'Untitled Note', type: 'note', source: 'notes', created: n.added })
    }
  })
  return result
}

function linkIdeas(fromId, toId) {
  if (fromId === toId) return
  var connections = getVaultConnections()
  var exists = connections.some(function(c) {
    return (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
  })
  if (exists) return
  connections.push({ from: fromId, to: toId, created: Date.now() })
  saveVaultConnections(connections)
  var stages = getVaultStages()
  ;[fromId, toId].forEach(function(id) {
    var s = stages[id] || 'void'
    if (s === 'void' || s === 'signal') stages[id] = 'star_system'
  })
  saveVaultStages(stages)
  checkAchievements()
  var fakeEvent = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
  todoBurst(fakeEvent)
}

function addIdeaToVoid() {
  var input = document.getElementById('voidInput')
  if (!input) return
  var title = input.value.trim()
  if (!title) { input.focus(); return }
  createVaultIdea(title, 'note', 'void-view')
  input.value = ''
  input.focus()
  checkAchievements()
  renderVoidView()
  var canvas = document.getElementById('voidCanvas')
  var rect = canvas.getBoundingClientRect()
  var fakeEvent = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
  todoBurst(fakeEvent)
}

// ─── Particles ──────────────────────────────────────────
function todoBurst(e) {
  var colors = ['#007aff','#ff453a','#ffd60a','#30d158','#ff9f0a','#bf5af2']
  for (let p = 0; p < 12; p++) {
    let dot = document.createElement('div')
    let size = 3 + Math.random() * 5
    let color = colors[Math.floor(Math.random() * colors.length)]
    dot.className = 'todo-particle'
    dot.style.cssText = 'position:fixed;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';pointer-events:none;z-index:99999;left:' + (e.clientX - size/2) + 'px;top:' + (e.clientY - size/2) + 'px;box-shadow:0 0 ' + (size * 2) + 'px ' + color
    document.body.appendChild(dot)
    let angle = Math.random() * 360
    let dist = 20 + Math.random() * 30
    let dx = Math.cos(angle * Math.PI / 180) * dist
    let dy = Math.sin(angle * Math.PI / 180) * dist
    dot.style.transition = 'transform 0.45s cubic-bezier(0,.8,.5,1), opacity 0.45s ease, box-shadow 0.45s ease'
    requestAnimationFrame(function() {
      dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0)'
      dot.style.opacity = '0'
      dot.style.boxShadow = 'none'
    })
    setTimeout(function() { if (dot.parentNode) dot.parentNode.removeChild(dot) }, 500)
  }
}

function burstParticles(x, y, color) {
  var fakeEvent = { clientX: x, clientY: y }
  todoBurst(fakeEvent)
}

// ─── Event wiring ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('voidViewBack')?.addEventListener('click', closeVoidView)
  document.getElementById('voidAddBtn')?.addEventListener('click', addIdeaToVoid)
  document.getElementById('voidInput')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); addIdeaToVoid() }
  })
  document.getElementById('voidZoomIn')?.addEventListener('click', function() { zoomVoid(1.25) })
  document.getElementById('voidZoomOut')?.addEventListener('click', function() { zoomVoid(0.8) })
  document.getElementById('voidZoomReset')?.addEventListener('click', resetVoidZoom)

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.wb-btn[data-action="void"]')
    if (btn) openVoidView()
  })

  document.getElementById('newVoidTopBtn')?.addEventListener('click', function() {
    if (voidActive) {
      document.getElementById('voidInput')?.focus()
    } else {
      openVoidView()
    }
  })

  var canvas = document.getElementById('voidCanvas')
  if (canvas) {
    var _touchDist = 0
    canvas.addEventListener('wheel', function(e) {
      e.preventDefault()
      var vp = getViewport()
      if (!vp) return
      var dir = e.deltaY > 0 ? -1 : 1
      var step = 0.12 * (1 + Math.abs(voidScale - 1) * 0.3)
      voidScale = Math.max(0.15, Math.min(5, voidScale + dir * step))
      vp.style.transition = 'none'
      updateVoidTransform()
    }, { passive: false })

    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        var t = e.touches
        _touchDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
      }
    }, { passive: true })

    canvas.addEventListener('touchmove', function(e) {
      if (e.touches.length === 2 && _touchDist > 0) {
        e.preventDefault()
        var vp = getViewport()
        if (!vp) return
        var t = e.touches
        var newDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
        voidScale = Math.max(0.15, Math.min(5, voidScale * (newDist / _touchDist)))
        _touchDist = newDist
        vp.style.transition = 'none'
        updateVoidTransform()
      }
    }, { passive: false })

    canvas.addEventListener('touchend', function() { _touchDist = 0 }, { passive: true })
  }
})

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && voidActive && !focusedVoidIdea) closeVoidView()
  if (e.key === 'Escape' && voidActive && focusedVoidIdea) unfocusVoidIdea()
})
