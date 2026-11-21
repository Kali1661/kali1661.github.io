(function () {
  "use strict";

  const profile = window.PORTFOLIO || {};
  document.querySelectorAll("[data-site]").forEach((element) => {
    const value = profile[element.dataset.site];
    if (typeof value === "string" && value.length) element.textContent = value;
  });
})();
