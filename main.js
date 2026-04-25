/**
 * Site behaviour bundle: letters/play, draggable stickers, course index sync, opinions stack.
 * (Language switching lives in i18n.js.)
 */

/* =============================================================================
   Letters & play melody (sample playback via Web Audio API)
   ============================================================================= */
(function () {
  var audioContext = null;
  var bufferCache = {};
  var loadPromises = {};

  var letterToSoundUrl = {
    "letter--l": "./sounds/L.wav",
    "letter--a-a1": "./sounds/A.wav",
    "letter--p": "./sounds/P.wav",
    "letter--e-e1": "./sounds/E.wav",
    "letter--s": "./sounds/S.wav",
    "letter--e-e2": "./sounds/E2.wav",
    "letter--t": "./sounds/T.wav",
    "letter--a-a2": "./sounds/A2.wav"
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

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  function loadBuffer(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("sound fetch failed: " + url);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        var ctx = getAudioContext();
        return ctx.decodeAudioData(ab.slice(0));
      });
  }

  function ensureBuffer(classKey) {
    var url = letterToSoundUrl[classKey];
    if (!url) return Promise.reject(new Error("unknown letter key"));
    if (bufferCache[classKey]) return Promise.resolve(bufferCache[classKey]);
    if (!loadPromises[classKey]) {
      loadPromises[classKey] = loadBuffer(url).then(function (buf) {
        bufferCache[classKey] = buf;
        return buf;
      });
    }
    return loadPromises[classKey];
  }

  var warnedFileProtocol = false;

  function playWithHtmlAudio(url) {
    var a = new Audio(url);
    a.play().catch(function () {
      if (window.location.protocol === "file:" && !warnedFileProtocol) {
        warnedFileProtocol = true;
        console.warn(
          "La Peseta: letter sounds often do not load from file://. Run a local server, e.g. python3 -m http.server, then open http://localhost:8000"
        );
      }
    });
  }

  function resumeContext() {
    var ctx = getAudioContext();
    if (ctx.state === "suspended" && typeof ctx.resume === "function") {
      return ctx.resume().catch(function () {});
    }
    return Promise.resolve();
  }

  function playBuffer(buffer) {
    var ctx = getAudioContext();
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  }

  function playSoundForKey(classKey) {
    var url = letterToSoundUrl[classKey];
    if (!url) return;
    if (bufferCache[classKey]) {
      resumeContext().then(function () {
        playBuffer(bufferCache[classKey]);
      });
      return;
    }
    resumeContext()
      .then(function () {
        return ensureBuffer(classKey);
      })
      .then(playBuffer)
      .catch(function () {
        playWithHtmlAudio(url);
      });
  }

  function preloadAllSounds() {
    melodyOrder.forEach(function (key) {
      ensureBuffer(key).catch(function () {
        /* file:// or missing file — HTMLAudio fallback on first click */
      });
    });
  }

  function triggerLetterAnimation(el) {
    el.classList.remove("letter--playing");
    el.offsetHeight;
    el.classList.add("letter--playing");
    setTimeout(function () {
      el.classList.remove("letter--playing");
    }, 360);
  }

  function getLetterKey(el) {
    for (var i = 0; i < el.classList.length; i++) {
      if (letterToSoundUrl.hasOwnProperty(el.classList[i])) {
        return el.classList[i];
      }
    }
    return null;
  }

  function playLetter(el) {
    var key = getLetterKey(el);
    if (!key) return;
    triggerLetterAnimation(el);
    playSoundForKey(key);
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
    resumeContext().then(function () {
      melodyOrder.forEach(function (key, i) {
        setTimeout(function () {
          var el = map[key];
          if (!el) return;
          triggerLetterAnimation(el);
          playSoundForKey(key);
        }, i * stepMs);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preloadAllSounds);
  } else {
    preloadAllSounds();
  }

  var lettersEl = document.querySelector(".letters");
  if (lettersEl) {
    lettersEl.addEventListener("click", onLetterClick);
  }
  document.querySelector(".playWrap")?.addEventListener("click", onPlayClick);
})();

/* =============================================================================
   Stickers (drag)
   ============================================================================= */
(function () {
  var container = document.querySelector(".cover-section");
  var guitar = document.querySelector(".sticker--guitar");
  var lamp = document.querySelector(".sticker--lamp");
  var mug = document.querySelector(".sticker--mug");
  var bag = document.querySelector(".sticker--bag");
  var stickers = [guitar, lamp, mug, bag].filter(Boolean);
  if (!container || !stickers.length) return;

  var dragCue = document.querySelector(".cover-drag-cue");
  var dragCueHidden = false;
  var DRAG_CUE_HIDE_PX_SQ = 36;

  function hideDragCue() {
    if (dragCueHidden || !dragCue) return;
    dragCueHidden = true;
    dragCue.classList.add("is-hidden");
  }

  var active = null;
  var startX = 0, startY = 0;
  var startLeft = 0, startTop = 0;

  function getContainerRect() {
    return container.getBoundingClientRect();
  }

  function clampStickerToContainer(sticker) {
    if (!sticker || !sticker.style.left || !sticker.style.top) return;
    var rect = getContainerRect();
    var r = sticker.getBoundingClientRect();
    var left = parseFloat(sticker.style.left);
    var top = parseFloat(sticker.style.top);
    if (isNaN(left) || isNaN(top)) return;
    var w = r.width;
    var h = r.height;
    var clampedLeft = Math.max(w / 2, Math.min(rect.width - w / 2, left));
    var clampedTop = Math.max(h / 2, Math.min(rect.height - h / 2, top));
    sticker.style.left = clampedLeft + "px";
    sticker.style.top = clampedTop + "px";
  }

  function getClientXY(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.type === "mousedown") return;
    active = e.currentTarget;
    var rect = getContainerRect();
    var r = active.getBoundingClientRect();
    startLeft = (r.left + r.width / 2) - rect.left;
    startTop = (r.top + r.height / 2) - rect.top;
    var xy = getClientXY(e);
    startX = xy.x;
    startY = xy.y;
    active.style.left = startLeft + "px";
    active.style.top = startTop + "px";
    active.style.transform = "translate(-50%, -50%)";
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!active) return;
    var xy = getClientXY(e);
    var rect = getContainerRect();
    var r = active.getBoundingClientRect();
    var w = r.width;
    var h = r.height;
    var dx = xy.x - startX;
    var dy = xy.y - startY;
    if (!dragCueHidden && dx * dx + dy * dy >= DRAG_CUE_HIDE_PX_SQ) {
      hideDragCue();
    }
    var newLeft = startLeft + dx;
    var newTop = startTop + dy;
    active.style.left = Math.max(w / 2, Math.min(rect.width - w / 2, newLeft)) + "px";
    active.style.top = Math.max(h / 2, Math.min(rect.height - h / 2, newTop)) + "px";
  }

  function onPointerUp() {
    if (active) {
      clampStickerToContainer(active);
      active = null;
    }
  }

  function onResize() {
    stickers.forEach(clampStickerToContainer);
  }

  stickers.forEach(function (el) {
    el.addEventListener("mousedown", onPointerDown);
    el.addEventListener("touchstart", onPointerDown, { passive: false });
  });

  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("mouseup", onPointerUp);
  document.addEventListener("mouseleave", onPointerUp);
  document.addEventListener("touchmove", onPointerMove, { passive: false });
  document.addEventListener("touchend", onPointerUp);
  document.addEventListener("touchcancel", onPointerUp);

  window.addEventListener("resize", onResize);
})();

/* =============================================================================
   Course index ↔ scroll
   ============================================================================= */
(function () {
  const links = document.querySelectorAll(".index-btn");
  const sectionIds = ["course-composicion", "course-produccion", "course-taller"];
  if (!links.length) return;

  let activeId = "";
  let scrollLockUntil = 0;
  let rafId = 0;

  function setActive(id, force) {
    if (!id) return;
    if (!force && id === activeId) return;
    activeId = id;
    links.forEach(function (a) {
      const href = a.getAttribute("href");
      const match = href && href.startsWith("#") ? href.slice(1) : "";
      const on = match === id;
      a.classList.toggle("is-active", on);
      if (on) {
        a.setAttribute("aria-current", "true");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  const sections = sectionIds.map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);

  function getActivationLineY() {
    const nav = document.querySelector(".block-2 .index");
    if (nav) {
      const r = nav.getBoundingClientRect();
      const isStickyStrip = r.height < 120 && r.top < 100;
      if (isStickyStrip) {
        return Math.min(r.bottom + 8, window.innerHeight * 0.45);
      }
    }
    return Math.max(100, Math.min(200, window.innerHeight * 0.3));
  }

  function updateActiveFromScroll() {
    if (Date.now() < scrollLockUntil) return;
    if (!sections.length) return;

    const lineY = getActivationLineY();
    let active = sectionIds[0];

    sections.forEach(function (s) {
      const top = s.getBoundingClientRect().top;
      if (top <= lineY) {
        active = s.id;
      }
    });

    const scrollBottom = window.scrollY + window.innerHeight;
    const docBottom = document.documentElement.scrollHeight;
    if (scrollBottom >= docBottom - 3) {
      active = sections[sections.length - 1].id;
    }

    setActive(active, false);
  }

  function onScrollOrResize() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      updateActiveFromScroll();
    });
  }

  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);

  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      const href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      scrollLockUntil = Date.now() + 1400;
      setActive(id, true);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  updateActiveFromScroll();
})();

/* =============================================================================
   Opinions stack
   ============================================================================= */
(function () {
  const stack = document.getElementById("opinions-stack");
  if (!stack) return;

  const tiles = Array.from(stack.querySelectorAll(".opinion-tile"));
  const SWIPE_PX = 48;
  const TAP_PX = 12;
  const AUTO_MS = 10000;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function cycleStack() {
    tiles.forEach((tile) => {
      const z = parseInt(getComputedStyle(tile).zIndex, 10) || 1;
      tile.style.zIndex = z === 4 ? 1 : z + 1;
    });
  }

  function cycleStackPrev() {
    tiles.forEach((tile) => {
      const z = parseInt(getComputedStyle(tile).zIndex, 10) || 1;
      tile.style.zIndex = z === 1 ? 4 : z - 1;
    });
  }

  let autoTimer = null;

  function scheduleAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
    if (!reduceMotion.matches) {
      autoTimer = setInterval(cycleStack, AUTO_MS);
    }
  }

  function onUserInteraction() {
    scheduleAuto();
  }

  scheduleAuto();
  reduceMotion.addEventListener("change", scheduleAuto);

  let startX = 0;
  let startY = 0;
  let tracking = false;

  stack.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
    stack.setPointerCapture(e.pointerId);
  });

  stack.addEventListener("pointermove", function (e) {
    if (!tracking) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 8 || dy > 8) {
      stack.classList.add("is-dragging");
    }
  });

  function releaseTracking(e) {
    stack.classList.remove("is-dragging");
    try {
      stack.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* already released */
    }
  }

  stack.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    releaseTracking(e);

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx >= SWIPE_PX && absDx > absDy) {
      if (dx < 0) {
        cycleStack();
      } else {
        cycleStackPrev();
      }
      onUserInteraction();
      return;
    }

    if (absDx <= TAP_PX && absDy <= TAP_PX) {
      cycleStack();
      onUserInteraction();
    }
  });

  stack.addEventListener("pointercancel", function (e) {
    if (!tracking) return;
    tracking = false;
    releaseTracking(e);
  });

  stack.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      cycleStack();
      onUserInteraction();
    }
  });
})();
