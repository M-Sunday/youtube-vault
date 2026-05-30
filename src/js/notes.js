// ─── Notes ──────────────────────────────────────────────
const noteDialog = document.getElementById('noteDialog')
const noteTitleInput = document.getElementById('noteTitleInput')
const noteContentInput = document.getElementById('noteContentInput')

function openNote(id) {
  currentNoteId = id
  const notes = getNotes()
  const n = notes.filter(x => x.id === id)[0]
  if (!n) return
  setView('note')
  document.getElementById('noteViewTitle').value = n.title || ''
  document.getElementById('noteViewContent').innerHTML = sanitizeHtml(n.content || '')
  document.getElementById('noteViewFooter').textContent = `Last edited ${new Date(n.updated || n.added).toLocaleString()}`
  renderSidebar()
}

let noteSaveTimer = null
let pendingNoteId = null
document.getElementById('noteViewTitle').addEventListener('input', noteSaveContent)
document.getElementById('noteViewContent').addEventListener('input', noteSaveContent)
document.getElementById('noteViewContent').addEventListener('blur', function () {
  if (autoLinkNoteContent()) noteSaveContent()
})

function autoLinkNoteContent() {
  const el = document.getElementById('noteViewContent')
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  const urlRegex = /https?:\/\/[^\s<>"']+|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)
  let changed = false
  for (const node of textNodes) {
    const text = node.textContent
    if (!urlRegex.test(text)) continue
    const parent = node.parentNode
    if (parent && parent.tagName === 'A') continue
    urlRegex.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIndex = 0
    let match
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
      let url = match[0]
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      a.textContent = match[0]
      frag.appendChild(a)
      lastIndex = urlRegex.lastIndex
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    if (frag.childNodes.length > 0) {
      parent.replaceChild(frag, node)
      changed = true
    }
  }
  return changed
}

function noteSaveContent() {
  clearTimeout(noteSaveTimer)
  pendingNoteId = currentNoteId
  noteSaveTimer = setTimeout(() => {
    if (!pendingNoteId || pendingNoteId !== currentNoteId) return
    autoLinkNoteContent()
    const notes = getNotes()
    const n = notes.filter(x => x.id === pendingNoteId)[0]
    if (!n) return
    n.title = document.getElementById('noteViewTitle').value
    n.content = sanitizeHtml(document.getElementById('noteViewContent').innerHTML)
    n.updated = Date.now()
    saveNotes(notes)
    document.getElementById('noteViewFooter').textContent = `Last edited ${new Date().toLocaleString()}`
    renderSidebar()
  }, 300)
}

document.getElementById('noteUndoBtn').addEventListener('click', () => {
  document.getElementById('noteViewContent').focus()
  document.execCommand('undo')
})
document.getElementById('noteRedoBtn').addEventListener('click', () => {
  document.getElementById('noteViewContent').focus()
  document.execCommand('redo')
})

function noteInsertImage(blob, el) {
  const reader = new FileReader()
  reader.onload = function (ev) {
    const img = document.createElement('img')
    img.src = ev.target.result
    img.style.maxWidth = '100%'
    img.style.borderRadius = '8px'
    img.style.margin = '8px 0'
    img.style.display = 'block'
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(img)
      range.setStartAfter(img)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      el.appendChild(img)
    }
    noteSaveContent()
  }
  reader.readAsDataURL(blob)
}

async function noteReadClipboardImage(el) {
  if (typeof AndroidClipboard !== 'undefined') {
    const dataUri = AndroidClipboard.readImage()
    if (dataUri) {
      const resp = await fetch(dataUri)
      const blob = await resp.blob()
      noteInsertImage(blob, el)
      return true
    }
  }

  try {
    const clipboardItems = await navigator.clipboard?.read()
    if (clipboardItems) {
      for (const ci of clipboardItems) {
        for (const type of ci.types) {
          if (type.startsWith('image/')) {
            const blob = await ci.getType(type)
            if (blob) {
              noteInsertImage(blob, el)
              return true
            }
          }
        }
      }
    }
  } catch {}

  return false
}

document.getElementById('noteViewContent').addEventListener('paste', async function (e) {
  const el = this

  const items = e.clipboardData?.items
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/') && typeof item.getAsFile === 'function') {
        const blob = item.getAsFile()
        if (!blob) continue
        e.preventDefault()
        noteInsertImage(blob, el)
        return
      }
    }
  }

  if (await noteReadClipboardImage(el)) {
    e.preventDefault()
    return
  }

  if (!e.clipboardData) {
    e.preventDefault()
    return
  }

  try {
    const html = e.clipboardData.getData('text/html')
    if (html && /<img[^>]+src\s*=\s*['"]data:image\//i.test(html)) {
      document.execCommand('insertHTML', false, html)
      noteSaveContent()
      return
    }
  } catch {}

  try {
    const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html')
    if (text) {
      e.preventDefault()
      document.execCommand('insertText', false, text)
      noteSaveContent()
    }
  } catch {}
})

document.getElementById('noteDeleteBtn').addEventListener('click', () => {
  if (!currentNoteId) return
  let notes = getNotes().filter(x => x.id !== currentNoteId)
  saveNotes(notes)
  closeNoteView()
  renderSidebar()
})
document.getElementById('noteCloseBtn').addEventListener('click', closeNoteView)

// Note dialog
document.getElementById('newNoteBtn').addEventListener('click', () => {
  const notes = getNotes()
  const id = '_nt_' + Date.now()
  notes.push({ id, title: 'Untitled', content: '', added: Date.now() })
  saveNotes(notes)
  renderSidebar()
  openNote(id)
  closeSidebarMobile()
  setTimeout(() => { document.getElementById('noteViewTitle').focus(); document.getElementById('noteViewTitle').select() }, 100)
})

// Note events
document.getElementById('noteDialogCancel').addEventListener('click', () => noteDialog.classList.remove('open'))
document.getElementById('noteDialogConfirm').addEventListener('click', () => {
  const title = noteTitleInput.value.trim() || 'Untitled'
  const content = noteContentInput.value
  const notes = getNotes()
  const id = '_nt_' + Date.now()
  notes.push({ id, title, content, added: Date.now() })
  saveNotes(notes)
  noteTitleInput.value = ''; noteContentInput.value = ''
  noteDialog.classList.remove('open')
  renderSidebar()
  openNote(id)
  closeSidebarMobile()
})
noteTitleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); noteContentInput.focus() } })
noteDialog.addEventListener('mousedown', (e) => { if (e.target === noteDialog) noteDialog.classList.remove('open') })

// ─── Todos ──────────────────────────────────────────────
function renderNoteTodos() {
  var el = document.getElementById('noteViewTodos')
  if (!el) return
  var notes = getNotes()
  var n = notes.find(function(x) { return x.id === currentNoteId })
  if (!n || !n.todos || !n.todos.length) { el.innerHTML = ''; return }
  var html = '<div style="border-top:1px solid #e8e8ed;padding-top:8px;margin-top:4px">'
  n.todos.forEach(function(t, i) {
    var checked = t.done ? ' checked' : ''
    html += '<div class="todo-row"><span class="todo-cb' + checked + '" data-todo-id="' + t.id + '"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="todo-cb-icon todo-cb-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="todo-cb-icon todo-cb-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></span><span class="todo-text' + (t.done ? ' done' : '') + '" contenteditable="true" data-todo-id="' + t.id + '" spellcheck="false">' + escapeHtml(t.text || '') + '</span></div>'
  })
  html += '<button class="todo-add-btn" id="todoAddBtn"><i data-lucide="plus" style="width:14px;height:14px"></i> Add todo</button></div>'
  el.innerHTML = html
  el.querySelectorAll('.todo-cb').forEach(function(cb) {
    cb.addEventListener('click', function(e) {
      var notes = getNotes()
      var n = notes.find(function(x) { return x.id === currentNoteId })
      if (!n || !n.todos) return
      var t = n.todos.find(function(x) { return x.id === this.dataset.todoId }.bind(this))
      if (!t) return
      var becomingDone = !t.done
      t.done = becomingDone
      saveNotes(notes)
      if (becomingDone) {
        this.querySelector('.todo-cb-check').style.color = '#30d158'
        var self = this
        setTimeout(function() { renderNoteTodos(); renderSidebar() }, 180)
      } else {
        renderNoteTodos(); renderSidebar()
      }
      // firework burst
      var colors = ['#007aff','#ff453a','#ffd60a','#30d158','#ff9f0a','#bf5af2']
      for (let p = 0; p < 12; p++) {
        let dot = document.createElement('div')
        let size = 2 + Math.random() * 4
        let color = colors[Math.floor(Math.random() * colors.length)]
        if (t && !t.done) color = '#ff453a'
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
    })
  })
  el.querySelectorAll('.todo-text').forEach(function(span) {
    span.addEventListener('blur', function() {
      var notes = getNotes()
      var n = notes.find(function(x) { return x.id === currentNoteId })
      if (!n || !n.todos) return
      var t = n.todos.find(function(x) { return x.id === this.dataset.todoId }.bind(this))
      if (t) { t.text = this.textContent.trim(); saveNotes(notes); renderSidebar() }
    })
    span.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); this.blur() }
    })
  })
  document.getElementById('todoAddBtn')?.addEventListener('click', function() { addTodo() })
  loadIcons(el)
}

function addTodo() {
  if (!currentNoteId) return
  var notes = getNotes()
  var n = notes.find(function(x) { return x.id === currentNoteId })
  if (!n) return
  n.todos = n.todos || []
  n.todos.push({ id: '_td_' + Date.now(), text: '', done: false })
  n.updated = Date.now()
  saveNotes(notes)
  renderNoteTodos()
  renderSidebar()
  var lastText = document.querySelector('#noteViewTodos .todo-text:last-of-type')
  if (lastText) { lastText.focus() }
}

document.getElementById('noteTodoBtn')?.addEventListener('click', function() { addTodo() })

// Override openNote to also render todos
var _origOpenNote = window.openNote || openNote
openNote = function(id) {
  if (_origOpenNote) _origOpenNote(id)
  renderNoteTodos()
}

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
