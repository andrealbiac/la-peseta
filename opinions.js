(function () {
  const stack = document.getElementById("opinions-stack");
  if (!stack) return;

  const tiles = Array.from(stack.querySelectorAll(".opinion-tile"));

  function cycleStack() {
    tiles.forEach((tile) => {
      const z = parseInt(getComputedStyle(tile).zIndex, 10) || 1;
      tile.style.zIndex = z === 4 ? 1 : z + 1;
    });
  }

  stack.addEventListener("click", function (e) {
    e.preventDefault();
    cycleStack();
  });

  stack.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      cycleStack();
    }
  });
})();
