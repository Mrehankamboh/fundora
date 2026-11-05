/* Shared Fundora cobe globe — used on landing + auth */
(function () {
  const wraps = document.querySelectorAll(".fundora-globe");
  if (!wraps.length) return;

  import("https://esm.sh/cobe@0.6.3")
    .then((mod) => {
      const createGlobe = mod.default;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      wraps.forEach((globeWrap) => {
        const canvas = globeWrap.querySelector("canvas");
        if (!canvas) return;

        const fallback = Number(globeWrap.dataset.size) || 560;
        const minSize = Number(globeWrap.dataset.min) || 280;
        let size = 0;
        let phi = 0;
        let pointer = null;
        let dragOffset = 0;
        let globe = null;
        let resizeTimer = 0;

        const measure = () => {
          const box = globeWrap.getBoundingClientRect();
          return Math.max(minSize, Math.floor(box.width || globeWrap.offsetWidth || fallback));
        };

        const start = () => {
          size = measure();
          canvas.style.width = `${size}px`;
          canvas.style.height = `${size}px`;

          if (globe) {
            globe.destroy();
            globe = null;
          }

          globe = createGlobe(canvas, {
            devicePixelRatio: 2,
            width: size * 2,
            height: size * 2,
            phi: 0.4,
            theta: 0.18,
            dark: 1,
            diffuse: 1.35,
            mapSamples: 18000,
            mapBrightness: 5.4,
            baseColor: [0.49, 0.71, 1],
            markerColor: [0.95, 0.97, 1],
            glowColor: [0.15, 0.4, 0.95],
            markers: [
              { location: [40.71, -74.01], size: 0.05 },
              { location: [51.51, -0.13], size: 0.045 },
              { location: [25.2, 55.27], size: 0.045 },
              { location: [35.68, 139.69], size: 0.045 },
              { location: [1.35, 103.82], size: 0.04 },
            ],
            onRender: (state) => {
              if (!pointer && !reduceMotion) phi += 0.0028;
              state.phi = phi + dragOffset;
              state.width = size * 2;
              state.height = size * 2;
            },
          });

          requestAnimationFrame(() => canvas.classList.add("is-ready"));
        };

        const scheduleRestart = () => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            const next = measure();
            if (Math.abs(next - size) < 8) {
              size = next;
              return;
            }
            start();
          }, 120);
        };

        canvas.addEventListener("pointerdown", (e) => {
          pointer = { x: e.clientX, base: dragOffset };
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = "grabbing";
          globeWrap.classList.add("has-dragged");
        });
        canvas.addEventListener("pointerup", (e) => {
          pointer = null;
          canvas.style.cursor = "grab";
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch (_) {}
        });
        canvas.addEventListener("pointerout", () => {
          pointer = null;
          canvas.style.cursor = "grab";
        });
        canvas.addEventListener("pointermove", (e) => {
          if (!pointer) return;
          dragOffset = pointer.base + (e.clientX - pointer.x) / 200;
        });

        const io = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            if (!entry.isIntersecting) {
              if (globe) globe.toggle(false);
              return;
            }
            if (globe) globe.toggle(true);
            else start();
          },
          { rootMargin: "200px 0px" }
        );
        io.observe(globeWrap);
        window.addEventListener("resize", scheduleRestart);
      });
    })
    .catch(() => {
      wraps.forEach((wrap) => {
        const canvas = wrap.querySelector("canvas");
        if (canvas) canvas.style.display = "none";
      });
    });
})();
