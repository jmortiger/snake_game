import { Point, RectInt as Rect, Point2d, Direction, Axis } from "./Point2d";
import { SnakeEngine } from "./SnakeEngine";
import { WallBehavior } from "./Types";

class Snake {
  private _snakeLength: number;
  public get snakeLength(): number { return this._snakeLength; }

  private constructor(public readonly engine: SnakeEngine, startingNodes: Point[]) {
    this._lastDirection = engine.config.startingDirection;
    this._snakeLength = engine.config.startingLength!;
    this._snakeNodes = startingNodes.slice();
  }

  public static fromNodes(engine: SnakeEngine, startingNodes: Point[]) {
    return new Snake(engine, startingNodes);
  }

  public static fromPreferences(engine: SnakeEngine, playfield: Rect) {
    const validNodes = engine.getValidSpawnLocations().filter(e => e.x > 0 && e.x < engine.playfieldRect.xMax - 1 && e.y > 0 && e.y < engine.playfieldRect.yMax - 1), nodes: Point[] = [];
    let i = Math.floor(Math.random() * validNodes.length);
    nodes.push(...validNodes.splice(i, 1));
    for (i = 1; i < engine.config.startingLength!; i++) {
      const prior = nodes.at(-1)!,
            options = Direction.directions
              .map(e => Point.add(prior, e))
              .map(e => validNodes.findIndex(e1 => e.equals(e1)))
              .filter(e => e !== -1); // .filter(e => !engine.playfieldRect.intersects(e));
      nodes.push(...validNodes.splice(options[Math.floor(Math.random() * options.length)]!, 1));
      // If it's a straight line of 3 or more nodes, then ditch the middle one.
      if (i + 1 >= 3 && nodes.at(-1)!.matchingAxes(nodes.at(-2)!)[0] == nodes.at(-2)!.matchingAxes(nodes.at(-3)!)[0]) {
        nodes.splice(nodes.length - 2, 1);
      }
    }
    /* // const direction = Point2d.fromIPoint2d(engine.config.startingDirection.opposite);
    // throw new Error("`Snake.fromPreferences` is unfinished");
    console.warn("`Snake.fromPreferences` is unfinished");
    // if (!playfield.intersects(direction)) {
    //   // return
    // }
    // const nodes = [playfield.wrap(new Point(0, 0))]
    const nodes = [new Point(engine.config.startingLength!, 0), new Point(0, 0)]; */

    this.hasInvalidState(nodes);
    if (SnakeEngine.DEBUG_MODE) console.info("Start (%s): %o", nodes.length, nodes);
    return new Snake(engine, nodes);
  }

  private _lastDirection: Direction;
  public get lastDirection(): Direction { return this._lastDirection; }

  private readonly _snakeNodes: Point[] = [];
  // #region Accessors
  public get head() { return this._snakeNodes[0]!; }
  public get tail() { return this._snakeNodes.at(-1)!; }
  public get bodyTurns() { return this._snakeNodes.slice(1, this._snakeNodes.length - 2); }
  public get snakeNodesDebug() { return this._snakeNodes.slice(); }

  public get filledNodes(): Point[] {
    // return this._snakeNodes.reduce((acc, c) => {
    const rv = this._snakeNodes.reduce((acc, c) => {
      /** The previous point */
      const p = acc.at(-1)!;
      // debugger;
      if (p.equals(c)) return acc;
      const deltaAxis = p.x === c.x ? (p.y === c.y ? undefined : Axis.y) : Axis.x;
      if (deltaAxis === undefined) return acc;
      const [pDeltaAxis, cDeltaAxis] = [p.getAxis(deltaAxis), c.getAxis(deltaAxis)];
      const { from, to } = (pDeltaAxis > cDeltaAxis) ? { from: cDeltaAxis, to: pDeltaAxis } : { from: pDeltaAxis, to: cDeltaAxis };
      for (let i = from; i <= to; i++) {
        const newPoint = new Point(c.x, c.y);
        newPoint.setAxis(deltaAxis, i);
        if (!p.equals(newPoint))
          acc.push(newPoint);
      }
      return acc;
    }, [this._snakeNodes[0]] as Point[]);
    if (rv.length !== this.snakeLength) debugger;
    return rv;
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
    if (Direction.fromCardinalDisplacement(this._snakeNodes.at(-2)!, this.tail) === undefined) debugger;
    return Direction.fromCardinalDisplacement(this._snakeNodes.at(-2)!, this.tail)!;
  }

  public get headDirection(): Direction {
    return Direction.fromCardinalDisplacement(this.head, this._snakeNodes[1]!)!;
  }

  public get hasInvalidState(): boolean {
    // return this._snakeNodes.filter((e, i) => i + 1 === this._snakeNodes.length || e.matchingAxes(this._snakeNodes[i + 1]!).length > 0).length !== this._snakeNodes.length;
    return false;
  }

  public checkInvalidState() {
    if (SnakeEngine.DEBUG_MODE && this.hasInvalidState) debugger;
  }

  public static hasInvalidState(nodes: Point[]) {
    /* if (nodes.filter((e, i) => i + 1 === nodes.length || e.matchingAxes(nodes[i + 1]!).length > 0).length !== nodes.length) {
      console.warn("Invalid State");
      if (SnakeEngine.DEBUG_MODE) debugger;
      return true;
    } */
    return false;
  }
  // #endregion Accessors

  /**
   *
   * @param d
   * @param [ignoreFirstSeg=false] Should the first segment be ignored for collision detection with self?
   * @returns A falsy value if the head was successfully updated, a truthy value if the snake died.
   */
  private updateHead(d: Direction, ignoreFirstSeg = false) {
    const projectedPosition = Point.add(this.head, d);
    if (SnakeEngine.DEBUG_MODE) console.info("Current Position: %o\nProjected Position: %o\nDirection: %o", this.head, projectedPosition, d);
    let intersection: Point[] | undefined | false = false;
    switch (this.engine.config.wallBehavior) {
    case WallBehavior.wrap:
      if (SnakeEngine.DEBUG_MODE) console.info("Do wrap");
      throw new Error("Wrapping not implemented");
    case WallBehavior.endGame:
      intersection = this.engine.playfieldRect.findBorderIntersection(projectedPosition);
      if (SnakeEngine.DEBUG_MODE && intersection) console.warn("Collided with wall");
      break;
    }
    // Check if the snake intersects with itself
    intersection ||= (!ignoreFirstSeg
      ? this.segments
      : this.segments.slice(1))
      .find(e => projectedPosition.intersects(e[0]!, e[1]!));
    if (intersection) {
      if (SnakeEngine.DEBUG_MODE && intersection instanceof Array) console.warn("Collided on segment %o", intersection);
      return intersection;
    }
    this.head.x = projectedPosition.x;
    this.head.y = projectedPosition.y;
  }

  /**
   *
   * @param d The direction the snake is moving in.
   * @returns The line segment of collision if the snake collided with itself, `undefined` if it stayed alive.
   */
  public advance(d: Direction, grow = false) {
    if (SnakeEngine.DEBUG_MODE) console.log("Initial nodes (%s): %o", this._snakeNodes.length, this._snakeNodes);
    if (SnakeEngine.DEBUG_MODE) this._snakeNodes.forEach(e => console.log(e));
    let addedExtraTurn = false;
    this.checkInvalidState();
    // If a pellet wasn't eaten...
    if (!grow) {
      if (SnakeEngine.DEBUG_MODE) console.log("Not growing");
      // ...& the tail is 1 tile away from the next turn...
      if (Point.subtract(this.tail, this._snakeNodes.at(-2)!).magnitude() === 1) {
        if (SnakeEngine.DEBUG_MODE) console.log("needs to move tail");
        if (this._snakeNodes.length == 2) debugger;
        this.checkInvalidState();
        // ...remove the tail
        const oldTail = this._snakeNodes.pop()!;
        if (SnakeEngine.DEBUG_MODE) console.log(`Removed tail node { x: ${oldTail.x}, y: ${oldTail.y} }`);
      } else { // Otherwise, slide the tail 1 unit in the direction it's going.
        if (!this.tailDirection) debugger;
        if (SnakeEngine.DEBUG_MODE) console.log(`Sliding tail node ({ x: ${this.tail.x}, y: ${this.tail.y} }) towards { x: ${this.tailDirection.x}, y: ${this.tailDirection.y} }`);
        this.tail.add(this.tailDirection);
        if (SnakeEngine.DEBUG_MODE) console.log(`New tail position: { x: ${this.tail.x}, y: ${this.tail.y} }`);
      }
    } else {
      // ...otherwise, leave the tail where it is & increment the length count.
      this._snakeLength++;
    }
    // If not going straight...
    if (d !== this.lastDirection) {
      // ...add a new turn by duplicating the head so the prior head won't be updated & the new head will...
      this._snakeNodes.unshift(new Point(this.head.x, this.head.y));
      // ...ignoring the duplicated nodes when testing self collisions...
      addedExtraTurn = true;
      // ...& updating the prior direction.
      this._lastDirection = d;
    }

    // return this.updateHead(d, addedExtraTurn);
    const rv = this.updateHead(d, addedExtraTurn);
    this.checkInvalidState();
    return rv;
  }
}
export default Snake;
