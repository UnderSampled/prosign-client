/* global AudioContext, WebSocket, performance */

(function () {
  'use strict'

  var textToCodeMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
    'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
    'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
    'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
    'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
    'Z': '--..', '.': '.-.-.-', ',': '--..--', ' ': ''
  }

  var codeToTextMap = {}
  for (let k of Object.keys(textToCodeMap)) {
    codeToTextMap[textToCodeMap[k]] = k
  }

  document.addEventListener('deviceready', onDeviceReady.bind(this))
  1
  function onDeviceReady () {
    // Handle the Cordova pause and resume events
    document.addEventListener('pause', onPause.bind(this))
    document.addEventListener('resume', onResume.bind(this))

    // TODO: Cordova has been loaded. Perform any initialization that requires Cordova here.
  }

  function onPause () {
    // TODO: This application has been suspended. Save application state here.
  }

  function onResume () {
    // TODO: This application has been reactivated. Restore application state here.
  }

  var tx = document.getElementById('tx')
  var txKey = keyer(tx)
  var txKeyer = tx.getElementsByClassName('keyer')[0]
  txKeyer.addEventListener('touchstart', function () { txKey(true) })
  txKeyer.addEventListener('touchend', function () { txKey(false) })

  var rx = document.getElementById('rx')
  var rxKey = keyer(rx)
  var rxKeyer = rx.getElementsByClassName('keyer')[0]
  rxKeyer.addEventListener('touchend', function () { receive(rxKey, textToCode('This is a test.'), 18) })

  connectToServer('ws://localhost:8080/morse')

  function startTone (hz) {
    var context = new AudioContext() // one context per document
    var osc = context.createOscillator() // instantiate an oscillator
    osc.frequency.value = hz
    var tone = context.createGain()
    tone.gain.value = 0 // from 0 to 1, 1 full volume, 0 is muted
    osc.connect(tone) // connect osc to vol
    tone.connect(context.destination) // connect it to the destination
    osc.start()

    return function setTone (state) {
      tone.gain.value = (state ? 1 : 0)
    }
  }

  function connectToServer (url) {
    var ws = new WebSocket(url)
    ws.onopen = function () {
      ws.send('KM4DVF')
    }
    ws.onmessage = function (evt) {
      var msg = evt.data
      console.log(msg)
    }

    return function send (msg) {
      ws.send(msg)
    }
  }

  function keyer (box) {
    var keyer = box.getElementsByClassName('keyer')[0]
    var plot = box.getElementsByClassName('plot')[0]
    var codeDisplay = box.getElementsByClassName('code')[0]
    var textDisplay = box.getElementsByClassName('text')[0]

    var tone = startTone(750)

    var events = [[performance.now(), false]]
    var code = ['']
    var text = ''

    var curState = false
    var timeout

    var dit = 1200 / 19

    function key (state) {
      if (state !== curState) {
        curState = state
        var now = performance.now()

        var length = now - events[events.length - 1][0]

        if (state) keyer.classList.add('hot')
        else keyer.classList.remove('hot')

        navigator.vibrate(state ? 10000 : 0)
        tone(state)
        events.push([now, state])

        if (!state) {
          if (length >= 3 * dit) code[code.length - 1] += '-'
          else code[code.length - 1] += '.'

          timeout = setTimeout(function () {
            if (codeToTextMap[code[code.length - 1]]) {
              text += codeToTextMap[code[code.length - 1]]
              textDisplay.textContent = toSentenceCase(text)
            }

            code.push('')

            timeout = setTimeout(function () {
              text += ' '
              code.push('')

              timeout = setTimeout(function () {
                code = ['']
                text = ''

                codeDisplay.textContent = ' '
                textDisplay.textContent = ' '
              }, 3000)
            }, 4 * dit)
          }, 3 * dit)

          codeDisplay.textContent = code.join(' ')
        }
        else clearTimeout(timeout)
      }
    }

    window.requestAnimationFrame(function (now) { drawPlot(now, plot, events) })

    return key
  }

  function receive (key, code, wpm) {
    var t = 0
    var signal = []
    var dit = 1200 / wpm

    var i, len
    for (i = 0, len = code.length; i < len; i++) {
      switch (code[i]) {
        case '.':
          signal.push(t)
          t += dit
          signal.push(t)
          break
        case '-':
          signal.push(t)
          t += 3 * dit
          signal.push(t)
          break
        case ' ':
          t += dit
          if (code[i - 1] === ' ') t += 5 * dit
          break
      }
      t += dit
    }

    var state = false
    for (i = 0, len = signal.length; i < len; i++) {
      state = !state
      setTimeout(function (state) { key(state) }, signal[i], state)
    }
  }

  function textToCode (message) {
    var code = []
    var m = message.toUpperCase()
    for (var i = 0, len = message.length; i < len; i++) code.push(textToCodeMap[m[i]])
    return code.join(' ')
  }

  /*
  function codeToText (message) {
    var text = ''
    var m = message.split(' ')
    for (var i = 0, len = m.length; i < len; i++) text += codeToTextMap[m[i]]
    return toSentenceCase(text)
  }
  */

  function toSentenceCase (text) {
    return text[0] + text.slice(1).toLowerCase()
  }

  function drawPlot (now, plot, events) {
    var ctx = plot.getContext('2d')
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.lineWidth = ctx.canvas.height
    ctx.strokeStyle = '#555'

    var plotState = false
    for (var i = 0, len = events.length; i < len; i++) {
      var pos = Math.floor(ctx.canvas.width - (now - events[i][0]) / 10)

      if (plotState !== events[i][1]) {
        plotState = events[i][1]
        if (plotState) {
          ctx.beginPath()
          ctx.moveTo(pos, ctx.lineWidth / 2)
        } else {
          ctx.lineTo(pos, ctx.lineWidth / 2)
          ctx.stroke()
        }
      }
    }
    if (events[events.length - 1][1]) {
      ctx.lineTo(ctx.canvas.width, ctx.lineWidth / 2)
      ctx.stroke()
    }

    window.requestAnimationFrame(function (now) { drawPlot(now, plot, events) })
  }
})()
