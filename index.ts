import SnakeRenderer from "./SnakeRenderer";

const canvas = document.createElement("canvas");
canvas.width = 300;
canvas.height = 300;

// canvas.style.imageRendering = "pixelated";
document.body.replaceChildren(canvas);
const r = new SnakeRenderer(canvas);

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
