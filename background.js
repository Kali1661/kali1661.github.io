(function () {
  "use strict";

  const canvas = document.querySelector("#ambient");
  const context = canvas && canvas.getContext("2d");
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let dots = [];
  let frame = 0;
  let lastFrame = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const amount = Math.min(width < 600 ? 34 : 62, Math.round((width * height) / 23000));
    dots = Array.from({ length: Math.max(18, amount) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      phase: Math.random() * Math.PI * 2,
      drift: 5 + Math.random() * 19,
      radius: .5 + Math.random() * 1.15
    }));
    paint(0);
  }

  function paint(time) {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";
    const positions = dots.map((dot) => ({
      x: dot.x + Math.sin(time * .00015 + dot.phase) * dot.drift,
      y: dot.y + Math.cos(time * .00012 + dot.phase) * dot.drift
    }));

    for (let i = 0; i < positions.length; i += 1) {
      const a = positions[i];
      for (let j = i + 1; j < positions.length; j += 1) {
        const b = positions[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 132) {
          context.strokeStyle = `rgba(135, 179, 231, ${(1 - distance / 132) * .105})`;
          context.lineWidth = .7;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
      context.fillStyle = "rgba(194, 225, 255, .48)";
      context.beginPath();
      context.arc(a.x, a.y, dots[i].radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = "source-over";
  }

  function animate(time) {
    if (time - lastFrame > 32) {
      paint(time);
      lastFrame = time;
    }
    frame = window.requestAnimationFrame(animate);
  }

  resize();
  if (!reducedMotion) frame = window.requestAnimationFrame(animate);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(frame), { once: true });
})();
