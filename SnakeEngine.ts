import { SnakeEvent } from "./Events";
import { InputHandler, type IInputHandler } from "./InputHandler";
import { Axis, Direction, Point, Point2d, Rect } from "./Point2d";

/**
 * Defines how the snake reacts when moving into the bounds of the play area.
 */
enum WallBehavior {
  endGame,
  wrap,
}
type EngineConfig = {
  startingDirection: Direction;
  startingLength?: number;
  wallBehavior: WallBehavior;
  startingPellets: number;
  maxPellets: number;
  millisecondsPerUpdate: number;
  startingNodes?: Point[];
};
interface IEngineConfig {
  startingDirection: Direction;
  startingLength?: number;
  wallBehavior: WallBehavior;
  startingPellets: number;
  maxPellets: number;
  millisecondsPerUpdate: number;
  startingNodes?: Point[];
};

class Runner {
  private requestId?: number;
  private initialTime?: number;
  private priorTime?: number;
  private timeSinceLastUpdate?: number;

  constructor(private engine: SnakeEngine, public onUpdate?: () => void, public onInit?: () => void, public onStop?: () => void) {}

  init() {
    if (this.onInit) {
      this.onInit();
      return;
    }
    this.engine.initGame();
    // this.requestId = requestAnimationFrame(this.onUpdate || (e => this.update));
    setInterval(this.onUpdate || (() => this.update()), this.engine._config.millisecondsPerUpdate);
  }

  update() {
    this.engine.advance();
  }
}
interface GameStateEvent {
  engine: SnakeEngine;
}
interface GameOverEvent extends GameStateEvent {
  collision: Point[];
}
interface PelletEatenEvent extends GameStateEvent {
  /** The length of the snake after the pellet has been eaten. */
  snakeLength: number;
  pelletCoordinates: Point;
}
class Snake {
  private _snakeLength: number;
  public get snakeLength(): number { return this._snakeLength; }

  private constructor(public readonly engine: SnakeEngine, startingNodes: Point[]) {
    this._lastDirection = engine._config.startingDirection;
    this._snakeLength = engine._config.startingLength!;
    this._snakeNodes = startingNodes;
  }

  public static fromNodes(engine: SnakeEngine, startingNodes: Point[]) {
    return new Snake(engine, startingNodes);
  }

  public static fromPreferences(engine: SnakeEngine, playfield: Rect) {
    const direction = Point2d.fromIPoint2d(engine._config.startingDirection.opposite);
    if (!playfield.intersects(direction)) {
      throw new Error("`Snake.fromPreferences` is unfinished");
      // return
    }
    const nodes = [playfield.wrap(new Point(0, 0)), ]

    return new Snake(engine, nodes);
  }

  private _lastDirection: Direction;
  public get lastDirection(): Direction { return this._lastDirection; }

  private readonly _snakeNodes: Point[] = [];
  // #region Accessors
  public get head() { return this._snakeNodes[0]!; }
  public get tail() { return this._snakeNodes.at(-1)!; }
  public get bodyTurns() { return this._snakeNodes.slice(1, this._snakeNodes.length - 2); }

  public get filledNodes(): Point[] {
    return this._snakeNodes.reduce((acc, c) => {
      /** The previous point */
      const p = acc.at(-1)!;
      const deltaAxis = p.x === c.x ? Axis.y : Axis.x;
      const [pDeltaAxis, cDeltaAxis] = [p.getAxis(deltaAxis), c.getAxis(deltaAxis)];
      const { from, to } = (pDeltaAxis > cDeltaAxis) ? { from: cDeltaAxis, to: pDeltaAxis } : { from: pDeltaAxis, to: cDeltaAxis };
      for (let i = from; i <= to; i++) {
        const newPoint = new Point(c.x, c.y);
        newPoint.setAxis(deltaAxis, i);
        acc.push(newPoint);
      }
      return acc;
    }, [this._snakeNodes[0]] as Point[]);
  }

  public get segments(): Array<Point[]> {
    const t = this._snakeNodes.reduce((acc, e) => {
      if (acc[0]) acc.at(-1)!.push(e);
      acc.push([e]);
      return acc;
    }, [] as Array<Point[]>);
    t.pop();
    return t;
  }

  public get facingDirections(): Direction[] {
    return this._snakeNodes.map((e, i) => {
      if (i === 0) return this.lastDirection;
      return Direction.fromCardinalDisplacement(this._snakeNodes[i - 1]!, e)!;
    });
  }

  public get tailDirection(): Direction {
    return Direction.fromCardinalDisplacement(this._snakeNodes.at(-2)!, this.tail)!;
  }
  // #endregion Accessors

  /**
   *
   * @param d
   * @param [ignoreFirstSeg=false] Should the first segment be ignored for collision detection with self?
   * @returns A falsy value if the head was successfully updated, a truthy value if the snake died.
   */
  public updateHead(d: Direction, ignoreFirstSeg = false) {
    const projectedPosition = Point.add(this.head, d);
    let intersection: Point[] | undefined | false = false/* , didWrap = false */;
    switch (this.engine._config.wallBehavior) {
      case WallBehavior.wrap:
        throw new Error("Wrapping not implemented");
      case WallBehavior.endGame:
        intersection = this.engine.playfieldRect.findIntersection(projectedPosition);
        break;
    }
    intersection ||= (!ignoreFirstSeg
      ? this.segments
      : this.segments.slice(1))
      .find(e => projectedPosition.intersects(e[0]!, e[1]!));
    if (intersection) return intersection;
    this.head.x = projectedPosition.x;
    this.head.y = projectedPosition.y;
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  public advance(d: Direction, grow = false) {
    let addedExtraTurn = false;
    // const projectedPosition = Point.add(this.head, d);
    // Which pellet was eaten, if any.
    // const eatenIndex = this.pellets.findIndex(e => e === projectedPosition);
    // Handle the tail first so you can move the head there.
    // If a pellet wasn't eaten...
    // if (eatenIndex === -1) {
    if (!grow) {
      // ...& the tail is 1 tile away from the next turn...
      if (Point.subtract(this.tail, this._snakeNodes.at(-2)!).magnitude() === 1) {
        // ...remove the tail
        this._snakeNodes.pop();
      } else { // Otherwise, slide the tail 1 unit in the direction it's going.
        this.tail.add(this.tailDirection);
      }
    } else {
      // ...otherwise, leave the tail where it is & increment the length count.
      this._snakeLength++;
    }
    // If not going straight, add a new turn
    if (d !== this.lastDirection) {
      this._snakeNodes.unshift(new Point(this.head.x, this.head.y));
      addedExtraTurn = true;
    }

    return this.updateHead(d, addedExtraTurn);
    // const intersection = this.updateHead(d, addedExtraTurn);
    // if (intersection) {
    //   this._isGameOver = true;
    //   this.onGameOver.fire({ engine: this, collision: intersection });
    // } else if (eatenIndex > -1) {
    //   const args: PelletEatenEvent = {
    //     engine: this,
    //     pelletCoordinates: this.pellets.splice(eatenIndex, 1)[0]!,
    //     snakeLength: this.snakeLength,
    //   };
    //   this.generatePellet();
    //   this.onPelletEaten.fire(args);
    // }
  }
}
class SnakeEngine {
  static readonly defaultConfig: EngineConfig = {
    startingDirection: Direction.up,
    startingLength: 5,
    wallBehavior: WallBehavior.endGame,
    startingPellets: 1,
    maxPellets: 1,
    millisecondsPerUpdate: 1 / 60,
    startingNodes: undefined,
  };

  public inputHandler: IInputHandler = new InputHandler();

  // #region Events
  public readonly onGameOver = new SnakeEvent<GameOverEvent>();
  public readonly onPelletEaten = new SnakeEvent<GameStateEvent>();
  // #endregion Events

  // #region Game State
  private timestamp?: number;

  private _isGameOver: boolean;
  public get isGameOver(): boolean { return this._isGameOver; }
  // #endregion Game State

  private pellets: Point[] = [];
  public getValidPelletLocations() {
    const ret: Point[] = [];
    const lineSegments = this.snake.segments;
    for (let x = this.playfieldRect.xMin; x <= this.playfieldRect.xMax; x++) {
      for (let y = this.playfieldRect.yMin; y <= this.playfieldRect.yMax; y++) {
        const p = new Point(x, y);
        if (!this.pellets.includes(p) && !lineSegments.find(e => p.intersects(e[0]!, e[1]!)))
          ret.push(p);
      }
    }
    return ret;
  }

  public readonly playfieldRect: Rect;

  // #region Playfield State
  public currentDirection!: Direction;
  public snake: Snake;
  // #endregion Accessors
  // #endregion Playfield State

  constructor(
    width: number,
    height: number,
    public readonly _config: IEngineConfig = SnakeEngine.defaultConfig,
  ) {
    this.playfieldRect = Rect.fromDimensionsAndMin(width, height);
    // this.snake = Snake.fromPreferences(
    //   _config.startingDirection || (_config.startingDirection = SnakeEngine.defaultConfig.startingDirection),
    //   _config.startingLength || (_config.startingLength = SnakeEngine.defaultConfig.startingLength!),
    //   this.playfieldRect,
    // );
    this.snake = Snake.fromPreferences(
      this,
      // _config.startingDirection || (_config.startingDirection = SnakeEngine.defaultConfig.startingDirection),
      // _config.startingLength || (_config.startingLength = SnakeEngine.defaultConfig.startingLength!),
      this.playfieldRect,
    );
    // this._lastDirection = _config.startingDirection || (_config.startingDirection = SnakeEngine.defaultConfig.startingDirection);
    // this._snakeLength = _config.startingLength || (_config.startingLength = SnakeEngine.defaultConfig.startingLength!);
    // TODO: Start with 2 points in _turn for head & tail
    this._isGameOver = false;

    this.initGame();
  }

  public initGame() {
    /* this._snakeNodes.push(new Point(0, 0));
    this._snakeNodes.push(new Point(this._snakeLength, 0)); */
    const t = this.getValidPelletLocations();
    const max = Math.min(t.length, this._config.startingPellets);
    for (let i = 0; i < max; i++) {
      const index = Math.round(Math.random() * t.length);
      this.pellets.push(t[index]!);
      t.splice(Math.round(Math.random() * t.length), 1);
    }

    // requestAnimationFrame(this.update);
  }

  public update() {
    // 1. Inputs
    const keys = this.inputHandler.getKeysDown();
    const d = keys.map(e => e.direction).includes(this.snake.lastDirection) ? this.snake.lastDirection : (keys[0]?.direction || this.snake.lastDirection);
    // 2. Update
    this.advance(d);
  }

  private generatePellet() {
    const t = this.getValidPelletLocations();
    const index = Math.round(Math.random() * t.length);
    this.pellets.push(t[index]!);
  }

  // /**
  //  *
  //  * @param d
  //  * @param [ignoreFirstSeg=false] Should the first segment be ignored for collision detection with self?
  //  * @returns A falsy value if the head was successfully updated, a truthy value if the snake died.
  //  */
  // public updateHead(d: Direction, ignoreFirstSeg = false) {
  //   const projectedPosition = Point.add(this.head, d);
  //   let intersection: Point[] | undefined | false = false/* , didWrap = false */;
  //   switch (this._config.wallBehavior) {
  //     case WallBehavior.wrap:
  //       throw new Error("Wrapping not implemented");
  //     case WallBehavior.endGame:
  //       intersection = this.playfieldRect.findIntersection(projectedPosition);
  //       break;
  //   }
  //   intersection ||= (!ignoreFirstSeg
  //     ? this.segments
  //     : this.segments.slice(1)).find(e => projectedPosition.intersects(e[0]!, e[1]!));
  //   if (intersection) return intersection;
  //   this.head.x = projectedPosition.x;
  //   this.head.y = projectedPosition.y;
  // }

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
      const args: PelletEatenEvent = {
        engine: this,
        pelletCoordinates: this.pellets.splice(eatenIndex, 1)[0]!,
        snakeLength: this.snake.snakeLength,
      };
      this.generatePellet();
      this.onPelletEaten.fire(args);
    }
  }
}
export {
  SnakeEngine
};
export type {
  EngineConfig,
  IEngineConfig
};
