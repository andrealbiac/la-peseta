(function () {
  const stack = document.getElementById("opinions-stack");
  if (!stack) return;

  const tiles = Array.from(stack.querySelectorAll(".opinion-tile"));
  const SWIPE_PX = 48;
  const TAP_PX = 12;
  const AUTO_MS = 4000;

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
