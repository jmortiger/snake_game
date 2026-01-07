import { Point, Rect, Point2d, Direction, Axis } from "./Point2d";
import type { SnakeEngine } from "./SnakeEngine";
import { WallBehavior } from "./Types";

class Snake {
  private _snakeLength: number;
  public get snakeLength(): number { return this._snakeLength; }

  private constructor(public readonly engine: SnakeEngine, startingNodes: Point[]) {
    this._lastDirection = engine.config.startingDirection;
    this._snakeLength = engine.config.startingLength!;
    this._snakeNodes = startingNodes;
  }

  public static fromNodes(engine: SnakeEngine, startingNodes: Point[]) {
    return new Snake(engine, startingNodes);
  }

  public static fromPreferences(engine: SnakeEngine, playfield: Rect) {
    // const direction = Point2d.fromIPoint2d(engine.config.startingDirection.opposite);
    // throw new Error("`Snake.fromPreferences` is unfinished");
    console.warn("`Snake.fromPreferences` is unfinished");
    // if (!playfield.intersects(direction)) {
    //   // return
    // }
    // const nodes = [playfield.wrap(new Point(0, 0))]
    const nodes = [new Point(engine.config.startingLength!, 0), new Point(0, 0)];

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
    switch (this.engine.config.wallBehavior) {
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
export default Snake;
