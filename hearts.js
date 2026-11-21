(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9;overflow:hidden;";
  document.body.appendChild(container);

  const colors = ["#ff2d55", "#ff4d6d", "#ff758f", "#ff85a1", "#ff3366", "#e63d6a", "#ff6b8a", "#ffb3c1", "#c9184a"];

  function spawn() {
    const el = document.createElement("span");
    el.className = "fheart";
    el.textContent = "♥";
    const size = 14 + Math.random() * 28;
    el.style.cssText =
      "position:absolute;" +
      "bottom:-60px;" +
      "left:" + (2 + Math.random() * 96) + "%;" +
      "font-size:" + size + "px;" +
      "color:" + colors[Math.floor(Math.random() * colors.length)] + ";" +
      "--dur:" + (5 + Math.random() * 7) + "s;" +
      "--dx:" + (-40 + Math.random() * 80) + "px;" +
      "--op:" + (0.4 + Math.random() * 0.5) + ";";
    container.appendChild(el);
    el.addEventListener("animationend", function () { el.remove(); }, { once: true });
  }

  for (let i = 0; i < 12; i++) setTimeout(spawn, i * 150);
  setInterval(spawn, 450);
})();
