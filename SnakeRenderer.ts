import type { GameStateEvent } from "./Events";
import { SnakeEngine, type EngineConfig, type IEngineConfig } from "./SnakeEngine";

class SnakeRenderer {
  public readonly engine: SnakeEngine;
  constructor(public readonly ctx: CanvasRenderingContext2D, public readonly config: EngineConfig = SnakeEngine.defaultConfig) {
    this.engine = new SnakeEngine(10, 10, config);
  }

  public startGame() {
    this.engine.initGame();
    this.engine.onTickCompleted.add((e) => this.draw(e));
    this.engine.startGame();
  }

  public draw(args: GameStateEvent) {
    const snakeSquares = args.engine.snake.filledNodes;
    
  }
}
