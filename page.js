(function () {
  "use strict";
  const { $, love, still } = Day;
  const scene = $("scene");
  const kitty = $("kitty");
  const cat = $("cat");
  const item = $("item");
  const said = love.kitty;
  const words = (t) => t.replace("{name}", love.name).replace("{from}", love.from);
  const sleep = (ms) => new Promise((r) => setTimeout(r, still ? Math.min(ms, 350) : ms));

  /* ---------- pictures ---------- */

  const walkA = (e) => [" /\\_/\\       ,", "( " + e + " )_____//", " > ^ <      |", "  |/ `---' |/"].join("\n");
  const walkB = (e) => [" /\\_/\\      _,", "( " + e + " )_____\\\\", " > ^ <      |", "  \\| `---' \\|"].join("\n");
  const sit = (e, paw, tail) => ["  /\\_/\\  ", " ( " + e + " ) ", "  > ^ <" + (paw ? "\\_" : "  "), " (\")_(\")" + tail].join("\n");
  const boxed = (e) => ["   /\\_/\\   ", "  ( " + e + " )  ", " |=======| ", " |  <3   | ", " |_______| "].join("\n");
  const asleep = (z) => ["           " + z, "   /\\_/\\____ ", "  ( u.u )   )", "   `-~-'____/~"].join("\n");

  const art = {
    heart: [" .-. .-. ", "(   '   )", " '.   .' ", "   '.'   "],
    yarn: ["  .--.  ", " ( @@ )~", "  '--'  "],
    fish: ["><(((o>"],
    box: [" __||__ ", "|  ||  |", "|==<>==|", "|__||__|"]
  };
  const label = { heart: "Take the heart", yarn: "Take the yarn", fish: "Take the fish", box: "Open the box" };

  /* ---------- kitty ---------- */

  let x = 0;
  let pose = "sit"; // walk, sit, offer, box, asleep, off
  let face = "";    // set to hold an expression
  let tick = 0;
  let blink = 0;

  function drawCat() {
    tick += 1;
    if (Math.random() < 0.035) blink = 2;
    blink -= 1;
    const e = face || (blink > 0 ? "-.-" : "o.o");
    const tail = ["~", "~", "-", "~", "~", ","][(tick >> 1) % 6];
    let text = "";
    if (pose === "walk") text = tick % 2 ? walkA(e) : walkB(e);
    if (pose === "sit") text = sit(e, false, tail);
    if (pose === "offer") text = sit(e, true, tail);
    if (pose === "box") text = boxed(e);
    if (pose === "asleep") text = asleep(["z", "zz", "zzz", "zz"][(tick >> 2) % 4]);
    if (cat.textContent !== text) cat.textContent = text;
  }
  setInterval(drawCat, 130);

  function place(px) { x = px; kitty.style.transform = "translateX(" + px + "px)"; }
  const center = (extra) => (scene.clientWidth - cat.offsetWidth - (extra || 0)) / 2;

  function walkTo(to) {
    pose = "walk";
    drawCat();
    const from = x;
    if (still) { place(to); return Promise.resolve(); }
    const time = Math.max(300, (Math.abs(to - from) / Math.max(130, scene.clientWidth * 0.22)) * 1000);
    return new Promise((done) => {
      const t0 = performance.now();
      (function frame(now) {
        const k = Math.min(1, Math.max(0, (now - t0) / time));
        place(from + (to - from) * k);
        if (k < 1) requestAnimationFrame(frame); else done();
      })(t0);
    });
  }

  function hop(n) {
    if (still) return Promise.resolve();
    return cat.animate(
      [{ transform: "none" }, { transform: "translateY(-26px)" }, { transform: "none" }],
      { duration: 300, iterations: n || 1, easing: "ease-out" }
    ).finished;
  }

  function bubble(text) {
    $("bubble").hidden = !text;
    $("bubble").textContent = text || "";
  }

  function line(text) {
    $("line").textContent = words(text);
    if (text && !still) {
      $("line").animate([{ opacity: 0, transform: "translateY(22px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,1.3,.4,1)" });
    }
  }

  // Little typed hearts flying out of a point on the scene.
  function burst(px, py, n, power) {
    if (still) return;
    for (let i = 0; i < n; i += 1) {
      const b = document.createElement("span");
      b.className = "bit";
      b.textContent = Math.random() < 0.85 ? "<3" : "*";
      b.style.fontSize = 15 + Math.random() * 24 + "px";
      scene.appendChild(b);
      const a = Math.random() * Math.PI * 2;
      const d = power * (0.35 + Math.random() * 0.65);
      const tx = px + Math.cos(a) * d;
      const ty = py + Math.sin(a) * d;
      b.animate([
        { transform: "translate(" + px + "px," + py + "px) scale(.3)", opacity: 1 },
        { transform: "translate(" + tx + "px," + ty + "px) scale(1)", opacity: 1, offset: 0.45 },
        { transform: "translate(" + (tx + (Math.random() - 0.5) * 60) + "px," + (ty + 130) + "px) rotate(" + (Math.random() - 0.5) * 90 + "deg)", opacity: 0 }
      ], { duration: 1500 + Math.random() * 1300, easing: "cubic-bezier(.15,.7,.4,1)" }).finished.then(() => b.remove(), () => b.remove());
    }
  }
  function middleOf(el) {
    const r = el.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2];
  }

  /* ---------- the delivery ---------- */

  // Shows a thing and waits until it's tapped.
  async function offer(name) {
    $("item-art").textContent = art[name].join("\n");
    item.setAttribute("aria-label", label[name]);
    item.className = "item is-waiting";
    item.style.transform = "";
    pose = "offer";
    face = "";
    drawCat();
    item.hidden = false;
    place(center(item.offsetWidth * 0.8));
    if (!still) item.animate([{ transform: "scale(0)" }, { transform: "scale(1.2)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
    await new Promise((done) => item.addEventListener("click", done, { once: true }));
    item.classList.remove("is-waiting");
    $("hint").textContent = "";
    bubble("");
  }

  async function heartGift() {
    await offer("heart");
    burst(...middleOf(item), 16, 150);
    item.hidden = true;
    pose = "sit"; face = "^.^";
    line(said.heart);
    await hop(3);
    await sleep(1900);
  }

  async function yarnGift() {
    await offer("yarn");
    item.hidden = true;
    line(said.yarn);
    pose = "sit"; face = "*.*";
    const thread = $("thread");
    thread.textContent = "~".repeat(240);
    const roll = thread.animate([{ width: "0" }, { width: "100%" }], { duration: still ? 1 : 1500, easing: "ease-out", fill: "forwards" });
    await hop(1);
    face = "o.o";
    await walkTo(-cat.offsetWidth - 40); // off after it
    await roll.finished;
    await sleep(400);
    place(scene.clientWidth + 20); // and back in on the other side
    await walkTo(center());
    roll.cancel();
    thread.textContent = "";
    pose = "sit"; face = "";
    await sleep(700);
  }

  async function fishGift() {
    await offer("fish");
    line(said.fish);
    pose = "sit";
    if (!still) {
      await item.animate([{ transform: "none" }, { transform: "translate(-90px, -22px) scale(.15)" }], { duration: 520, easing: "ease-in" }).finished;
    }
    item.hidden = true;
    bubble("nom nom");
    for (let i = 0; i < 6; i += 1) { face = i % 2 ? "-o-" : "-.-"; await sleep(190); }
    bubble("");
    face = "^.^";
    await sleep(1700);
  }

  async function boxGift() {
    await offer("box");
    const at = middleOf(item);
    item.hidden = true;
    burst(...at, 26, 190);
    line(said.box);
    pose = "box"; face = "^.^";
    drawCat();
    place(center());
    await hop(2);
    await sleep(2600);
  }

  // The last one keeps growing until there's no room left for it.
  async function growGift() {
    face = "";
    const STEPS = 9;
    line(said.grow);
    const first = offer("heart");
    item.setAttribute("aria-label", "Tap the heart to make it bigger");
    const home = middleOf(item);
    await first;
    item.classList.add("is-big");
    const size = Math.min(scene.clientWidth, scene.clientHeight);
    const full = (size * 1.25) / Math.max(1, item.offsetWidth);
    const more = ["more", "and more", "more than that", "so much more", "still more", "a lot more", "almost", "hold on"];
    for (let n = 1; n <= STEPS; n += 1) {
      const k = n / STEPS;
      const scale = 1 + (full - 1) * Math.pow(k, 1.5);
      const dx = (scene.clientWidth / 2 - home[0]) * k;
      const dy = (scene.clientHeight * 0.46 - home[1]) * k;
      item.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
      face = n > 5 ? ">.<" : "o.o";
      if (n === 3) line("");
      bubble(n < STEPS ? more[n - 1] : "");
      burst(...home, 3, 90);
      if (n < STEPS) await new Promise((done) => item.addEventListener("click", done, { once: true }));
    }
    await sleep(420);
    item.hidden = true;
    const cx = scene.clientWidth / 2;
    const cy = scene.clientHeight * 0.46;
    burst(cx, cy, 110, size * 0.75);
    line(said.done);
    pose = "sit"; face = "^.^";
    place(center());
    for (let i = 0; i < 4; i += 1) {
      await sleep(650);
      burst(Math.random() * scene.clientWidth, scene.clientHeight * (0.15 + Math.random() * 0.5), 18, 170);
    }
    await hop(3);
    await sleep(1600);
  }

  const paint = Day.colors({
    row: $("row"), later: true,
    list: ["#ffe08f", "#ffc9c2", "#cfe8c0", "#bfe3ee", "#d9cdf0", "#f6efe2", "#3a2350"],
    ink: ["#43203f", "#ffeecb"],
    apply(hex) { document.documentElement.style.setProperty("--pink", Day.light(hex) > 0.22 ? "#c9184f" : "#ff86ab"); }
  });

  async function run() {
    $("again").hidden = true;
    line("");
    bubble("");
    face = "";
    pose = "walk";
    drawCat();
    place(scene.clientWidth + 20);
    await sleep(350);
    await walkTo(center());
    pose = "sit";
    drawCat();
    place(center());
    await sleep(350);
    bubble(words(said.hello));
    await hop(2);
    await sleep(900);
    $("hint").textContent = "Tap what she's holding.";
    paint.show();
    await heartGift();
    await yarnGift();
    await fishGift();
    await boxGift();
    await growGift();
    face = "";
    pose = "asleep";
    drawCat();
    place(center());
    $("again").hidden = false;
  }

  window.addEventListener("resize", () => {
    if (pose !== "walk") place(center(item.hidden ? 0 : item.offsetWidth * 0.8));
  }, { passive: true });
  $("again").addEventListener("click", run);

  const ready = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('700 30px "Ubuntu Mono"'), new Promise((r) => setTimeout(r, 1500))])
    : Promise.resolve();
  ready.then(run, run);
})();
