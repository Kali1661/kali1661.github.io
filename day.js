/* Small helpers shared by the daily pages. */
window.Day = (function () {
  "use strict";
  const love = window.LOVE;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-name]").forEach((el) => { el.textContent = love.name; });

  // Keeps a canvas as sharp and as big as its box.
  function fit(canvas, onSize) {
    const view = { canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, ratio: 1 };
    function size() {
      const box = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(box.width));
      const h = Math.max(1, Math.round(box.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (w === view.w && h === view.h && ratio === view.ratio) return;
      view.w = w; view.h = h; view.ratio = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      view.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (onSize) onSize(view);
    }
    size();
    new ResizeObserver(size).observe(canvas);
    return view;
  }

  // step(dt, time). With reduced motion, time stands still so nothing sways by itself.
  function loop(step) {
    let last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000 || 0.016);
      last = now;
      step(dt, still ? 0 : now / 1000);
    }
    requestAnimationFrame(frame);
  }

  let at = -1;
  function nextPhrase() {
    at = (at + 1) % love.phrases.length;
    return love.phrases[at];
  }

  function spot(event, el) {
    const box = el.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  // Canvas heart, about as wide as size, centered on x, y.
  const heartPath = new Path2D("M0 9.2C-6.4 4.4-10.2.7-10.2-3.6-10.2-6.9-7.7-9.2-4.7-9.2-2.8-9.2-1.1-8.2 0-6.6 1.1-8.2 2.8-9.2 4.7-9.2 7.7-9.2 10.2-6.9 10.2-3.6 10.2.7 6.4 4.4 0 9.2Z");
  function heart(ctx, x, y, size, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt || 0);
    ctx.scale(size / 20.4, size / 20.4);
    ctx.fill(heartPath);
    ctx.restore();
  }

  /* ---------- background color ---------- */

  const parts = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  function mix(a, b, k) {
    const p = parts(a);
    const q = parts(b);
    return "#" + p.map((v, i) => Math.round(v + (q[i] - v) * k).toString(16).padStart(2, "0")).join("");
  }
  function light(hex) {
    const [r, g, b] = parts(hex).map((v) => { const c = v / 255; return c <= 0.04 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  // Night scenes stay night, whatever color is picked.
  function deepen(hex, most) {
    let out = hex;
    for (let i = 0; i < 12 && light(out) > most; i += 1) out = mix(out, "#000000", 0.14);
    return out;
  }

  // A small round button in the page's own button row; tapping it offers colors.
  // list: hex colors, the first is the page's own. apply(hex): repaint the page.
  function colors(options) {
    const key = "bg" + location.pathname.replace(/index\.html$/, "");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-button";
    button.setAttribute("aria-label", "Background color");
    button.setAttribute("aria-expanded", "false");
    button.hidden = !!options.later;
    options.row.appendChild(button);

    const tray = document.createElement("div");
    tray.className = "tray";
    tray.hidden = true;
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "Background color");
    document.body.appendChild(tray);

    let current = options.list[0];
    const dots = options.list.map((hex, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.setProperty("--dot", hex);
      b.setAttribute("aria-label", i ? "Color " + (i + 1) : "First color");
      b.addEventListener("click", () => use(hex, true));
      tray.appendChild(b);
      return [b, hex];
    });
    const own = document.createElement("label");
    own.innerHTML = '<input type="color" id="own-color" aria-label="Pick your own color">';
    const input = own.firstChild;
    input.addEventListener("input", () => use(input.value, true));
    tray.appendChild(own);

    function use(hex, keep) {
      current = hex;
      document.documentElement.style.setProperty("--bg", hex);
      if (options.ink) document.documentElement.style.setProperty("--ink", light(hex) > 0.22 ? options.ink[0] : options.ink[1]);
      const meta = document.querySelector("meta[name=theme-color]");
      if (meta) meta.content = hex;
      dots.forEach(([b, h]) => b.setAttribute("aria-pressed", String(h === hex)));
      input.value = hex;
      if (options.apply) options.apply(hex);
      if (keep) try { localStorage.setItem(key, hex); } catch (e) { /* won't be remembered */ }
    }

    function open(yes) {
      tray.hidden = !yes;
      button.setAttribute("aria-expanded", String(yes));
      if (yes) tray.style.bottom = Math.max(8, window.innerHeight - button.getBoundingClientRect().top + 10) + "px";
    }
    button.addEventListener("click", () => open(tray.hidden));
    document.addEventListener("pointerdown", (e) => {
      if (!tray.hidden && !tray.contains(e.target) && e.target !== button) open(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !tray.hidden) { open(false); button.focus(); } });
    window.addEventListener("resize", () => open(false));

    let saved = null;
    try { saved = localStorage.getItem(key); } catch (e) { saved = null; }
    use(/^#[0-9a-f]{6}$/.test(saved || "") ? saved : current, false);

    return {
      show() {
        if (!button.hidden) return;
        button.hidden = false;
        if (!still) button.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "cubic-bezier(.3,1.6,.5,1)" });
      },
      hide() { button.hidden = true; open(false); }
    };
  }

  return {
    love, still, fit, loop, nextPhrase, spot, heart, mix, light, deepen, colors,
    $: (id) => document.getElementById(id),
    hand: '"Playwrite SK", "Marck Script", "Segoe Script", cursive',
    say(phrase) {
      const live = document.getElementById("live");
      if (live) { live.lang = phrase.lang || "en"; live.textContent = phrase.text; }
    }
  };
})();
