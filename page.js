(function () {
  "use strict";
  const { $, love, still } = Day;
  const TAU = Math.PI * 2;

  // Each shape is a list of strokes; points run 0 to 1 across its own box.
  const shapes = [
    {
      ratio: 1.08, hint: "Tap the bright star, then follow the line.",
      strokes: [[[0.5, 0.3], [0.63, 0.1], [0.82, 0.05], [0.97, 0.2], [0.97, 0.42], [0.83, 0.64], [0.5, 1], [0.17, 0.64], [0.03, 0.42], [0.03, 0.2], [0.18, 0.05], [0.37, 0.1], [0.5, 0.3]]]
    },
    {
      ratio: 2.1, hint: "There is a name up there too.",
      strokes: [ // A, N, Y
        [[0.02, 1], [0.13, 0], [0.24, 1]], [[0.065, 0.6], [0.195, 0.6]],
        [[0.38, 1], [0.38, 0], [0.62, 1], [0.62, 0]],
        [[0.76, 0], [0.87, 0.48], [0.98, 0]], [[0.87, 0.52], [0.87, 1]]
      ]
    }
  ];

  let level = 0;
  let placed = [];   // the current shape's stars, in order
  let at = 0;        // how many are lit
  let finished = []; // shapes already drawn
  let mine = [];     // her own lines, once the shapes are done
  let mineLast = null;
  let dust = [];
  let shooting = [];
  let sparks = [];
  let celebrate = 0;
  let line = 0;      // how far the newest line has been drawn
  let w = 1, h = 1, ground = 1;

  const view = Day.fit($("sky"), (v) => {
    w = v.w; h = v.h;
    ground = h - Math.max(150, h * 0.23);
    seedDust();
    if (level < shapes.length) placed = layout(shapes[level]);
    finished = finished.map((f) => ({ shape: f.shape, points: layout(f.shape) }));
  });

  function seedDust() {
    const n = Math.round(Math.min(900, (w * h) / 1000));
    dust = Array.from({ length: n }, () => {
      const band = Math.random() < 0.5;
      const x = Math.random() * w;
      const y = band
        ? h * 0.62 - x * 0.42 * (h / w) + (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.2
        : Math.random() * ground;
      return { x, y, r: Math.pow(Math.random(), 3) * 1.5 + 0.35, p: Math.random() * TAU, warm: Math.random() < 0.25, a: 0.35 + Math.random() * 0.6 };
    });
  }

  function layout(shape) {
    const top = Math.max(96, h * 0.15);
    const maxW = Math.min(w * 0.8, 720);
    const maxH = Math.max(120, (ground - top) * 0.82);
    const bw = Math.min(maxW, maxH * shape.ratio);
    const bh = bw / shape.ratio;
    const x0 = (w - bw) / 2;
    const y0 = top + (ground - top - bh) * 0.4;
    const points = [];
    shape.strokes.forEach((s) => s.forEach(([x, y], i) => points.push({ x: x0 + x * bw, y: y0 + y * bh, start: i === 0 })));
    return points;
  }

  /* ---------- lighting stars ---------- */

  function burst(x, y, n, speed) {
    if (still) return;
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * TAU;
      const v = Math.random() * speed;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.9 });
    }
    if (sparks.length > 700) sparks = sparks.slice(-700);
  }

  function light() {
    if (level >= shapes.length || at >= placed.length) return;
    const p = placed[at];
    at += 1;
    line = 0;
    burst(p.x, p.y, 14, 90);
    if (at === placed.length) complete();
  }

  function words(text, lang) {
    $("words").textContent = text;
    $("words").lang = lang || "en";
    $("words").classList.add("is-on");
  }

  function complete() {
    const shape = shapes[level];
    const points = placed;
    finished.push({ shape, points });
    celebrate = 1;
    points.forEach((p) => burst(p.x, p.y, 10, 150));
    for (let i = 0; i < 5; i += 1) setTimeout(shoot, 300 + i * 330);
    const phrase = Day.nextPhrase();
    words(phrase.text, phrase.lang);
    Day.say(phrase);
    const done = level;
    placed = [];
    at = 0;
    level += 1;
    $("hint").textContent = "";
    setTimeout(() => {
      if (done === 0) {
        placed = layout(shapes[1]);
        finished = []; // clear the sky for the next one
        $("words").classList.remove("is-on");
        $("hint").textContent = shapes[1].hint;
      } else {
        finished.forEach((f) => { f.dim = true; });
        $("hint").textContent = "Now the sky is yours. Tap from star to star and draw your own.";
        $("next-star").textContent = "Start over";
      }
    }, still ? 2500 : 5200);
  }

  function shoot() {
    const fromLeft = Math.random() < 0.5;
    const s = 420 + Math.random() * 420;
    shooting.push({ x: fromLeft ? Math.random() * w * 0.5 : w * (0.5 + Math.random() * 0.5), y: Math.random() * ground * 0.4, vx: fromLeft ? s : -s, vy: s * 0.42, life: 1.1 });
  }

  function restart() {
    level = 0; at = 0; finished = []; mine = []; mineLast = null;
    placed = layout(shapes[0]);
    $("words").classList.remove("is-on");
    $("hint").textContent = shapes[0].hint;
    $("next-star").textContent = "Next star";
  }

  $("sky").addEventListener("pointerdown", (e) => {
    const p = Day.spot(e, $("sky"));
    if (level < shapes.length && at < placed.length) {
      const t = placed[at];
      if (Math.hypot(t.x - p.x, t.y - p.y) < 34) { light(); return; }
    } else if (level >= shapes.length && p.y < ground) {
      let best = null;
      let near = 60;
      for (const d of dust) {
        const dist = Math.hypot(d.x - p.x, d.y - p.y) - d.r * 8;
        if (dist < near) { near = dist; best = d; }
      }
      const star = best ? { x: best.x, y: best.y } : p;
      if (mineLast) mine.push([mineLast, star]);
      mineLast = star;
      burst(star.x, star.y, 10, 70);
      return;
    }
    burst(p.x, p.y, 6, 40);
  });

  $("next-star").addEventListener("click", () => {
    if (level >= shapes.length) { if ($("hint").textContent) restart(); } else light();
  });
  $("wish").addEventListener("click", shoot);
  $("hint").textContent = shapes[0].hint;

  /* ---------- drawing ---------- */

  let tones = [];
  Day.colors({
    row: $("row"),
    list: ["#25306f", "#4a2464", "#143f5c", "#12493f", "#6b1f45", "#2b2d42", "#7a3b2e"],
    apply(hex) {
      const base = Day.deepen(hex, 0.07);
      tones = [
        Day.mix(base, "#03051a", 0.6), base, Day.mix(base, "#a86aa6", 0.5), Day.mix(base, "#ff9a8f", 0.72),
        Day.mix(base, "#4a2c5c", 0.5), Day.mix(base, "#0a0820", 0.6), Day.mix(base, "#05061a", 0.8)
      ];
      document.documentElement.style.setProperty("--bg", tones[6]);
    }
  });

  function glowStar(c, x, y, r, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 6);
    g.addColorStop(0, "rgba(255,244,214," + a + ")");
    g.addColorStop(0.18, "rgba(255,214,150," + a * 0.5 + ")");
    g.addColorStop(1, "rgba(255,190,130,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r * 6, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,255,255," + Math.min(1, a + 0.2) + ")";
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  function join(c, a, b, k, alpha) {
    c.strokeStyle = "rgba(255,226,176," + alpha + ")";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
    c.stroke();
  }

  function hill(c, base, rise, shift, color) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 12; x += 12) {
      c.lineTo(x, base - Math.sin((x / w) * Math.PI * 1.15 + shift) * rise - Math.sin(x * 0.011 + shift * 3) * 6);
    }
    c.lineTo(w, h);
    c.fill();
  }

  // Two people, leaning together.
  function couple(c, time) {
    const s = Math.min(1.15, Math.max(0.72, h / 900));
    const x = w * 0.5;
    // sit on the front hill, whatever the screen's shape
    const y = ground + 116 - Math.sin(Math.PI * 0.575 + 0.15) * 60 - Math.sin(w * 0.0055 + 0.45) * 6 - 18 * s;
    const lean = Math.sin(time * 0.5) * 0.012;
    c.fillStyle = "#07091c";
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.rotate(lean);
    c.beginPath(); // the taller one
    c.moveTo(-34, 26); c.bezierCurveTo(-36, -12, -27, -27, -13, -27); c.bezierCurveTo(0, -27, 5, -10, 4, 26); c.fill();
    c.beginPath(); c.arc(-10, -39, 11, 0, TAU); c.fill();
    c.beginPath(); // the other, leaning in
    c.moveTo(-3, 26); c.bezierCurveTo(-4, -6, 3, -20, 14, -20); c.bezierCurveTo(27, -20, 32, -4, 31, 26); c.fill();
    c.beginPath(); c.arc(7, -31, 10, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0, -38); c.bezierCurveTo(14, -48, 22, -34, 21, -18); c.bezierCurveTo(21, -4, 25, 2, 22, 8); c.bezierCurveTo(12, 8, 9, -8, 10, -22); c.fill();
    c.restore();
  }

  Day.loop((dt, time) => {
    const c = view.ctx;
    line = Math.min(1, line + dt * 3.2);
    celebrate = Math.max(0, celebrate - dt * 0.22);

    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, tones[0]);
    sky.addColorStop(0.45, tones[1]);
    sky.addColorStop(0.72, tones[2]);
    sky.addColorStop(0.9, tones[3]);
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    for (const d of dust) {
      if (d.y > ground + 20) continue;
      c.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(time * 1.6 + d.p)) * Math.max(0.15, 1 - (d.y / ground) * 0.75);
      c.fillStyle = d.warm ? "#ffe0b0" : "#ffffff";
      c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;

    c.lineCap = "round";
    for (const f of finished) {
      const a = f.dim ? 0.3 : 0.75 + celebrate * 0.25;
      f.points.forEach((p, i) => {
        if (!p.start) join(c, f.points[i - 1], p, 1, a);
      });
      f.points.forEach((p) => glowStar(c, p.x, p.y, (f.dim ? 1.6 : 2.4) + celebrate * 1.6, f.dim ? 0.4 : 0.85));
    }
    mine.forEach(([a, b]) => join(c, a, b, 1, 0.75));
    mine.forEach(([a, b]) => { glowStar(c, a.x, a.y, 2, 0.75); glowStar(c, b.x, b.y, 2, 0.75); });
    if (mineLast) glowStar(c, mineLast.x, mineLast.y, 2.6, 0.9);

    if (level < shapes.length) {
      for (let i = 1; i < at; i += 1) {
        if (!placed[i].start) join(c, placed[i - 1], placed[i], i === at - 1 ? line : 1, 0.8);
      }
      placed.forEach((p, i) => {
        if (i < at) glowStar(c, p.x, p.y, 2.4, 0.9);
        else if (i === at) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 4);
          glowStar(c, p.x, p.y, 3.2 + pulse, 1);
          c.strokeStyle = "rgba(255,226,176," + (0.75 - pulse * 0.5) + ")";
          c.lineWidth = 1.5;
          c.beginPath(); c.arc(p.x, p.y, 13 + pulse * 7, 0, TAU); c.stroke();
        } else glowStar(c, p.x, p.y, 1.5, 0.4);
      });
    }

    if (!still && Math.random() < dt * 0.13) shoot();
    for (const s of shooting) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      const g = c.createLinearGradient(s.x, s.y, s.x - s.vx * 0.2, s.y - s.vy * 0.2);
      g.addColorStop(0, "rgba(255,250,235," + Math.max(0, s.life) + ")");
      g.addColorStop(1, "rgba(255,250,235,0)");
      c.strokeStyle = g;
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 0.2, s.y - s.vy * 0.2); c.stroke();
    }
    shooting = shooting.filter((s) => s.life > 0);

    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.vy = s.vy * 0.97 + 14 * dt; s.life -= dt;
      c.globalAlpha = Math.max(0, Math.min(1, s.life));
      c.fillStyle = "#ffe2b0";
      c.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
    c.globalAlpha = 1;
    sparks = sparks.filter((s) => s.life > 0);

    hill(c, ground + 64, 46, 0.6, tones[4]);
    hill(c, ground + 92, 62, 0.2, tones[5]);
    couple(c, time);
    hill(c, ground + 116, 60, 0.15, tones[6]);
  });
})();
