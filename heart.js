(function () {
  "use strict";

  const love = window.LOVE;
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const canvas = $("sky");
  const ctx = canvas.getContext("2d");
  const stage = $("stage");
  const heartButton = $("heart");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COUNT = 2100;
  const STORE = "our-heart";
  const RAINBOW_TINT = "#ff6fae";

  if (love.name) $("name").textContent = love.name;

  // The line inside the heart takes turns through the phrases.
  const message = $("message");
  let messageIndex = 0;
  function showMessage(i) {
    messageIndex = i % love.phrases.length;
    message.lang = love.phrases[messageIndex].lang;
    message.textContent = love.phrases[messageIndex].text;
  }
  showMessage(0);
  if (!still && love.phrases.length > 1) {
    setInterval(() => {
      message.classList.add("is-changing");
      setTimeout(() => {
        showMessage(messageIndex + 1);
        message.classList.remove("is-changing");
      }, 520);
    }, 4000);
  }

  /* ---------- colors ---------- */

  const toInt = (hex) => parseInt(hex.slice(1), 16);
  const toHex = (n) => "#" + n.toString(16).padStart(6, "0");
  const split = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

  function hueColor(deg) {
    const f = (n) => {
      const k = (n + deg / 30) % 12;
      return Math.round(255 * (0.64 - 0.36 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  /* ---------- the heart's particles, in heart space (-1 to 1) ---------- */

  // Seeded, so a painted heart looks the same when the page is opened again.
  let seed = 20251;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function curve(t) {
    return [
      Math.pow(Math.sin(t), 3),
      -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) / 16
    ];
  }

  // Walk the outline at an even pace so the tip and the dip aren't overcrowded.
  const outline = [];
  (function () {
    let last = curve(0);
    let total = 0;
    for (let i = 0; i <= 900; i += 1) {
      const p = curve((i / 900) * Math.PI * 2);
      total += Math.hypot(p[0] - last[0], p[1] - last[1]);
      outline.push([p[0], p[1], total]);
      last = p;
    }
  })();
  function outlineAt(u) {
    const d = u * outline[outline.length - 1][2];
    let lo = 0;
    let hi = outline.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (outline[mid][2] < d) lo = mid + 1; else hi = mid;
    }
    return outline[lo];
  }

  const particles = Array.from({ length: COUNT }, () => {
    const o = outlineAt(rand());
    const depth = rand() < 0.07 ? 1 + rand() * 0.09 : 1 - Math.pow(rand(), 2.7) * 0.36;
    const gem = rand() < 0.055;
    const hx = o[0] * depth + (rand() - 0.5) * 0.02;
    const hy = o[1] * depth + (rand() - 0.5) * 0.02;
    return {
      hx, hy, x: 0, y: 0, vx: 0, vy: 0, gem,
      tilt: (rand() - 0.5) * 1.1,
      r: gem ? 3.2 + rand() * 3.6 : 0.6 + Math.pow(rand(), 2) * 1.7,
      shade: rand() * 0.85 - 0.35,
      alpha: 0.45 + rand() * 0.5,
      phase: rand() * 6.283,
      hue: ((Math.atan2(hy, hx) / 6.283) * 360 + 450) % 360,
      base: 0, wave: 0,
      r0: 0, g0: 0, b0: 0, // shown now
      r1: 0, g1: 0, b1: 0  // fading toward
    };
  });

  function tint(p, color, instant) {
    p.base = color;
    const c = split(color);
    const s = p.shade;
    const mix = (v) => (s > 0 ? v + (255 - v) * s * 0.75 : v * (1 + s));
    p.r1 = mix(c[0]); p.g1 = mix(c[1]); p.b1 = mix(c[2]);
    if (instant) { p.r0 = p.r1; p.g0 = p.g1; p.b0 = p.b1; }
  }

  /* ---------- state ---------- */

  let width = 0, height = 0, cx = 0, cy = 0, unit = 1;
  let current = love.colors[0].hex; // a hex value or "rainbow"
  let mode = "fill";
  let waves = [];
  let waveId = 0;
  let bursts = [];
  let kick = 0;
  const pointer = { x: -9999, y: -9999, on: false };

  const colorFor = (p, color) => (color === "rainbow" ? hueColor(p.hue) : toInt(color));

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({
          current,
          paint: particles.map((p) => toHex(p.base).slice(1)).join("")
        }));
      } catch (e) { /* private window: it just won't be remembered */ }
    }, 2200); // after a color has finished spreading
  }

  function restore() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE)); } catch (e) { saved = null; }
    if (saved && /^(rainbow|#[0-9a-f]{6})$/.test(saved.current)) current = saved.current;
    const paint = saved && typeof saved.paint === "string" && saved.paint.length === COUNT * 6 && /^[0-9a-f]+$/.test(saved.paint)
      ? saved.paint : null;
    particles.forEach((p, i) => tint(p, paint ? parseInt(paint.slice(i * 6, i * 6 + 6), 16) : colorFor(p, current), true));
  }

  /* ---------- controls ---------- */

  const swatches = [];
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#heart-shape"/></svg>';

  function addSwatch(value, name) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.innerHTML = heartSvg;
    b.setAttribute("aria-label", name);
    b.title = name;
    b.style.setProperty("--c", value === "rainbow" ? RAINBOW_TINT : value);
    b.addEventListener("click", () => choose(value, b));
    $("swatches").appendChild(b);
    swatches.push({ el: b, value });
    return b;
  }

  love.colors.forEach((c) => addSwatch(c.hex, c.name));
  addSwatch("rainbow", "Rainbow").firstElementChild.style.fill = "url(#rainbow)";

  const custom = document.createElement("label");
  custom.className = "swatch swatch-custom";
  custom.title = "Any color you like";
  custom.innerHTML = heartSvg + '<input type="color" id="custom-color" aria-label="Pick your own color" value="#ff9ad5">';
  $("swatches").appendChild(custom);
  const picker = custom.querySelector("input");
  // Clicking it also re-uses the color already chosen there.
  picker.addEventListener("click", () => choose(picker.value, custom));
  picker.addEventListener("input", () => choose(picker.value, custom));

  function markSwatch() {
    let found = false;
    swatches.forEach((s) => {
      const on = s.value === current;
      found = found || on;
      s.el.classList.toggle("is-on", on);
      s.el.setAttribute("aria-pressed", String(on));
    });
    custom.classList.toggle("is-on", !found);
    if (!found) picker.value = current;
    custom.style.setProperty("--c", picker.value);
    root.style.setProperty("--heart", current === "rainbow" ? RAINBOW_TINT : current);
  }

  function choose(value, el) {
    current = value;
    markSwatch();
    if (mode === "fill") {
      const r = el.getBoundingClientRect();
      fillFrom((r.left + r.width / 2 - cx) / unit, (r.top - cy) / unit);
    }
    save();
  }

  // Color spreads through the heart from a point.
  function fillFrom(x, y) {
    waveId += 1;
    if (still) {
      particles.forEach((p) => { p.wave = waveId; tint(p, colorFor(p, current), true); });
      draw(0);
      return;
    }
    waves.push({ id: waveId, x, y, r: Math.max(0, Math.hypot(x, y) - 1.15), color: current });
    // Dragging inside the color picker fires many of these; let the oldest finish at once.
    if (waves.length > 6) {
      const w = waves.shift();
      particles.forEach((p) => {
        if (w.id > p.wave) { p.wave = w.id; tint(p, colorFor(p, w.color), false); }
      });
    }
  }

  const hints = {
    fill: "Tap the heart, then give it a new color.",
    paint: "Pick a color and draw on the heart."
  };
  const modeButtons = document.querySelectorAll("[data-mode]");
  modeButtons.forEach((b) => {
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      modeButtons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      document.body.classList.toggle("is-painting", mode === "paint");
      $("hint").textContent = hints[mode];
    });
  });

  /* ---------- touch ---------- */

  let painting = false;
  let brushHue = 0;
  let lastBrush = null;

  function brush(x, y) {
    const reach = Math.max(24, unit * 0.13);
    brushHue = (brushHue + 5) % 360;
    const color = current === "rainbow" ? hueColor(brushHue) : toInt(current);
    for (const p of particles) {
      const dx = cx + p.hx * unit - x;
      const dy = cy + p.hy * unit - y;
      if (dx * dx + dy * dy < reach * reach) {
        p.wave = waveId;
        tint(p, color, still);
      }
    }
  }

  function brushLine(x, y) {
    const from = lastBrush || { x, y };
    const steps = Math.min(40, Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 14)));
    for (let i = 1; i <= steps; i += 1) {
      brush(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps);
    }
    lastBrush = { x, y };
    if (still) draw(0);
  }

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    if (painting) brushLine(e.clientX, e.clientY);
  }, { passive: true });
  heartButton.addEventListener("pointerdown", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    if (mode !== "paint") return;
    painting = true;
    lastBrush = null;
    brushLine(e.clientX, e.clientY);
  });
  function release(e) {
    if (painting) save();
    painting = false;
    if (e.pointerType !== "mouse") pointer.on = false;
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  root.addEventListener("pointerleave", () => { pointer.on = false; });

  let phraseIndex = 0;
  heartButton.addEventListener("click", (e) => {
    const keyboard = e.detail === 0;
    if (mode === "paint" && !keyboard) return; // a brush stroke, not a tap
    const x = keyboard ? cx : e.clientX;
    const y = keyboard ? cy : e.clientY;
    sayIt(x, y);
    if (still) return;
    kick = 1;
    for (const p of particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 1 - d / (unit * 1.3)) * unit * 3.4;
      p.vx += (dx / d) * push;
      p.vy += (dy / d) * push;
    }
    for (let i = 0; i < 26; i += 1) {
      const a = Math.random() * 6.283;
      const v = 90 + Math.random() * 270;
      bursts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 130,
        size: 5 + Math.random() * 11, spin: (Math.random() - 0.5) * 5, tilt: 0,
        life: 1, fade: 0.55 + Math.random() * 0.4,
        color: toHex(particles[(Math.random() * COUNT) | 0].base)
      });
    }
    if (bursts.length > 240) bursts = bursts.slice(-240);
  });

  function sayIt(x, y) {
    const list = love.phrases;
    const phrase = list[phraseIndex % list.length];
    phraseIndex += 1;
    const el = document.createElement("span");
    el.className = "phrase";
    el.lang = phrase.lang;
    el.textContent = phrase.text;
    $("phrases").appendChild(el);
    const half = el.offsetWidth / 2 + 14;
    el.style.left = Math.min(width - half, Math.max(half, x)) + "px";
    el.style.top = y + "px";
    setTimeout(() => el.remove(), 2700);
    const live = $("live");
    live.lang = phrase.lang;
    live.textContent = phrase.text;
  }

  /* ---------- drawing ---------- */

  const gemPath = new Path2D("M0 9.2C-6.4 4.4-10.2.7-10.2-3.6-10.2-6.9-7.7-9.2-4.7-9.2-2.8-9.2-1.1-8.2 0-6.6 1.1-8.2 2.8-9.2 4.7-9.2 7.7-9.2 10.2-6.9 10.2-3.6 10.2.7 6.4 4.4 0 9.2Z");
  const bloom = document.createElement("canvas");
  const bloomCtx = bloom.getContext("2d");
  let ratio = 1;

  // Small hearts drifting up behind everything.
  const drifters = Array.from({ length: 22 }, () => ({
    x: Math.random(), y: Math.random(), size: 5 + Math.random() * 12,
    speed: 0.016 + Math.random() * 0.03, sway: Math.random() * 6.283, alpha: 0.1 + Math.random() * 0.22
  }));

  function smallHeart(x, y, size, tilt) {
    const s = (size / 20) * ratio;
    const c = Math.cos(tilt) * s;
    const n = Math.sin(tilt) * s;
    ctx.setTransform(c, n, -n, c, x * ratio, y * ratio);
    ctx.fill(gemPath);
  }

  function place() {
    const r = stage.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    unit = (heartButton.offsetWidth / 2) * 0.94;
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    bloom.width = Math.max(1, Math.round(width / 7));
    bloom.height = Math.max(1, Math.round(height / 7));
    // Shrink first, so the old heart size doesn't hold the stage open.
    root.style.setProperty("--size", "240px");
    const size = Math.round(Math.max(240, Math.min(stage.clientWidth * 0.96, stage.clientHeight * 0.98, 660)));
    root.style.setProperty("--size", size + "px");
    place();
    particles.forEach((p) => {
      p.x = cx + p.hx * unit; p.y = cy + p.hy * unit;
      p.vx = 0; p.vy = 0;
    });
    if (still) draw(0);
  }

  const thump = (t) => Math.exp(-Math.pow((t - 0.09) / 0.055, 2));
  function beat(time) {
    const t = time % 1.25;
    return thump(t) + 0.62 * thump(t - 0.23);
  }

  function step(dt, time) {
    waves.forEach((w) => { w.r += dt * 2.1; });
    kick *= Math.exp(-dt * 4);

    const size = unit * (1 + 0.032 * beat(time) + 0.05 * kick);
    const reach = unit * 0.3;
    const damp = Math.exp(-dt * 7);
    const fade = 1 - Math.exp(-dt * 5);
    for (const p of particles) {
      for (const w of waves) {
        if (w.id > p.wave && Math.hypot(p.hx - w.x, p.hy - w.y) < w.r) {
          p.wave = w.id;
          tint(p, colorFor(p, w.color), false);
        }
      }
      p.r0 += (p.r1 - p.r0) * fade;
      p.g0 += (p.g1 - p.g0) * fade;
      p.b0 += (p.b1 - p.b0) * fade;

      const hx = cx + p.hx * size + Math.sin(time * 0.9 + p.phase) * 1.6;
      const hy = cy + p.hy * size + Math.cos(time * 0.8 + p.phase) * 1.6;
      p.vx += (hx - p.x) * 70 * dt;
      p.vy += (hy - p.y) * 70 * dt;
      if (pointer.on && !painting) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < reach && d > 0.1) {
          const f = Math.pow(1 - d / reach, 2) * unit * 22 * dt;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.vx *= damp; p.vy *= damp;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    // Keep a wave until it has crossed the whole heart, wherever it started.
    waves = waves.filter((w) => w.r < Math.hypot(w.x, w.y) + 1.5);

    for (const b of bursts) {
      b.vy += 210 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.tilt += b.spin * dt;
      b.life -= b.fade * dt;
    }
    bursts = bursts.filter((b) => b.life > 0);
    for (const d of drifters) {
      d.y -= d.speed * dt;
      if (d.y < -0.05) { d.y = 1.05; d.x = Math.random(); }
    }
  }

  function draw(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    let style = "";
    for (const p of particles) {
      const next = "rgb(" + (p.r0 | 0) + "," + (p.g0 | 0) + "," + (p.b0 | 0) + ")";
      if (next !== style) { ctx.fillStyle = next; style = next; }
      ctx.globalAlpha = p.alpha * (still ? 1 : 0.8 + 0.2 * Math.sin(time * 1.7 + p.phase * 3));
      if (p.gem) {
        smallHeart(p.x, p.y, p.r * (unit / 170) + 3, p.tilt);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.7 + unit / 700), 0, 6.283);
        ctx.fill();
      }
    }

    // Glow: shrink the picture and lay it back over itself.
    bloomCtx.clearRect(0, 0, bloom.width, bloom.height);
    bloomCtx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.6;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bloom, 0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = current === "rainbow" ? RAINBOW_TINT : current;
    for (const d of drifters) {
      ctx.globalAlpha = d.alpha;
      smallHeart(d.x * width + Math.sin(time * 0.5 + d.sway) * 18, d.y * height, d.size, Math.sin(time * 0.6 + d.sway) * 0.3);
    }
    for (const b of bursts) {
      ctx.globalAlpha = Math.min(1, b.life * 1.6);
      ctx.fillStyle = b.color;
      smallHeart(b.x, b.y, b.size, b.tilt);
    }
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    // A tab opened in the background can start out with no size at all.
    if (window.innerWidth !== width || window.innerHeight !== height) resize();
    const time = now / 1000;
    const dt = Math.min(0.033, time - last || 0.016);
    last = time;
    step(dt, time);
    draw(time);
  }

  restore();
  markSwatch();
  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", place, { passive: true });
  if (!still) requestAnimationFrame(frame);
})();
