(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#ff2d55", "#ff4d6d", "#ff758f", "#ff85a1", "#ff3366", "#e63d6a", "#ff6b8a", "#ffb3c1", "#c9184a"];

  function spawn() {
    const el = document.createElement("span");
    el.className = "fheart";
    el.textContent = "♥";
    const size = 12 + Math.random() * 30;
    el.style.cssText =
      "left:" + (2 + Math.random() * 96) + "vw;" +
      "font-size:" + size + "px;" +
      "color:" + colors[Math.floor(Math.random() * colors.length)] + ";" +
      "--dur:" + (5 + Math.random() * 7) + "s;" +
      "--dx:" + (-40 + Math.random() * 80) + "px;" +
      "--op:" + (0.35 + Math.random() * 0.55) + ";";
    document.body.appendChild(el);
    el.addEventListener("animationend", function () { el.remove(); }, { once: true });
  }

  for (let i = 0; i < 10; i++) setTimeout(spawn, i * 180);
  setInterval(spawn, 500);
})();
