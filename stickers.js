(function () {
  var container = document.querySelector('.cover-section');
  var guitar = document.querySelector('.sticker--guitar');
  var lamp = document.querySelector('.sticker--lamp');
  var mug = document.querySelector('.sticker--mug');
  var bag = document.querySelector('.sticker--bag');
  var stickers = [guitar, lamp, mug, bag].filter(Boolean);
  if (!container || !stickers.length) return;

  var active = null;
  var startX = 0, startY = 0;
  var startLeft = 0, startTop = 0;

  function getContainerRect() {
    return container.getBoundingClientRect();
  }

  /** Keep a sticker fully inside the container; use after drag and on resize */
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
    sticker.style.left = clampedLeft + 'px';
    sticker.style.top = clampedTop + 'px';
  }

  function getClientXY(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.type === 'mousedown') return;
    active = e.currentTarget;
    var rect = getContainerRect();
    var r = active.getBoundingClientRect();
    startLeft = (r.left + r.width / 2) - rect.left;
    startTop = (r.top + r.height / 2) - rect.top;
    var xy = getClientXY(e);
    startX = xy.x;
    startY = xy.y;
    active.style.left = startLeft + 'px';
    active.style.top = startTop + 'px';
    active.style.transform = 'translate(-50%, -50%)';
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
    var newLeft = startLeft + dx;
    var newTop = startTop + dy;
    /* Clamp so the whole sticker stays inside the container (center is at left/top) */
    active.style.left = Math.max(w / 2, Math.min(rect.width - w / 2, newLeft)) + 'px';
    active.style.top = Math.max(h / 2, Math.min(rect.height - h / 2, newTop)) + 'px';
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
    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });
  });

  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);
  document.addEventListener('mouseleave', onPointerUp);
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('touchend', onPointerUp);
  document.addEventListener('touchcancel', onPointerUp);

  window.addEventListener('resize', onResize);
})();
