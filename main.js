(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Mobile nav ---------- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = open ? '<i class="ph ph-x"></i>' : '<i class="ph ph-list"></i>';
  });
  nav.querySelectorAll(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<i class="ph ph-list"></i>';
    })
  );

  /* ---------- Scroll reveal with stagger ---------- */
  const groups = new Map();
  document.querySelectorAll(".reveal").forEach((el) => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.setProperty("--d", `${Math.min(i, 6) * 60}ms`);
  });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Count-up numbers ---------- */
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, end = +el.dataset.count;
    const start = end > 1900 && end < 2100 ? 1980 : 0;
    if (reduce) return;
    const t0 = performance.now(), dur = 1400;
    const fmt = (n) => (end > 2100 ? n.toLocaleString("en-ZA").replace(/\s/g, ",") : String(n));
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Airbrush spray canvas (hero) ---------- */
  const canvas = document.querySelector(".hero__spray");
  const hero = document.querySelector(".hero");
  if (canvas && !reduce) {
    const ctx = canvas.getContext("2d");
    const colors = ["#ff3dac", "#ffb13d", "#c8ff3d", "#3de8ff", "#9b5cff"];
    let w, h, dpr, hue = 0, running = false, lastSpray = 0, visible = true;
    let pointer = null, prev = null;

    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    addEventListener("resize", size);

    const spray = (x, y, color, strength = 1) => {
      const n = 26 * strength;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 1.8) * 46 * strength; // dense core, soft falloff like a real airbrush
        const s = Math.random() * 1.8 + 0.4;
        ctx.globalAlpha = 0.18 + Math.random() * 0.35;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (t) => {
      if (!visible) { running = false; return; }
      // Slow fade so strokes linger like wet paint, then drift away
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.035)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (pointer) {
        const color = colors[Math.floor(hue) % colors.length];
        if (prev) {
          const dx = pointer.x - prev.x, dy = pointer.y - prev.y;
          const steps = Math.min(Math.ceil(Math.hypot(dx, dy) / 8), 12);
          for (let i = 1; i <= steps; i++) spray(prev.x + (dx * i) / steps, prev.y + (dy * i) / steps, color, 0.7);
        } else spray(pointer.x, pointer.y, color);
        prev = { ...pointer };
        hue += 0.03;
        lastSpray = t;
      }
      ctx.globalCompositeOperation = "source-over";
      if (t - lastSpray < 6000 || pointer) requestAnimationFrame(frame);
      else running = false;
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      kick();
    });
    hero.addEventListener("pointerleave", () => { pointer = null; prev = null; });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(hero);

    // Intro stroke: an automatic swoosh so the effect is visible on touch devices too
    const intro = () => {
      const t0 = performance.now(), dur = 1800;
      const path = (p) => ({
        x: w * (0.52 + 0.42 * p),
        y: h * (0.78 - 0.5 * p + Math.sin(p * Math.PI * 2) * 0.08),
      });
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const pt = path(p);
        spray(pt.x, pt.y, colors[Math.floor(p * colors.length) % colors.length], 1.1);
        lastSpray = t;
        kick();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    setTimeout(intro, 500);
  }

  /* ---------- Hero 3D stack follows the pointer ---------- */
  const stack = document.querySelector(".stack");
  if (stack && finePointer && !reduce) {
    let tx = -16, ty = 8, cx = tx, cy = ty, raf = 0;
    const loop = () => {
      cx = lerp(cx, tx, 0.08); cy = lerp(cy, ty, 0.08);
      stack.style.setProperty("--ry", `${cx.toFixed(2)}deg`);
      stack.style.setProperty("--rx", `${cy.toFixed(2)}deg`);
      raf = Math.abs(cx - tx) + Math.abs(cy - ty) > 0.02 ? requestAnimationFrame(loop) : 0;
    };
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      tx = -16 + nx * 26; ty = 8 - ny * 18;
      if (!raf) raf = requestAnimationFrame(loop);
    });
  }

  /* ---------- Tilt cards with glare ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".tilt").forEach((card) => {
      const max = card.classList.contains("tile--hero") || card.classList.contains("how__frame") ? 5 : 8;
      card.addEventListener("pointerenter", () => { card.classList.add("is-tilting"); card.style.transition = "transform 120ms ease-out"; });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
        card.style.setProperty("--gx", `${px * 100}%`);
        card.style.setProperty("--gy", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("is-tilting");
        card.style.transition = "";
        card.style.transform = "";
      });
    });

    /* Magnetic primary CTA */
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- 3D ring gallery ---------- */
  const ring = document.querySelector(".ring");
  const spin = document.querySelector(".ring__spin");
  if (ring && spin) {
    const items = [...spin.children];
    const step = 360 / items.length;
    const place = () => {
      // Radius that leaves a small gap between neighbouring cards on the circle
      const rad = Math.round((spin.offsetWidth * 1.12) / (2 * Math.sin(Math.PI / items.length)));
      items.forEach((fig, i) => { fig.style.transform = `rotateY(${i * step}deg) translateZ(${rad}px)`; });
      spin.dataset.r = rad;
    };
    place();
    addEventListener("resize", place);

    let angle = 0, target = 0, velocity = 0, dragging = false, lastX = 0, inView = false, raf = 0, idle = 0;
    const render = () => {
      spin.style.transform = `translateZ(${-spin.dataset.r}px) rotateY(${angle}deg)`;
    };
    const loop = (t) => {
      if (!dragging) {
        if (Math.abs(velocity) > 0.01) { target += velocity; velocity *= 0.94; }
        else if (!reduce && t - idle > 1500) target -= 0.06; // gentle auto-spin once hands are off
      }
      angle = lerp(angle, target, 0.1);
      render();
      raf = inView ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) start(); }).observe(ring);

    ring.addEventListener("pointerdown", (e) => {
      dragging = true; lastX = e.clientX; velocity = 0;
      ring.classList.add("is-dragging");
      ring.setPointerCapture(e.pointerId);
    });
    ring.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      target += dx * 0.25; velocity = dx * 0.25;
    });
    const end = () => { dragging = false; idle = performance.now(); ring.classList.remove("is-dragging"); };
    ring.addEventListener("pointerup", end);
    ring.addEventListener("pointercancel", end);

    document.querySelectorAll("[data-ring]").forEach((b) =>
      b.addEventListener("click", () => {
        velocity = 0; idle = performance.now();
        const snapped = Math.round(target / step) * step;
        target = snapped + (b.dataset.ring === "next" ? -step : step);
        start();
      })
    );
    render();
  }

  /* ---------- Footer year ---------- */
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
