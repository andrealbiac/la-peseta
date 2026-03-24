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

  /**
   * Horizontal distance from the top of the viewport: the "reading line".
   * Below the sticky index bar on mobile; proportional on desktop so selection
   * does not jump when two course blocks are partly visible.
   */
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

    // Near document bottom: keep last section active so short final blocks don't stick on previous
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
