/**
 * Letter notes & melody for "La Peseta"
 * Uses Web Audio API for instant playback (no files required).
 *
 * To use real piano snippets instead:
 * - Freesound.org: search "piano single note" or "piano C4", etc. (CC0 or attribution)
 * - Pixabay.com/sound-effects: search "piano key"
 * - Zapsplat.com, Mixkit.co: free sound effects
 * Name files e.g. note-c4.mp3, note-d4.mp3 … and swap playNote() to use Audio buffers.
 */

(function () {
  var audioContext = null;

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  /** Play a note (Hz) with a short pluck envelope; minimal attack for instant sound */
  function playNote(frequency) {
    var ctx = getAudioContext();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  /** Order and frequencies for "la peseta": L A P E S E T A (8 notes) */
  var letterToFrequency = {
    "letter--l": 262,   // C4
    "letter--a-a1": 294,
    "letter--p": 330,
    "letter--e-e1": 349,
    "letter--s": 392,
    "letter--e-e2": 440,
    "letter--t": 494,
    "letter--a-a2": 523
  };

  var melodyOrder = [
    "letter--l",
    "letter--a-a1",
    "letter--p",
    "letter--e-e1",
    "letter--s",
    "letter--e-e2",
    "letter--t",
    "letter--a-a2"
  ];

  function triggerLetterAnimation(el) {
    el.classList.remove("letter--playing");
    el.offsetHeight;
    el.classList.add("letter--playing");
    setTimeout(function () {
      el.classList.remove("letter--playing");
    }, 360);
  }

  function playLetter(el) {
    var key = null;
    for (var i = 0; i < el.classList.length; i++) {
      if (letterToFrequency.hasOwnProperty(el.classList[i])) {
        key = el.classList[i];
        break;
      }
    }
    if (!key) return;
    playNote(letterToFrequency[key]);
    triggerLetterAnimation(el);
  }

  function onLetterClick(e) {
    var letter = e.target.closest(".letter");
    if (!letter) return;
    e.preventDefault();
    e.stopPropagation();
    playLetter(letter);
  }

  function onPlayClick(e) {
    e.preventDefault();
    e.stopPropagation();
    var letters = document.querySelectorAll(".letter");
    var map = {};
    letters.forEach(function (el) {
      for (var i = 0; i < el.classList.length; i++) {
        if (melodyOrder.indexOf(el.classList[i]) !== -1) {
          map[el.classList[i]] = el;
          break;
        }
      }
    });
    var stepMs = 160;
    melodyOrder.forEach(function (key, i) {
      setTimeout(function () {
        var el = map[key];
        if (el) {
          playNote(letterToFrequency[key]);
          triggerLetterAnimation(el);
        }
      }, i * stepMs);
    });
  }

  var lettersEl = document.querySelector(".letters");
  if (lettersEl) {
    lettersEl.addEventListener("click", onLetterClick);
  }
  document.querySelector(".playWrap")?.addEventListener("click", onPlayClick);
})();
