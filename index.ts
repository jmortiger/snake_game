import SnakeRenderer from "./SnakeRenderer";

const canvas = document.createElement("canvas");
canvas.style.imageRendering = "pixelated";
document.body.replaceChildren(canvas);
const ctx = canvas.getContext("2d")!;
const r = new SnakeRenderer(ctx);
r.startGame();
