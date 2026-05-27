// ─── Onboarding (first-time user flow) ──────────────────
;(function() {
  if (getUserName()) return

  var splash = document.getElementById('splash')
  var splashIcon = document.getElementById('splashIcon')
  var splashTitle = document.getElementById('splashTitle')
  var splashText = document.getElementById('splashText')
  var step0 = document.getElementById('onbStep0')
  var onboarding = document.getElementById('onboarding')
  var step1 = document.getElementById('onbStep1')
  var step2 = document.getElementById('onbStep2')
  var welcomeText = document.getElementById('onbWelcome')
  var next0 = document.getElementById('onbNext0')
  var nameInput = document.getElementById('onbNameInput')
  var next1 = document.getElementById('onbNext1')
  var nameDisplay = document.getElementById('onbNameDisplay')
  var yesBtn = document.getElementById('onbYes')
  var noBtn = document.getElementById('onbNo')

  setTimeout(function() { welcomeText.classList.add('onb-visible') }, 600)
  setTimeout(function() { next0.classList.add('onb-visible') }, 1200)

  function goToStep1() {
    welcomeText.classList.remove('onb-visible')
    welcomeText.classList.add('onb-fade-out')
    next0.classList.remove('onb-visible')
    next0.classList.add('onb-fade-out')
    splashTitle.classList.add('onb-title-out')

    // Zoom animation: icon → circle → covers screen
    splash.style.overflow = 'hidden'
    splashIcon.style.transition = 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)'
    splashIcon.style.borderRadius = '50%'
    splashIcon.style.transform = 'scale(80)'
    splashIcon.style.opacity = '0.9'

    splashText.textContent = 'Getting set up'
    splashText.style.display = 'block'
    splashText.style.transition = 'none'
    splashText.style.opacity = '1'

    setTimeout(function() {
      splash.style.opacity = '0'
      splash.style.transition = 'opacity 0.4s ease'
      setTimeout(function() {
        splash.style.display = 'none'
        onboarding.style.display = 'flex'
        step1.style.display = 'block'
        requestAnimationFrame(function() {
          step1.querySelector('.onb-label').classList.add('onb-visible')
          nameInput.style.opacity = '1'
          nameInput.style.transform = 'translateY(0)'
        })
        setTimeout(function() { nameInput.focus() }, 400)
      }, 400)
    }, 1100)
  }

  next0.addEventListener('click', goToStep1)

  nameInput.addEventListener('input', function() {
    if (this.value.trim()) {
      next1.classList.remove('onb-hidden')
      next1.style.display = 'block'
      requestAnimationFrame(function() { next1.classList.add('onb-visible') })
    } else {
      next1.classList.remove('onb-visible')
      next1.classList.add('onb-hidden')
      setTimeout(function() { if (!nameInput.value.trim()) next1.style.display = 'none' }, 300)
    }
  })

  function goToStep2() {
    var name = nameInput.value.trim()
    if (!name) return
    nameDisplay.textContent = name
    step1.style.display = 'none'
    step2.style.display = 'block'
    requestAnimationFrame(function() {
      nameDisplay.classList.add('onb-visible')
      setTimeout(function() {
        step2.querySelector('.onb-label').classList.add('onb-visible')
        setTimeout(function() {
          yesBtn.classList.add('onb-visible')
          noBtn.classList.add('onb-visible')
        }, 300)
      }, 400)
    })
  }

  next1.addEventListener('click', goToStep2)
  nameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && next1.style.display !== 'none') goToStep2()
  })

  yesBtn.addEventListener('click', function() {
    saveUserName(nameInput.value.trim())
    onboarding.style.transition = 'opacity 0.4s ease'
    onboarding.style.opacity = '0'
    setTimeout(function() {
      onboarding.style.display = 'none'
      if (window.startApp) window.startApp()
    }, 400)
  })

  noBtn.addEventListener('click', function() {
    step2.style.display = 'none'
    ;[nameDisplay, step2.querySelector('.onb-label'), yesBtn, noBtn].forEach(function(el) {
      el.classList.remove('onb-visible')
    })
    step1.style.display = 'block'
    nameInput.value = ''
    nameInput.style.opacity = '1'
    nameInput.style.transform = 'translateY(0)'
    nameInput.focus()
    next1.style.display = 'none'
    next1.classList.remove('onb-visible')
    next1.classList.remove('onb-hidden')
  })
})()
