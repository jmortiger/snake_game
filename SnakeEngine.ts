import { SnakeEvent, type GameOverEvent, type GameStateEvent, type PelletEatenEvent } from "./Events";
import { DebugInputHandler, InputHandler, type IInputHandler } from "./InputHandler";
import { Direction, Point, RectInt as Rect } from "./Point2d";
import Snake from "./Snake";
import { EngineConfig, type IEngineConfig } from "./Types";

class SnakeEngine {
  public static DEBUG_MODE = true;

  public inputHandler: IInputHandler = new DebugInputHandler();

  // #region Events
  public readonly onGameOver = new SnakeEvent<GameOverEvent>();
  public readonly onPelletEaten = new SnakeEvent<PelletEatenEvent>();
  public readonly onTickCompleted = new SnakeEvent<GameStateEvent>();
  // #endregion Events

  // #region Game State
  private timestamp?: number;

  private _isGameOver: boolean;
  public get isGameOver(): boolean { return this._isGameOver; }
  // #endregion Game State

  private obstacles: Point[] = [];
  private pellets:   Point[] = [];
  public getValidSpawnLocations() {
    const ret: Point[] = [];
    const lineSegments = this.snake?.segments;
    for (let x = this.playfieldRect.xMin; x <= this.playfieldRect.xMax; x++) {
      for (let y = this.playfieldRect.yMin; y <= this.playfieldRect.yMax; y++) {
        const p = new Point(x, y);
        if (!this.pellets.includes(p)
          && !this.obstacles.includes(p)
          && (!lineSegments || !lineSegments.find(e => p.intersects(e[0]!, e[1]!))))
          ret.push(p);
      }
    }
    return ret;
  }

  public getRandomValidSpawnLocation() {
    const t = this.getValidSpawnLocations();
    return t[Math.floor(Math.random() * t.length)];
  }

  public readonly playfieldRect: Rect;
  public get currentDirection(): Direction { return this.snake.headDirection; }
  public snake:                  Snake;

  constructor(
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
  ) {
    this.playfieldRect = Rect.fromDimensionsAndMin(config.gridWidth, config.gridHeight);
    this.snake = Snake.fromPreferences(this.config, this.playfieldRect);
    this._isGameOver = false;

    this.initGame();
  }

  /**
   * @todo Use pre-assigned pellets properly
   * @returns
   */
  public initGame() {
    /* this._snakeNodes.push(new Point(0, 0));
    this._snakeNodes.push(new Point(this._snakeLength, 0)); */
    const t = this.getValidSpawnLocations();
    if (typeof this.config.pelletConfig.startingObjs === "number") {
      const max = Math.min(t.length, this.config.pelletConfig.startingObjs);
      for (let i = 0; i < max; i++) {
        const index = Math.round(Math.random() * t.length);
        this.pellets.push(t[index]!);
        t.splice(Math.round(Math.random() * t.length), 1);
      }
    }

    // requestAnimationFrame(this.update);
  }

  // #region Tick Management
  private timerId?: number;
  startGame() {
    if (this.timerId) return;
    if (SnakeEngine.DEBUG_MODE)
      document.onkeyup = e => this.playOnSpacebar(e);
    else
      this.timerId = window.setInterval(() => this.update(), this.config.millisecondsPerUpdate);
    this.onGameOver.add(e => this.endGame());
  }

  playOnSpacebar(e: KeyboardEvent) {
    if (e.key === " ") this.update();
  }

  pauseGame() {
    if (!this.timerId) return;
    window.clearInterval(this.timerId);
    this.timerId = undefined;
  }

  endGame() {
    window.clearInterval(this.timerId);
    alert("Game over");
  }
  // #endregion Tick Management

  public update() {
    // 1. Inputs
    const keys = this.inputHandler.getKeysDown();
    let d = keys.map(e => e.direction).includes(this.snake.headDirection) ? this.snake.headDirection : (keys[0]?.direction || this.snake.headDirection);
    if (Point.equals(this.snake.headDirection, d.opposite)) {
      if (SnakeEngine.DEBUG_MODE) console.warn("Ignoring 180 degree turn");
      d = this.snake.headDirection;
    }
    // 2. Update
    this.advance(d);
    // 3. Fire event
    this.onTickCompleted.fire({ engine: this });
  }

  private generatePellet() {
    const t = this.getValidSpawnLocations();
    const index = Math.round(Math.random() * t.length);
    this.pellets.push(t[index]!);
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  public advance(d = this.currentDirection) {
    const projectedPosition = Point.add(this.snake.head, d);
    // Which pellet was eaten, if any.
    const eatenIndex = this.pellets.findIndex(e => e === projectedPosition);
    const intersection = this.snake.advance(d, eatenIndex > -1);
    if (intersection) {
      this._isGameOver = true;
      this.onGameOver.fire({ engine: this, collision: intersection });
    } else if (eatenIndex > -1) {
      // Remove the pellet
      const args: PelletEatenEvent = {
        engine:            this,
        pelletCoordinates: this.pellets.splice(eatenIndex, 1)[0]!,
        snakeLength:       this.snake.snakeLength,
      };
      // Then make the new one
      this.generatePellet();
      // Then fire the event
      this.onPelletEaten.fire(args);
    }
  }
}
export {
  SnakeEngine
};
