import SnakeRenderer from "./SnakeRenderer";
import { EngineConfig, type IEngineConfig } from "./Types";

const canvas = document.querySelector("canvas") ?? (() => {
  const c = document.createElement("canvas");
  document.body.prepend(c);
  return c;
})();
const ctr = document.createElement("div");
ctr.style.display = "flex";
ctr.style.flexFlow = "row nowrap";
ctr.style.justifyContent = "start";
canvas.replaceWith(ctr);
ctr.appendChild(canvas);
canvas.width = 300;
canvas.height = 300;
const ctx = canvas.getContext("2d")!;
if (!ctx) {
  throw Error("Failed to retrieve canvas context.");
}

// canvas.style.imageRendering = "pixelated";
const state = EngineConfig.toUI(EngineConfig.defaults, initialize);
ctr.appendChild(state.form);
function initialize(cfg: IEngineConfig) {
  const r = new SnakeRenderer(ctx, cfg);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Wait for assets to load before setting up the game
  r.initGame().then(() => {
    document.onkeyup = (e: KeyboardEvent) => {
      if (e.key === " ") {
        r.startGame();
        document.onkeyup = null;
      }
    };
    r.draw({ engine: r.engine });
  }).catch((error) => {
    console.error("Failed to load game assets:", error);
  });
}
canvas.insertAdjacentElement("afterend", state.form); // document.body.appendChild(state.form);
initialize(state.defaults);
