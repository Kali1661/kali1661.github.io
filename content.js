/* Change the words on this page here. */
window.LOVE = {
  name: "Any",
  from: "Jakub",

  // One each time the butterfly lands. {name} is filled in.
  phrases: [
    { lang: "en", text: "You give me butterflies" },
    { lang: "en", text: "Still. Every single time." },
    { lang: "en", text: "Every time you smile at me" },
    { lang: "en", text: "Every time you say my name" },
    { lang: "en", text: "You make my whole world lighter" },
    { lang: "en", text: "I love you, {name}" }
  ],

  // Butterfly colors to pick from, and the one it starts as.
  startWing: "Blue",
  // main: the wings, edge: the rims and veins, spot: the little dots, body: the body.
  wings: [
    { name: "Red", main: "#ff2d42", edge: "#a8122c", spot: "#ffe6ea", body: "#d0606e" },
    { name: "White", main: "#f7f4ff", edge: "#8f9bc8", spot: "#ffffff", body: "#c8c4dc" },
    { name: "Blue", main: "#3aa9ff", edge: "#1656c8", spot: "#d2f1ff", body: "#5a8cd4" },
    { name: "Navy blue", main: "#3a5ccc", edge: "#1c2c78", spot: "#eef2ff", body: "#7080b8" },
    { name: "Light purple", main: "#c9a6ff", edge: "#7550c0", spot: "#fff4ff", body: "#a890cc" },
    { name: "Pink", main: "#ff86c2", edge: "#b0367a", spot: "#fff0f7", body: "#d68eae" },
    { name: "Gold", main: "#ffcb3d", edge: "#a86a00", spot: "#fffbe6", body: "#cca456" },
    { name: "Orange", main: "#ff8a1f", edge: "#7a3008", spot: "#ffffff", body: "#a06a50" },
    { name: "Mint", main: "#5ff2c8", edge: "#148068", spot: "#f0fffa", body: "#80ccb8" }
  ]
};
