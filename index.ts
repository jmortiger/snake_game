import SnakeRenderer from "./SnakeRenderer";
import { EngineConfig, type IEngineConfig } from "./Types";

const canvas = document.createElement("canvas");
canvas.width = 300;
canvas.height = 300;

// canvas.style.imageRendering = "pixelated";
document.body.prepend(canvas);
const state = EngineConfig.toUI(EngineConfig.defaults, initialize);
function initialize(cfg: IEngineConfig) {
  const r = new SnakeRenderer(canvas, cfg);

  canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
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
