(function () {
  var Matter = window.Matter;
  var stage = document.getElementById("playground-stage");
  if (!stage) return;
  if (!Matter) return;

  var Engine = Matter.Engine;
  var Render = Matter.Render;
  var Runner = Matter.Runner;
  var Bodies = Matter.Bodies;
  var Composite = Matter.Composite;
  var Events = Matter.Events;
  var Body = Matter.Body;

  var SPECS = [
    { src: "./img/S.svg", nw: 201, nh: 335 },
    { src: "./img/T.svg", nw: 120, nh: 333 },
    { src: "./img/P.svg", nw: 189, nh: 333 },
    { src: "./img/L.svg", nw: 119, nh: 333 },
    { src: "./img/E-2.svg", nw: 113, nh: 333 },
    { src: "./img/E-1.svg", nw: 113, nh: 333 },
    { src: "./img/A-2.svg", nw: 357, nh: 334 },
    { src: "./img/A-1.svg", nw: 357, nh: 334 },
    { src: "./img/estudios-bullet.svg", nw: 240, nh: 100 },
  ];

  var WALL_THICK = 50;
  var PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 1.75);

  function loadImage(spec) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var nw = img.naturalWidth || spec.nw;
        var nh = img.naturalHeight || spec.nh;
        // Matter uses `texture.width/height` in drawImage, so force non-zero sizing.
        img.width = nw || spec.nw;
        img.height = nh || spec.nh;
        if (typeof img.decode === "function") {
          img.decode().then(function () {
            resolve(img);
          }).catch(function () {
            resolve(img);
          });
        } else {
          resolve(img);
        }
      };
      img.onerror = function () {
        reject(new Error(spec.src));
      };
      img.src = spec.src;
    });
  }

  function createWalls(w, h) {
    var opts = { isStatic: true, render: { visible: false } };
    var T = WALL_THICK;
    return [
      Bodies.rectangle(w / 2, -T / 2, w + T * 2, T, opts),
      Bodies.rectangle(w / 2, h + T / 2, w + T * 2, T, opts),
      Bodies.rectangle(-T / 2, h / 2, T, h + T * 2, opts),
      Bodies.rectangle(w + T / 2, h / 2, T, h + T * 2, opts),
    ];
  }

  function readStageSize() {
    var playground = stage.closest(".playground");
    var stageRect = stage.getBoundingClientRect();
    var playgroundRect = playground ? playground.getBoundingClientRect() : stageRect;
    var cs = playground ? getComputedStyle(playground) : null;
    var padBottom = cs ? parseFloat(cs.paddingBottom) || 0 : 0;
    // Make the canvas extend from the stage top down to the playground bottom.
    // This accounts for any vertical offset between `.playground` and `#playground-stage`.
    var cw = stage.clientWidth || stageRect.width || playgroundRect.width || 0;
    // Add playground bottom padding so the visual floor sits lower.
    var ch =
      (playgroundRect.bottom - stageRect.top) + padBottom ||
      playgroundRect.height ||
      stageRect.height;

    return {
      w: Math.max(160, Math.floor(cw || playgroundRect.width)),
      h: Math.max(220, Math.floor(ch || playgroundRect.height)),
    };
  }

  function boot() {
    Promise.all(
      SPECS.map(function (s) {
        return loadImage(s)
          .then(function (img) {
            return { spec: s, img: img };
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (loaded) {
      loaded = loaded.filter(Boolean);
      if (!loaded.length) {
        return;
      }

      var size0 = readStageSize();
      var W = size0.w;
      var H = size0.h;
      var WPhysics = W;
      var HPhysics = H;

      // Keep bodies awake so click impulses feel immediate.
      var engine = Engine.create({ enableSleeping: false });
      engine.world.gravity.y = 0.92;

      var render = Render.create({
        element: stage,
        engine: engine,
        options: {
          width: W,
          height: H,
          wireframes: false,
          background: "transparent",
          pixelRatio: PIXEL_RATIO,
          showSleeping: false,
        },
      });

      for (var ti = 0; ti < loaded.length; ti++) {
        // Use the exact `sprite.texture` string as the cache key.
        render.textures[loaded[ti].spec.src] = loaded[ti].img;
      }

      var wallBodies = createWalls(W, H);
      Composite.add(engine.world, wallBodies);

      var letterBodies = [];
      var gutter = 24;
      // All letters share the same visual height,
      // except estudios-bullet which is 40% smaller.
      var isMobile = window.matchMedia("(max-width: 500px)").matches;
      var targetH = isMobile
        ? Math.min(156, Math.max(78, H * 0.24))
        : Math.min(190, Math.max(90, H * 0.28));

      for (var i = 0; i < loaded.length; i++) {
        var item = loaded[i];
        var isBullet = item.spec.src.indexOf("estudios-bullet.svg") !== -1;
        var dimH = targetH * (isBullet ? 0.6 : 1);
        var dimW = item.spec.nw * (dimH / item.spec.nh);
        var texW = item.img.width || item.spec.nw;
        var texH = item.img.height || item.spec.nh;
        var innerW = Math.max(0, W - gutter * 2);
        var maxX = Math.max(0, innerW - dimW);
        var x = gutter + (innerW - maxX) * 0.5 + Math.random() * maxX;
        var y = Math.max(10, H * 0.18 + Math.random() * H * 0.12);

        var body = Bodies.rectangle(x + dimW / 2, y, dimW, dimH, {
          frictionAir: 0.006,
          restitution: 0.14,
          friction: 0.02,
          frictionStatic: 0.015,
          render: {
            sprite: {
              texture: item.spec.src,
              xScale: dimW / texW,
              yScale: dimH / texH,
            },
          },
        });
        letterBodies.push(body);
      }
      Composite.add(engine.world, letterBodies);

      var lastJumpMs = 0;
      var JUMP_COOLDOWN_MS = 260;
      var JUMP_VY = -8; // subtle upward "kick"

      render.canvas.addEventListener("click", function () {
        var now = Date.now();
        if (now - lastJumpMs < JUMP_COOLDOWN_MS) return;
        lastJumpMs = now;

        for (var ji = 0; ji < letterBodies.length; ji++) {
          var b = letterBodies[ji];
          // Ensure a jump even if the body is currently falling.
          Body.setVelocity(b, {
            x: b.velocity.x + (Math.random() - 0.5) * 1.2,
            y: Math.min(b.velocity.y, JUMP_VY),
          });
        }
      });

      // Keep bodies inside the viewport bounds.
      Events.on(engine, "afterUpdate", function () {
        var pad = 8;
        for (var i = 0; i < letterBodies.length; i++) {
          var b = letterBodies[i];
          if (b.position.x < -pad) {
            b.position.x = -pad;
            b.velocity.x = 0;
          } else if (b.position.x > WPhysics + pad) {
            b.position.x = WPhysics + pad;
            b.velocity.x = 0;
          }

          if (b.position.y < -pad) {
            b.position.y = -pad;
            b.velocity.y = 0;
          } else if (b.position.y > HPhysics + pad) {
            b.position.y = HPhysics + pad;
            b.velocity.y = 0;
          }
        }
      });

      var wallBodiesRef = wallBodies;

      function applyBounds(w, h) {
        if (w === render.options.width && h === render.options.height) {
          return;
        }
        Render.setSize(render, w, h);
        WPhysics = w;
        HPhysics = h;

        for (var k = 0; k < wallBodiesRef.length; k++) {
          Composite.remove(engine.world, wallBodiesRef[k]);
        }
        wallBodiesRef = createWalls(w, h);
        Composite.add(engine.world, wallBodiesRef);
      }

      var resizeScheduled = false;
      function scheduleResize() {
        if (resizeScheduled) return;
        resizeScheduled = true;
        requestAnimationFrame(function () {
          resizeScheduled = false;
          var sz = readStageSize();
          applyBounds(sz.w, sz.h);
        });
      }

      var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleResize) : null;
      if (ro) ro.observe(stage);
      window.addEventListener("resize", scheduleResize);

      var runner = Runner.create();
      var running = false;
      var started = false;

      function startLoops() {
        if (running) return;
        running = true;
        Runner.run(runner, engine);
        Render.run(render);
      }

      function stopLoops() {
        if (!running) return;
        running = false;
        Runner.stop(runner);
        Render.stop(render);
      }

      function syncLoops() {
        if (document.hidden) {
          stopLoops();
        } else if (started) {
          startLoops();
        }
      }

      document.addEventListener("visibilitychange", syncLoops);

      scheduleResize();
      requestAnimationFrame(function () {
        scheduleResize();

        // Start the simulation only when the user scrolls to the section.
        var section =
          stage.closest(".block-section.block-3") ||
          stage.closest(".block-section") ||
          stage.closest(".playground");
        function maybeStart() {
          if (started) return;
          started = true;
          startLoops();
        }

        if (typeof IntersectionObserver === "undefined" || !section) {
          maybeStart();
          return;
        }

        // In case IntersectionObserver doesn't trigger quickly (e.g. sticky layouts),
        // check once immediately.
        var rect = section.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          maybeStart();
          return;
        }

        var io = new IntersectionObserver(
          function (entries) {
            var e = entries[0];
            if (!e) return;
            if (e.isIntersecting) {
              maybeStart();
              io.disconnect();
            }
          },
          // Trigger slightly before the section fully settles into view.
          { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0 }
        );
        io.observe(section);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(boot);
    });
  }
})();
