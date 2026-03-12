import SnakeRenderer from "./SnakeRenderer";

const canvas = document.createElement("canvas");
canvas.style.imageRendering = "pixelated";
document.body.replaceChildren(canvas);
const r = new SnakeRenderer(canvas);
r.initGame();
document.onkeyup = (e: KeyboardEvent) => {
  if (e.key === " ") {
    r.startGame();
    document.onkeyup = null;
  }
};
r.draw({ engine: r.engine });
