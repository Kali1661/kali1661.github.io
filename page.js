/* The butterfly itself was typed out ahead of time by make_frames.py (frames.js);
   this page plays its wingbeat, flies it around and colors it. */
(function () {
  "use strict";
  const { $, love, still } = Day;
  const TAU = Math.PI * 2;
  const MONO = '"Ubuntu Mono", ui-monospace, Menlo, Consolas, monospace';
  const FLY = window.BUTTERFLY;
  const BEAT = FLY.big.frames.length;
  const phrases = love.phrases.map((p) => ({ lang: p.lang, text: p.text.replace("{name}", love.name) }));
  const parts = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  /* ---------- colors: each typed character carries a part (rim, wing, dot, body) and a brightness ---------- */

  function tableOf(wing) {
    const t = new Float32Array(32 * 3);
    [wing.main, wing.edge, wing.spot, wing.body].forEach((hex, part) => {
      const c = parts(hex);
      for (let q = 0; q < 8; q += 1) {
        const v = q / 7;
        const k = 0.55 + 0.45 * v;
        const white = Math.max(0, v - 0.75) * 0.75;
        for (let j = 0; j < 3; j += 1) t[(part * 8 + q) * 3 + j] = c[j] * k + (255 - c[j] * k) * white;
      }
    });
    return t;
  }
  // The rims and veins of the butterfly run through the frames as codes A.. (see make_frames.py):
  // code = part * 8 + brightness, parts are wing 0, rim 1, dots 2, body 3.
  function decode(set) {
    return set.frames.map((f, k) => {
      const out = [];
      const codes = set.codes[k];
      for (let i = 0; i < f.length; i += 1) {
        if (f[i] !== " ") out.push(i % set.cols, (i / set.cols) | 0, f.charCodeAt(i), codes.charCodeAt(i) - 65);
      }
      return Int16Array.from(out);
    });
  }
  const BIG = decode(FLY.big);
  const SMALL = decode(FLY.small);
  const tables = love.wings.map(tableOf);

  let pick = Math.max(0, love.wings.findIndex((wing) => wing.name === love.startWing));
  try { const saved = localStorage.getItem("wing" + location.pathname); if (saved !== null && +saved >= 0 && +saved < tables.length) pick = +saved; } catch (e) { /* starts as startWing */ }
  const shown = Float32Array.from(tables[pick]); // fades toward the picked colors

  /* ---------- the typed grid ---------- */

  let w = 1, h = 1, cols = 1, rows = 1, cw = 5, lh = 9, font = "";
  let depth = new Float32Array(1), cells = [], picture = null;
  let paper = "#000000";
  let bug = null; // the big butterfly, set up once the screen is measured
  const tint = document.createElement("canvas");
  const tintCtx = tint.getContext("2d");
  let view = null;
  view = Day.fit($("screen"), (v) => { w = v.w; h = v.h; measure(); });

  function measure() {
    const c = view ? view.ctx : $("screen").getContext("2d");
    c.font = "700 100px " + MONO;
    const advance = c.measureText("M").width / 100 || 0.5;
    cw = Math.max(4.2, Math.min(7, (w * 0.68) / FLY.big.cols));
    font = "700 " + cw / advance + "px " + MONO;
    lh = cw * 1.8; // the same cell shape the frames were typed for
    cols = Math.ceil(w / cw);
    rows = Math.ceil(h / lh);
    tint.width = cols; tint.height = rows;
    picture = tintCtx.createImageData(cols, rows);
    depth = new Float32Array(cols * rows);
    cells = new Array(cols * rows);
    if (bug) { bug.tx = Math.min(Math.max(bug.tx, left()), right()); bug.ty = Math.min(Math.max(bug.ty, top()), bottom()); }
  }

  function plot(cx, cy, z, ch, r, g, b, a) {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const i = cy * cols + cx;
    if (z <= depth[i]) return;
    depth[i] = z;
    cells[i] = ch;
    const d = picture.data;
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a === undefined ? 255 : a;
  }

  // One butterfly, typed: frame, where its body is (px), table of colors, depth, fade.
  function stamp(set, info, frame, x, y, table, z, alpha) {
    const pts = set[frame];
    const ox = Math.round(x / cw - info.x);
    const oy = Math.round(y / lh - info.y);
    for (let i = 0; i < pts.length; i += 4) {
      const t = pts[i + 3] * 3;
      plot(ox + pts[i], oy + pts[i + 1], z, String.fromCharCode(pts[i + 2]), table[t], table[t + 1], table[t + 2], alpha);
    }
  }

  /* ---------- who is flying ---------- */

  const spriteW = () => FLY.big.cols * cw;
  const spriteH = () => FLY.big.rows * lh;
  const left = () => Math.min(w / 2, spriteW() * 0.42);
  const right = () => Math.max(w / 2, w - spriteW() * 0.42);
  const top = () => Math.min(h * 0.5, h * 0.17 + spriteH() * 0.5); // below the words
  const bottom = () => Math.max(top(), h - spriteH() * 0.42);
  const home = () => ({ x: w / 2, y: Math.min(bottom(), Math.max(top(), h * 0.56)) });

  bug = { x: -w * 0.3, y: h * 1.1, vx: 0, vy: 0, tx: home().x, ty: home().y, phase: 0, flying: true, then: null };
  let smalls = [], sparks = [];
  let clock = 0, line = -1, started = false, hop = 0;


  function flyTo(x, y, then) {
    bug.tx = Math.min(Math.max(x, left()), right());
    bug.ty = Math.min(Math.max(y, top()), bottom());
    bug.flying = true;
    bug.then = then;
    if (still) { bug.x = bug.tx; bug.y = bug.ty; }
  }

  function release(x, y, wing, spread) {
    if (smalls.length > 40) return;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const v = 70 + Math.random() * 70;
    smalls.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, table: tables[wing],
      phase: Math.random() * BEAT, rate: 3 + Math.random() * 1.6, age: 0, life: 4.5 + Math.random() * 2.5, wob: Math.random() * TAU
    });
  }

  // The words are typed out, one letter at a time, like in a terminal.
  const typing = { text: "", n: 0, shown: -1 };
  function say(phrase) {
    $("words").lang = phrase.lang;
    typing.text = phrase.text;
    typing.n = still ? phrase.text.length : 0;
    typing.shown = -1;
    Day.say(phrase);
  }
  function type(dt) {
    typing.n = Math.min(typing.text.length, typing.n + dt * 24);
    const n = typing.n | 0;
    if (n === typing.shown) return;
    typing.shown = n;
    $("words").textContent = "> " + typing.text.slice(0, n);
  }

  function landed() {
    line = (line + 1) % phrases.length;
    say(phrases[line]);
    if (line === phrases.length - 1) {
      love.wings.forEach((_, i) => { release(bug.x, bug.y - 10, i, 2.6); release(bug.x, bug.y - 10, i, 2.6); });
      $("hint").textContent = "Tap again and it starts over.";
    } else {
      const others = love.wings.map((_, i) => i).filter((i) => i !== pick);
      release(bug.x, bug.y - 10, others[(Math.random() * others.length) | 0], 1.4);
      if (started) $("hint").textContent = "Tap anywhere and it flies to you.";
    }
  }

  function begin() {
    started = true;
    $("hint").textContent = "Tap anywhere and it flies to you.";
    const row = $("wings");
    row.hidden = false;
    if (!still) row.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "ease-out" });
    paint.show();
  }
  bug.then = () => { landed(); begin(); };

  /* ---------- her taps ---------- */

  const canvas = $("screen");
  canvas.addEventListener("pointerdown", (e) => {
    if (!started) return;
    const p = Day.spot(e, canvas);
    const near = Math.hypot(p.x - bug.x, (p.y - bug.y) * 1.3) < spriteW() * 0.24;
    if (near) { // a happy little hop where it is
      hop = 1;
      if (!still) bug.vy -= 220;
      for (let i = 0; i < 2; i += 1) release(bug.x, bug.y, (Math.random() * tables.length) | 0, 2);
      landed();
      burst(bug.x, bug.y, 18);
    } else {
      flyTo(p.x, p.y, landed);
      burst(p.x, p.y, 8);
    }
  });

  function burst(x, y, n) {
    if (still) return;
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * TAU;
      const v = 30 + Math.random() * 110;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.7, ch: "*+'.o"[(Math.random() * 5) | 0], fall: 60 });
    }
  }

  /* ---------- color buttons ---------- */

  const swatches = love.wings.map((wing, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "wing";
    b.style.setProperty("--dot", wing.main);
    b.setAttribute("aria-label", wing.name);
    b.setAttribute("aria-pressed", String(i === pick));
    b.addEventListener("click", () => choose(i));
    $("wings").appendChild(b);
    return b;
  });
  function choose(i) {
    pick = i;
    swatches.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    try { localStorage.setItem("wing" + location.pathname, String(i)); } catch (e) { /* won't be remembered */ }
    burst(bug.x, bug.y, 26);
    tintWords();
    if (still) shown.set(tables[pick]);
  }

  function tintWords() { document.documentElement.style.setProperty("--wing", love.wings[pick].main); }
  tintWords();

  const paint = Day.colors({
    row: $("row"), later: true,
    list: ["#000000", "#0c0a1a", "#16081a", "#05140c", "#1a0606", "#0a1020", "#141414"],
    apply(hex) {
      paper = Day.deepen(hex, 0.03);
      document.documentElement.style.setProperty("--bg", paper);
    }
  });

  /* ---------- time ---------- */

  function step(dt) {
    clock += dt;
    type(dt);
    const goal = tables[pick];
    const k = Math.min(1, dt * 5);
    for (let i = 0; i < shown.length; i += 1) shown[i] += (goal[i] - shown[i]) * k;

    if (still) {
      if (bug.flying) { bug.x = bug.tx; bug.y = bug.ty; bug.flying = false; const then = bug.then; bug.then = null; if (then) then(); }
      return;
    }
    // a soft spring toward where it's going, with a little flutter
    const dx = bug.tx - bug.x, dy = bug.ty - bug.y;
    bug.vx += (dx * 3.4 - bug.vx * 2.9) * dt;
    bug.vy += (dy * 3.4 - bug.vy * 2.9) * dt;
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    const speed = Math.hypot(bug.vx, bug.vy);
    if (bug.flying && Math.hypot(dx, dy) < 8 && speed < 40) {
      bug.flying = false;
      const then = bug.then; bug.then = null;
      if (then) then();
    }
    const rate = 0.85 + Math.min(3.3, speed / 70) + hop * 2.5;
    bug.phase = (bug.phase + dt * rate * BEAT) % BEAT;
    hop = Math.max(0, hop - dt * 1.5);
    if (speed > 60 && Math.random() < dt * 30) {
      sparks.push({ x: bug.x + (Math.random() - 0.5) * spriteW() * 0.3, y: bug.y + (Math.random() - 0.2) * spriteH() * 0.2, vx: 0, vy: 10, life: 0.7 + Math.random() * 0.5, ch: ".'*+"[(Math.random() * 4) | 0], fall: 20 });
    }

    for (const s of smalls) {
      s.age += dt;
      s.vy -= 10 * dt;
      s.x += (s.vx + Math.sin(s.age * 2.1 + s.wob) * 45) * dt;
      s.y += (s.vy + Math.cos(s.age * 3.3 + s.wob) * 30) * dt;
      s.phase = (s.phase + dt * s.rate * BEAT) % BEAT;
    }
    smalls = smalls.filter((s) => s.age < s.life && s.y > -FLY.small.rows * lh);
    for (const s of sparks) { s.vy += s.fall * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.life -= dt; }
    sparks = sparks.filter((s) => s.life > 0);
  }

  function draw() {
    depth.fill(-99);
    cells.fill(" ");
    picture.data.fill(0);

    for (const s of smalls) {
      const fade = Math.min(1, s.age * 2, (s.life - s.age) / 1.2);
      stamp(SMALL, FLY.small, (s.phase | 0) % BEAT, s.x, s.y, s.table, -10, Math.max(0, fade) * 255);
    }

    const bob = still ? 0 : Math.sin((bug.phase / BEAT) * TAU) * lh * 0.35 + Math.sin(clock * 0.9) * lh * 0.5;
    const drift = still ? 0 : Math.sin(clock * 0.6) * cw * 1.5;
    stamp(BIG, FLY.big, still ? 0 : bug.phase | 0, bug.x + drift, bug.y + bob, shown, 0);

    const main = [shown[3 * 7], shown[3 * 7 + 1], shown[3 * 7 + 2]];
    for (const s of sparks) plot((s.x / cw) | 0, (s.y / lh) | 0, 5, s.ch, main[0], main[1], main[2], Math.min(1, s.life * 2) * 255);

    const c = view.ctx;
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#fff";
    c.font = font;
    c.textBaseline = "top";
    for (let y = 0; y < rows; y += 1) {
      const text = cells.slice(y * cols, (y + 1) * cols).join("");
      if (text.trim()) c.fillText(text, 0, y * lh);
    }
    tintCtx.putImageData(picture, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = "source-in";
    c.drawImage(tint, 0, 0, cols * cw, rows * lh);
    c.imageSmoothingEnabled = true;
    c.globalCompositeOperation = "destination-over";
    c.globalAlpha = 0.2;
    c.drawImage(tint, 0, 0, cols * cw, rows * lh); // a soft glow under the letters
    c.globalAlpha = 1;
    c.fillStyle = paper;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
  }

  if (still) { bug.x = bug.tx; bug.y = bug.ty; }
  if (document.fonts && document.fonts.load) document.fonts.load('700 10px "Ubuntu Mono"').then(measure, () => {});
  let wait = 0;
  Day.loop((dt) => {
    step(dt);
    wait += dt;
    if (wait < 1 / 31) return;
    wait = 0;
    draw();
  });
})();
