(() => {
  const PLANS = {
    "1-step": {
      target: "10%",
      daily: "5%",
      overall: "10%",
      days: "5",
      split: "80%",
      prices: {
        5000: 59,
        10000: 99,
        25000: 249,
        50000: 399,
        100000: 699,
        200000: 1199,
      },
    },
    "2-step": {
      target: "8% / 5%",
      daily: "5%",
      overall: "10%",
      days: "5",
      split: "80%",
      prices: {
        5000: 49,
        10000: 79,
        25000: 199,
        50000: 329,
        100000: 549,
        200000: 949,
      },
    },
  };

  const sizeLabel = (n) => {
    const map = {
      5000: "$5,000",
      10000: "$10,000",
      25000: "$25,000",
      50000: "$50,000",
      100000: "$100,000",
      200000: "$200,000",
    };
    return map[n] || `$${n}`;
  };

  /* Year */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Load curtain — plays on every hard refresh */
  const curtain = document.getElementById("loadCurtain");
  const body = document.body;
  body.classList.add("is-loading");

  function revealHero() {
    document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("is-in"));
  }

  window.setTimeout(() => {
    if (!curtain) {
      body.classList.remove("is-loading");
      revealHero();
      return;
    }
    curtain.classList.add("is-done");
    window.setTimeout(() => {
      body.classList.remove("is-loading");
      curtain.remove();
      revealHero();
    }, 1000);
  }, 700);

  /* Mobile nav */
  const toggle = document.getElementById("navToggle");
  const drawer = document.getElementById("navDrawer");
  if (toggle && drawer) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      drawer.classList.toggle("is-open", !open);
    });
    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        drawer.classList.remove("is-open");
      });
    });
  }

  /* Challenges planner */
  let type = "1-step";
  let size = 25000;

  const planner = document.getElementById("planner");
  const typeBtns = document.querySelectorAll(".seg-btn");
  const sizeBtns = document.querySelectorAll(".chip");
  const summaryType = document.getElementById("summaryType");
  const summaryPrice = document.getElementById("summaryPrice");
  const ruleTarget = document.getElementById("ruleTarget");
  const ruleDaily = document.getElementById("ruleDaily");
  const ruleOverall = document.getElementById("ruleOverall");
  const ruleDays = document.getElementById("ruleDays");
  const ruleSplit = document.getElementById("ruleSplit");
  const metricTarget = document.getElementById("metricTarget");
  const metricDaily = document.getElementById("metricDaily");
  const metricOverall = document.getElementById("metricOverall");
  const metricDays = document.getElementById("metricDays");

  const typeLabel = (t) => (t === "1-step" ? "1-Step" : "2-Step");

  function pulse() {
    if (!planner) return;
    planner.classList.remove("is-pulse");
    void planner.offsetWidth;
    planner.classList.add("is-pulse");
    window.setTimeout(() => planner.classList.remove("is-pulse"), 450);
  }

  function render() {
    const plan = PLANS[type];
    const price = plan.prices[size];
    summaryType.textContent = `${typeLabel(type)} · ${sizeLabel(size)}`;
    summaryPrice.textContent = String(price);
    ruleTarget.textContent = plan.target;
    ruleDaily.textContent = plan.daily;
    ruleOverall.textContent = plan.overall;
    ruleDays.textContent = plan.days;
    ruleSplit.textContent = plan.split;
    if (metricTarget) metricTarget.textContent = plan.target;
    if (metricDaily) metricDaily.textContent = plan.daily;
    if (metricOverall) metricOverall.textContent = plan.overall;
    if (metricDays) metricDays.textContent = plan.days;
    pulse();
  }

  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      type = btn.dataset.type;
      typeBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", String(on));
      });
      render();
    });
  });

  sizeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      size = Number(btn.dataset.size);
      sizeBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      render();
    });
  });

  render();

  /* Smooth in-page anchors (no jump under sticky nav) */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const headerOffset = () => {
    const header = document.querySelector(".site-header");
    return (header ? header.offsetHeight : 72) + 12;
  };

  function smoothScrollTo(target) {
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target);
      history.pushState(null, "", id);
    });
  });

  if (location.hash) {
    const hashTarget = document.querySelector(location.hash);
    if (hashTarget) {
      window.setTimeout(() => smoothScrollTo(hashTarget), 80);
    }
  }

  /* Scroll reveal animations */
  const animNodes = document.querySelectorAll(
    ".fade-up, .fade-left, .fade-right, .scale-in, .section-head, .challenges-head, .faq-intro-copy, .stat, .platform, .story, .proof-item"
  );
  animNodes.forEach((el) => {
    if (!el.classList.contains("fade-up") &&
        !el.classList.contains("fade-left") &&
        !el.classList.contains("fade-right") &&
        !el.classList.contains("scale-in") &&
        !el.classList.contains("reveal")) {
      el.classList.add("fade-up");
    }
  });

  if (!reduceMotion && "IntersectionObserver" in window && animNodes.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    animNodes.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 0.05}s`;
      io.observe(el);
    });
  } else {
    animNodes.forEach((el) => el.classList.add("is-in"));
  }

  /* Navbar scroll state */
  const header = document.querySelector(".site-header");
  let ticking = false;
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    ticking = false;
  };
  onScrollHeader();
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScrollHeader);
    },
    { passive: true }
  );
})();
