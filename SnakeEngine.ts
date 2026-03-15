import { SnakeEvent, type GameOverEvent, type GameStateEvent, type PelletEatenEvent } from "./Events";
import { DebugInputHandler, type IInputHandler } from "./InputHandler";
import { Direction, Point, RectInt as Rect } from "./Point2d";
import Snake from "./Snake";
import { EngineConfig, randomIndex, type IEngineConfig, type IGridObjectConfig } from "./Types";
import { DebugLevel } from "./DebugLevel";

class SnakeEngine {
  public static debugLevel = DebugLevel.LOG;

  // #region Events
  public readonly onGameOver = new SnakeEvent<GameOverEvent>();
  public readonly onGameWon = new SnakeEvent<GameStateEvent>();
  public readonly onPelletEaten = new SnakeEvent<PelletEatenEvent>();
  public readonly onTickCompleted = new SnakeEvent<GameStateEvent>();
  // #endregion Events

  // #region Game State
  private timestamp?: number;

  private _isGameOver = false;
  public get isGameOver(): boolean { return this._isGameOver; }
  // #endregion Game State

  private obstacles: Point[] = [];
  private pellets:   Point[] = [];
  public get currPellets() { return [...this.pellets]; }
  public getValidSpawnLocations() {
    const ret: Point[] = [];
    const lineSegments = this.snake.segments;
    for (let x = this.playfieldRect.xMin; x <= this.playfieldRect.xMax; x++) {
      for (let y = this.playfieldRect.yMin; y <= this.playfieldRect.yMax; y++) {
        const p = new Point(x, y);
        if (!p.included(this.pellets)
          && !p.included(this.obstacles)
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
  private _snake!:               Snake;
  public get snake() { return this._snake; }

  constructor(
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
    public readonly inputHandler: IInputHandler = new DebugInputHandler(),
  ) {
    this.playfieldRect = Rect.fromDimensionsAndMin(config.gridWidth, config.gridHeight);
    SnakeEngine.debugLevel.print(DebugLevel.INFO, "Config: %o\nPlayfield: %o", config, this.playfieldRect);

    this.initGame();
  }

  /**
   * Initialize the given grid object array with the given config.
   * @param config The configuration to use
   * @param objArray The array to add the generated points to; WILL BE MUTATED
   * @param validPoints The current array of valid points; WILL BE MUTATED
   * @param [clearArray=true] Empty `objArray` before adding new points?
   */
  private initPointObjectArray(
    config: IGridObjectConfig,
    objArray: Point[],
    validPoints: Point[],
    clearArray = true,
  ) {
    if (clearArray) objArray.splice(0);
    if (typeof config.startingObjs === "number") {
      const max = Math.min(validPoints.length, config.startingObjs);
      for (let i = 0; i < max; i++) {
        const index = Math.round(Math.random() * validPoints.length);
        objArray.push(validPoints[index]!);
        validPoints.splice(index, 1);
      }
    } else objArray.push(...config.startingObjs.reduce<Point[]>((acc, e) => {
      const v = Point.fromIPoint2d(e), i = Point.indexIn(v, validPoints);
      if (i >= 0) {
        acc.push(v);
        validPoints.splice(i, 1);
      } else {
        SnakeEngine.debugLevel.print(DebugLevel.WARN, "Config includes invalid point; ignoring invalid point.\n\tvalidPoints: %o\n\tconfig: %o\n\tinvalidPoint: %o", validPoints, config, v);
      }
      return acc;
    }, []));
  }

  public initGame() {
    this._snake = Snake.fromPreferences(this.config, this.playfieldRect);
    this._isGameOver = false;
    const t = this.getValidSpawnLocations();
    this.initPointObjectArray(this.config.pelletConfig, this.pellets, t);
    this.initPointObjectArray(this.config.obstacleConfig, this.obstacles, t);
  }

  // #region Tick Management
  private timerId?: number;
  startGame() {
    if (this.timerId) return;
    SnakeEngine.debugLevel.do(
      DebugLevel.DEBUG,
      () => document.onkeyup = e => this.playOnSpaceBar(e),
      () => this.timerId = window.setInterval(() => this.update(), this.config.millisecondsPerUpdate),
    );
    this.onGameOver.add(_ => this.endGame());
  }

  playOnSpaceBar(e: KeyboardEvent) { if (e.key === " ") this.update(); }

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

  private lastUpdate = -1;
  public update() {
    if (this.lastUpdate < 0) {
      SnakeEngine.debugLevel.print(DebugLevel.INFO, "first update at %s", this.lastUpdate = performance.now());
    } else {
      const prior = this.lastUpdate;
      this.lastUpdate = performance.now();
      SnakeEngine.debugLevel.print(DebugLevel.INFO, "Delta: %s", this.lastUpdate - prior);
    }
    // 1. Inputs
    const keys = this.inputHandler.getKeysDown();
    this.inputHandler.resetState();
    let d = Point.included(this.snake.headDirection, keys.map(e => e.direction)) ? this.snake.headDirection : (keys[0]?.direction || this.snake.headDirection);
    if (Point.equals(this.snake.headDirection, d.opposite)) {
      SnakeEngine.debugLevel.print(DebugLevel.WARN, "Ignoring 180 degree turn");
      d = this.snake.headDirection;
    }
    // 2. Update
    this.advance(d);
    // 3. Fire event
    this.onTickCompleted.fire({ engine: this });
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  public advance(d = this.currentDirection) {
    const projectedPosition = Point.add(this.snake.head, d);
    // Which pellet was eaten, if any.
    const eatenIndex = this.pellets.findIndex(e => e.equals(projectedPosition));
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
      const emptySpaces = this.getValidSpawnLocations(),
            gameWon = emptySpaces.length < 1;
      // Then make the new one
      if (!gameWon && this.pellets.length < this.config.pelletConfig.maxObjs) {
        const newPellet = emptySpaces[randomIndex(emptySpaces)]!;
        this.pellets.push(newPellet);
        args.newPellets = [newPellet];
      }
      // Then fire the event
      this.onPelletEaten.fire(args);
      if (gameWon) this.onGameWon.fire({ engine: this });
    }
  }
}
export {
  SnakeEngine
};
