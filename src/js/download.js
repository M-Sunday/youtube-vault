// ─── Download ─────────────────────────────────────────
const isElectron = typeof process !== 'undefined' && process.versions?.electron

function getDownloadPrefs() {
  return {
    type: localStorage.getItem('dlType') || 'video',
    videoQuality: localStorage.getItem('dlVideoQuality') || '720',
    audioFormat: localStorage.getItem('dlAudioFormat') || 'mp3',
    audioBitrate: localStorage.getItem('dlAudioBitrate') || 'auto',
    videoCodec: localStorage.getItem('dlVideoCodec') || 'h264'
  }
}

let ytDlpDir, ytDlpPath, ytDlpUrl, ffmpegUrl, ffmpegPath
if (isElectron) {
  const path = require('path')
  const os = require('os')
  ytDlpDir = path.join(os.homedir(), '.youtube-vault', 'bin')
  ytDlpPath = path.join(ytDlpDir, 'yt-dlp.exe')
  ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
  ffmpegPath = path.join(ytDlpDir, 'ffmpeg.exe')
}

function ensureYtDlp() {
  if (!isElectron) return Promise.reject()
  if (require('fs').existsSync(ytDlpPath)) return Promise.resolve(ytDlpPath)
  return new Promise((resolve, reject) => {
    const toast = document.getElementById('updateToast')
    const toastText = document.getElementById('updateToastText')
    toastText.textContent = 'Downloading yt-dlp…'
    toast.classList.add('show')
    try { require('fs').mkdirSync(ytDlpDir, { recursive: true }) } catch {}
    const file = require('fs').createWriteStream(ytDlpPath)
    const dl = (url) => {
      require('https').get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return dl(res.headers.location)
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve(ytDlpPath) })
      }).on('error', (err) => {
        try { require('fs').unlinkSync(ytDlpPath) } catch {}
        reject(err)
      })
    }
    dl(ytDlpUrl)
  })
}

function ensureFfmpeg() {
  if (!isElectron) return Promise.reject()
  if (require('fs').existsSync(ffmpegPath)) return Promise.resolve(ffmpegPath)
  return new Promise((resolve, reject) => {
    const toast = document.getElementById('updateToast')
    const toastText = document.getElementById('updateToastText')
    toastText.textContent = 'Downloading ffmpeg…'
    toast.classList.add('show')
    try { require('fs').mkdirSync(ytDlpDir, { recursive: true }) } catch {}
    const zipPath = require('path').join(ytDlpDir, 'ffmpeg.zip')
    const extractDir = require('path').join(ytDlpDir, 'ffmpeg-temp')
    const file = require('fs').createWriteStream(zipPath)
    const dl = (url) => {
      require('https').get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return dl(res.headers.location)
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          const ps = require('child_process').spawn('powershell', [
            '-NoProfile', '-Command',
            `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force; $exe = Get-ChildItem -Path '${extractDir.replace(/'/g, "''")}' -Recurse -Filter ffmpeg.exe | Select-Object -First 1 -ExpandProperty FullName; if ($exe) { Move-Item -Path $exe -Destination '${ffmpegPath.replace(/'/g, "''")}' -Force; Write-Output 'ok' }`
          ])
          let out = ''
          ps.stdout.on('data', (d) => { out += d.toString() })
          ps.on('close', (code) => {
            try { require('fs').unlinkSync(zipPath) } catch {}
            try { require('fs').rmSync(extractDir, { recursive: true }) } catch {}
            if (code === 0 && out.trim() === 'ok' && require('fs').existsSync(ffmpegPath))
              resolve(ffmpegPath)
            else
              reject(new Error('Failed to extract ffmpeg'))
          })
          ps.on('error', reject)
        })
      }).on('error', (err) => {
        try { require('fs').unlinkSync(zipPath) } catch {}
        reject(err)
      })
    }
    dl(ffmpegUrl)
  })
}

document.getElementById('dlBtn')?.addEventListener('click', async (e) => {
  e.stopPropagation()
  if (!currentVideo?.url) return
  const prefs = getDownloadPrefs()

  if (!isElectron) return
  const toast = document.getElementById('updateToast')
  const toastText = document.getElementById('updateToastText')
  const progress = document.getElementById('dlProgress')
  const fill = document.getElementById('dlProgressFill')
  const pctText = document.getElementById('dlProgressText')

  let folder
  try {
    folder = await require('electron').ipcRenderer.invoke('pick-folder')
  } catch {}
  if (!folder) return

  progress.style.display = 'flex'
  fill.style.width = '0%'
  pctText.textContent = '0%'
  toastText.textContent = 'Preparing…'
  toast.classList.add('show')

  const quality = parseInt(prefs.videoQuality)
  const needsFfmpeg = prefs.type === 'video' && (isNaN(quality) || quality >= 1080)
  let hasFfmpeg = await new Promise(r => {
    const p = require('child_process').spawn('ffmpeg', ['-version'])
    p.on('error', () => r(false))
    p.on('close', (c) => r(c === 0))
  })
  if (!hasFfmpeg) hasFfmpeg = require('fs').existsSync(ffmpegPath)
  if (needsFfmpeg && !hasFfmpeg) {
    try {
      await ensureFfmpeg()
      hasFfmpeg = true
    } catch { toastText.textContent = 'ffmpeg download failed — limited to 720p' }
  }

  ensureYtDlp().then((ytPath) => {
    const args = []
    if (prefs.type === 'audio') {
      const bitrate = prefs.audioBitrate === 'auto' ? '' : `${prefs.audioBitrate}K`
      args.push('-x')
      if (prefs.audioFormat !== 'best') args.push('--audio-format', prefs.audioFormat)
      if (bitrate) args.push('--audio-quality', bitrate)
    } else {
      if (hasFfmpeg) {
        if (isNaN(quality)) {
          args.push('-f', 'bestvideo+bestaudio/best')
        } else {
          args.push('-f', `bestvideo[height<=?${quality}]+bestaudio/best[height<=?${quality}]`)
        }
        args.push('--merge-output-format', 'mp4')
      } else {
        if (isNaN(quality)) {
          args.push('-f', 'best')
        } else {
          args.push('-f', `best[height<=?${quality}]`)
        }
      }
      if (prefs.videoCodec === 'h264') args.push('-S', 'vcodec:h264')
    }
    args.push('-o', require('path').join(folder, '%(title)s.%(ext)s'))
    args.push('--no-playlist', '--newline', '--no-warnings', '--restrict-filenames', currentVideo.url)

    const proc = require('child_process').spawn(ytPath, args)
    let output = ''

    const updateProgress = (text) => {
      const m = text.match(/(\d+\.?\d*)%/)
      if (m) {
        const pct = Math.min(parseFloat(m[1]), 100)
        fill.style.width = pct + '%'
        pctText.textContent = pct.toFixed(1) + '%'
        toastText.textContent = `Downloading… ${pct.toFixed(0)}%`
      }
    }

    proc.stdout.on('data', (d) => { const s = d.toString(); output += s; updateProgress(s) })
    proc.stderr.on('data', (d) => { const s = d.toString(); output += s; updateProgress(s) })

    proc.on('close', (code) => {
      if (code === 0) {
        fill.style.width = '100%'
        pctText.textContent = '100%'
        toastText.textContent = 'Download complete'
        toast.classList.add('show')
        setTimeout(() => {
          progress.style.display = 'none'
          toast.classList.remove('show')
        }, 4000)
        const destMatch = output.match(/\[download\]\s+Destination:\s+(.+)/i)
        const dest = destMatch ? destMatch[1].trim() : folder
        if (dest) {
          require('child_process').exec(`explorer /select,"${dest.replace(/"/g, '""')}"`)
        }
      } else {
        const errLines = output.split('\n').filter(l => l.trim()).slice(-3).join(' | ')
        toastText.textContent = errLines || `yt-dlp exited with code ${code}`
        progress.style.display = 'none'
        setTimeout(() => toast.classList.remove('show'), 8000)
      }
    })
    proc.on('error', (err) => {
      toastText.textContent = 'Failed to start yt-dlp: ' + (err.message || '')
      progress.style.display = 'none'
      setTimeout(() => toast.classList.remove('show'), 5000)
    })
  }).catch((err) => {
    toastText.textContent = 'Failed to download yt-dlp: ' + (err.message || '')
    progress.style.display = 'none'
    setTimeout(() => toast.classList.remove('show'), 5000)
  })
})
