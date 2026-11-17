/* Shared Fundora globe — landing and sign-in */
(function () {
  const wraps = document.querySelectorAll(".fundora-globe");
  if (!wraps.length) return;

  const load = async () => {
    const sources = ["/js/vendor/cobe.js", "https://esm.sh/cobe@0.6.3"];
    let last;
    for (const src of sources) {
      try {
        const mod = await import(src);
        const createGlobe = mod.default || mod.createGlobe;
        if (typeof createGlobe === "function") return createGlobe;
      } catch (err) {
        last = err;
      }
    }
    throw last || new Error("globe");
  };

  const fail = (wrap) => wrap.classList.add("is-fallback");

  load()
    .then((createGlobe) => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const narrow = window.matchMedia("(max-width: 900px)").matches;

      wraps.forEach((globeWrap) => {
        const canvas = globeWrap.querySelector("canvas");
        if (!canvas) return;

        const fallback = Number(globeWrap.dataset.size) || 420;
        let size = 0;
        let phi = 0.4;
        let pointer = null;
        let dragOffset = 0;
        let globe = null;
        let resizeTimer = 0;

        const measure = () => {
          const parent = globeWrap.parentElement;
          const parentBox = parent ? parent.getBoundingClientRect().width : 0;
          const own = globeWrap.getBoundingClientRect().width;
          const limit = Math.floor(parentBox || window.innerWidth || fallback);
          const raw = own > 48 ? own : limit;
          return Math.max(160, Math.min(Math.floor(raw), limit, fallback, 640));
        };

        const fit = (next) => {
          size = next;
          globeWrap.style.width = `${next}px`;
          globeWrap.style.height = `${next}px`;
          canvas.style.setProperty("width", `${next}px`, "important");
          canvas.style.setProperty("height", `${next}px`, "important");
        };

        const start = () => {
          const next = measure();
          if (next < 48) return;
          fit(next);
          const dpr = narrow ? 1 : Math.min(window.devicePixelRatio || 1, 2);
          const buffer = Math.max(1, Math.floor(canvas.clientWidth * dpr));
          if (buffer < 48) return;

          try {
            if (globe) {
              globe.destroy();
              globe = null;
            }
            globe = createGlobe(canvas, {
              devicePixelRatio: dpr,
              width: buffer,
              height: buffer,
              phi: 0.4,
              theta: 0.18,
              dark: 1,
              diffuse: 1.35,
              mapSamples: narrow ? 7000 : 16000,
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
                state.width = canvas.width || buffer;
                state.height = canvas.height || buffer;
              },
            });
            if (!canvas.width) throw new Error("blank");
            canvas.classList.add("is-ready");
            globeWrap.classList.remove("is-fallback");
          } catch (_) {
            fail(globeWrap);
          }
        };

        const scheduleRestart = () => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            const next = measure();
            if (!next || Math.abs(next - size) < 12) return;
            start();
          }, 140);
        };

        canvas.addEventListener("pointerdown", (e) => {
          if (!globe) return;
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
        canvas.addEventListener("pointercancel", () => {
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
          { rootMargin: "120px 0px" }
        );
        io.observe(globeWrap);
        window.addEventListener("resize", scheduleRestart);
        window.addEventListener("orientationchange", scheduleRestart);
      });
    })
    .catch(() => {
      wraps.forEach(fail);
    });
})();
