import { SnakeEvent, type GameOverEvent, type GameStateEvent, type PelletEatenEvent, type TickEvent } from "./Events";
import { InputHandler, type IInputHandler } from "./InputHandler";
import { Direction, Point, RectInt as Rect } from "./Point2d";
import Snake from "./Snake";
import { EngineConfig, randomIndex, type IEngineConfig, type IGridObjectConfig } from "./Types";
import { DebugLevel } from "./DebugLevel";

export default class SnakeEngine {
  public static debugLevel = DebugLevel.LOG;

  // #region Events
  public readonly onGameOver = new SnakeEvent<GameOverEvent>();
  public readonly onGameWon = new SnakeEvent<GameStateEvent>();
  public readonly onGamePaused = new SnakeEvent<GameStateEvent>();
  public readonly onGameResumed = new SnakeEvent<GameStateEvent>();
  public readonly onPelletEaten = new SnakeEvent<PelletEatenEvent>();
  public readonly onTickCompleted = new SnakeEvent<TickEvent>();
  public readonly onTickStarted = new SnakeEvent<TickEvent>();
  // #endregion Events

  // #region Game State
  private _isGameOver = false;
  public get isGameOver(): boolean { return this._isGameOver; }
  private _isGamePaused = true;
  public get isGamePaused(): boolean { return this._isGamePaused; }
  private _tickCount = 0;
  private _pelletsEaten = 0;
  private lastUpdateTimestamp = -1;
  private firstUpdateTimestamp = -1;
  private inGameTime = 0;
  private movesSinceLastPellet = 0;
  // #endregion Game State

  private pellets:   Point[] = [];
  public get currPellets() { return [...this.pellets]; }
  private obstacles: Point[] = [];
  public get currObstacles() { return [...this.obstacles]; }
  public getValidSpawnLocations() {
    const ret: Point[] = [];
    const nodes = this.snake.filledNodes;
    for (let x = this.playfieldRect.xMin; x <= this.playfieldRect.xMax; x++) {
      for (let y = this.playfieldRect.yMin; y <= this.playfieldRect.yMax; y++) {
        const p = new Point(x, y);
        if (!p.included(this.pellets)
          && !p.included(this.obstacles)
          && (!(nodes?.length) || !nodes.find(e => p.equals(e))))
          ret.push(p);
      }
    }
    return ret;
  }

  public readonly playfieldRect: Rect;
  public get currentDirection(): Direction { return this.snake.headDirection; }
  private _snake!:               Snake;
  public get snake() { return this._snake; }

  constructor(
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
    public readonly inputHandler: IInputHandler = new InputHandler(),
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
        const index = Math.floor(Math.random() * validPoints.length);
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

    this.timerId = undefined;
    this._isGameOver = false;
    this._isGamePaused = true;
    this._tickCount = this._pelletsEaten = 0;
    this.lastUpdateTimestamp = this.firstUpdateTimestamp = -1;
    this.inGameTime = 0;
    this.movesSinceLastPellet = 0;

    const t = this.getValidSpawnLocations();
    this.initPointObjectArray(this.config.pelletConfig, this.pellets, t);
    this.initPointObjectArray(this.config.obstacleConfig, this.obstacles, t);
    this.onGameOver.add(_ => this.endGame());
    this.onGameWon.add(_ => this.endGame());
  }

  // #region Tick Management
  private timerId?: number;
  startGame() { this.resumeGame(); }

  resumeGame() {
    if (!this._isGamePaused && this.timerId) return;
    this._isGamePaused = false;
    SnakeEngine.debugLevel.do(
      DebugLevel.DEBUG,
      () => document.onkeyup = e => this.playOnSpaceBar(e),
      () => this.timerId = window.setInterval(() => this.update(), this.config.millisecondsPerUpdate),
    );
    this.lastUpdateTimestamp = -1;
    this.onGameResumed.fire({ engine: this });
  }

  playOnSpaceBar(e: KeyboardEvent) { if (e.key === " ") this.update(); }

  public pauseGame() {
    if (!this.timerId) return;
    window.clearInterval(this.timerId);
    this.timerId = undefined;

    this._isGamePaused = true;
    this.onGamePaused.fire({ engine: this });
  }

  endGame() { window.clearInterval(this.timerId); }
  // #endregion Tick Management

  // #region Updating
  public update() {
    if (this.lastUpdateTimestamp < 0) {
      if (this.firstUpdateTimestamp < 0) {
        this.firstUpdateTimestamp = this.lastUpdateTimestamp = performance.now();
        SnakeEngine.debugLevel.print(DebugLevel.LOG, "First update at %s", this.lastUpdateTimestamp);
      } else {
        this.lastUpdateTimestamp = performance.now();
        SnakeEngine.debugLevel.print(DebugLevel.LOG, "Unpaused at %s", this.lastUpdateTimestamp);
      }
    } else {
      const prior = this.lastUpdateTimestamp, deltaTime = (this.lastUpdateTimestamp = performance.now()) - prior;
      SnakeEngine.debugLevel.print(DebugLevel.INFO, "Delta: %s", deltaTime);
    }
    this.onTickStarted.fire({ engine: this, tickCount: ++this._tickCount });
    // 1. Inputs
    const keys = this.inputHandler.getKeysDown();
    this.inputHandler.resetState();
    // TODO: Prioritize current direction?
    let d = Point.included(this.snake.headDirection, keys.map(e => e.direction)) ? this.snake.headDirection : (keys[0]?.direction || this.snake.headDirection);
    if (Point.equals(this.snake.headDirection, d.opposite)) {
      SnakeEngine.debugLevel.print(DebugLevel.WARN, "Ignoring 180 degree turn");
      d = this.snake.headDirection;
    }
    // 2. Update
    this.advance(d);
    // 3. Fire event
    this.onTickCompleted.fire({ engine: this, tickCount: this._tickCount });
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  public advance(d = this.currentDirection) {
    const projectedPosition = Point.add(this.snake.head, d);
    const eatenIndex = this.pellets.findIndex(e => e.equals(projectedPosition));
    const intersection = this.obstacles.find(e => e.equals(projectedPosition)) ?? this.snake.advance(d, eatenIndex > -1);
    if (intersection) {
      this._isGameOver = true;
      this.onGameOver.fire({ engine: this, collision: intersection });
    } else if (eatenIndex > -1) {
      // Remove the pellet
      const args: PelletEatenEvent = {
        engine:            this,
        pelletCoordinates: this.pellets.splice(eatenIndex, 1)[0]!,
        snakeLength:       this.snake.snakeLength,
        totalEaten:        ++this._pelletsEaten,
        movesSinceLast:    this.movesSinceLastPellet,
      };
      this.movesSinceLastPellet = 0;
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
    } else {
      this.movesSinceLastPellet++;
    }
  }
  // #endregion Updating
}

export {
  SnakeEngine
};
