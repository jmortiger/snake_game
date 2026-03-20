import { SnakeEvent, type GameLostEvent, type GameOverEvent, type GameStateEvent, type PelletEatenEvent, type TickEvent } from "./Events";
import { InputHandler, type IInputHandler } from "./InputHandler";
import { Direction, Point, RectInt as Rect } from "./Point2d";
import Snake from "./Snake";
import { EngineConfig, randomIndex, type IEngineConfig, type IGridObjectConfig } from "./Types";
import { DebugLevel } from "./DebugLevel";
import EngineDriver from "./EngineDriver";
import { html } from "./HtmlTemplate";
import type UiStat from "./UiStat";
import { bindMappedElementsToEvent } from "./UiStat";

export default class SnakeEngine implements UiStat<HTMLParagraphElement> {
  public static debugLevel = DebugLevel.LOG;

  // #region Events
  public readonly onGameOver = new SnakeEvent<GameOverEvent>();
  public readonly onGameLost = new SnakeEvent<GameLostEvent>();
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
  private _isGameWon = false;
  public get isGameWon(): boolean { return this._isGameWon; }
  private _pelletsEaten = 0;
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

    this._isGameOver = this._isGameWon = false;
    this._tickCount = this._pelletsEaten = 0;
    this.lastUpdateTimestamp = this.firstUpdateTimestamp = -1;
    this.inGameTime = 0;
    this.movesSinceLastPellet = 0;

    const t = this.getValidSpawnLocations();
    this.initPointObjectArray(this.config.pelletConfig, this.pellets, t);
    this.initPointObjectArray(this.config.obstacleConfig, this.obstacles, t);
  }

  // #region Game State Management
  public get isGamePaused(): boolean { return !this.engineDriver.isDriving; }
  public readonly engineDriver = new EngineDriver(this);

  public startGame() { this.resumeGame(); }

  public resumeGame() {
    if (!this.engineDriver.startDriving()) return;

    this.lastUpdateTimestamp = performance.now();
    SnakeEngine.debugLevel.print(DebugLevel.LOG, "Unpaused at %s", this.lastUpdateTimestamp);
    this.onGameResumed.fire({ engine: this });
  }

  public pauseGame() {
    if (!this.engineDriver.stopDriving()) return;

    this.inGameTime += this.updateLastTimestamp();
    SnakeEngine.debugLevel.print(DebugLevel.LOG, "Paused at %s", this.lastUpdateTimestamp);
    this.onGamePaused.fire({ engine: this });
  }

  transferToNewInstance(other: SnakeEngine) {
    other.onGameLost.add(...this.onGameLost.clear());
    other.onGameOver.add(...this.onGameOver.clear());
    other.onGamePaused.add(...this.onGamePaused.clear());
    other.onGameResumed.add(...this.onGameResumed.clear());
    other.onGameWon.add(...this.onGameWon.clear());
    other.onPelletEaten.add(...this.onPelletEaten.clear());
    other.onTickCompleted.add(...this.onTickCompleted.clear());
    other.onTickStarted.add(...this.onTickStarted.clear());
    // TODO: End updates
    // TODO: Transfer remaining state.
  }

  private endGame(reason?: "won" | "other" | Point[] | Point) {
    this.engineDriver.stopDriving();
    this._isGameOver = true;
    if (!reason) return;
    let args: GameOverEvent | GameLostEvent = { engine: this, reason: typeof reason === "string" ? reason : "lost" };
    switch (reason) {
    case "other":
      break;

    case "won":
      this._isGameWon = true;
      this.onGameWon.fire(args);
      break;

    default:
      args = {
        ...args,
        collision: reason,
      };
      this.onGameLost.fire(args);
      break;
    }
    this.onGameOver.fire(args);
  }
  // #endregion Game State Management

  // #region Updating
  private _tickCount = 0;
  private penultimateUpdateTimestamp = -1;
  private lastUpdateTimestamp = -1;
  private firstUpdateTimestamp = -1;
  private inGameTime = 0;
  private get currentOverallTime() { return performance.now() - this.firstUpdateTimestamp; }
  /**
   * Updates `lastUpdateTimestamp`.
   * @param timestamp The reference time to update to.
   * @returns The delta between the prior & current values of `lastUpdateTimestamp`.
   */
  private updateLastTimestamp(timestamp = performance.now()) { return -this.lastUpdateTimestamp + (this.lastUpdateTimestamp = timestamp); }
  public update() {
    if (this.lastUpdateTimestamp < 0) {
      if (this.firstUpdateTimestamp < 0) {
        this.firstUpdateTimestamp = this.lastUpdateTimestamp = performance.now();
        SnakeEngine.debugLevel.print(DebugLevel.LOG, "First update at %s", this.lastUpdateTimestamp);
      }
    }
    const deltaTime = this.updateLastTimestamp();
    this.inGameTime += deltaTime;
    SnakeEngine.debugLevel.print(DebugLevel.INFO, "Delta: %s; time in game: %s", deltaTime, this.inGameTime);
    const args: TickEvent = { engine: this, tickCount: ++this._tickCount, inGameTime: this.inGameTime, timeOverall: this.currentOverallTime };
    this.onTickStarted.fire(args);
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
    this.onTickCompleted.fire({ ...args, timeOverall: this.currentOverallTime });
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  private advance(d = this.currentDirection) {
    const projectedPosition = this.snake.findProjectedHeadPosition(d, this.playfieldRect);
    const eatenIndex = this.pellets.findIndex(e => e.equals(projectedPosition));
    const intersection = this.obstacles.find(e => e.equals(projectedPosition)) ?? this.snake.advance(d, eatenIndex > -1);
    if (intersection) {
      this.endGame(intersection);
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
      const emptySpaces = this.getValidSpawnLocations();
      if (emptySpaces.length < 1) {
        this.onPelletEaten.fire(args);
        this.endGame("won");
        return;
      } else if (this.pellets.length < this.config.pelletConfig.maxObjs) {
        const newPellet = emptySpaces[randomIndex(emptySpaces)]!;
        this.pellets.push(newPellet);
        args.newPellets = [newPellet];
      }
      this.onPelletEaten.fire(args);
    } else {
      this.movesSinceLastPellet++;
    }
  }
  // #endregion Updating

  public renderStats() {
    const initTickArgs: TickEvent = { engine: this, tickCount: this._tickCount, inGameTime: this.inGameTime, timeOverall: this.currentOverallTime };
    const elements = bindMappedElementsToEvent(
      this.onTickCompleted,
      e => ({
        tickCount:   html<HTMLParagraphElement>`<p>Turns Completed: ${e.tickCount}</b></p>`,
        inGameTime:  html<HTMLParagraphElement>`<p>In Game Time: ${e.inGameTime}</b></p>`,
        timeOverall: html<HTMLParagraphElement>`<p>Overall Time: ${e.timeOverall}</b></p>`,
      }),
      initTickArgs,
    );
    return html`
    <p id="engine-stats">
      ${elements.tickCount}
      ${elements.inGameTime}
      ${elements.timeOverall}
    </p>
    ` as HTMLParagraphElement;
  }
}

export {
  SnakeEngine
};
