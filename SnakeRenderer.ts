import { SnakeEngine, type EngineConfig, type IEngineConfig } from "./SnakeEngine";

class SnakeRenderer {
  public readonly engine: SnakeEngine;
  constructor(public readonly ctx: CanvasRenderingContext2D, public readonly config: EngineConfig = SnakeEngine.defaultConfig) {
    this.engine = new SnakeEngine(10, 10, config);

    
  }

  public startGame() {

  }
}
