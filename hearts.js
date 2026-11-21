(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999;overflow:hidden;";
  document.body.appendChild(container);

  const colors = ["#ff2d55", "#ff4d6d", "#ff758f", "#ff3366", "#e63d6a", "#ff6b8a", "#ffb3c1", "#c9184a", "#ff0a54"];

  function spawn() {
    const el = document.createElement("span");
    el.className = "fheart";
    el.textContent = "♥";
    const dur = (5 + Math.random() * 7).toFixed(2);
    el.style.left = (2 + Math.random() * 96) + "%";
    el.style.fontSize = (14 + Math.random() * 28) + "px";
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = dur + "s";
    el.style.opacity = (0.45 + Math.random() * 0.5).toFixed(2);
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, parseFloat(dur) * 1000 + 200);
  }

  for (var i = 0; i < 14; i++) (function (n) { setTimeout(spawn, n * 140); })(i);
  setInterval(spawn, 480);
})();
