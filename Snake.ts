import { Point, RectInt, Direction, Axis, type IPoint } from "./Point2d";
import { NodeGeneration, WallBehavior, type GenerationOutput, type ISnakeConfig } from "./Types";
import { DEBUG, DebugLevel, INFO, LOG, WARN } from "./DebugLevel";

/**
 * Stores all nodes
 */
class Snake {
  public static readonly DEBUG_LEVEL: DebugLevel = DebugLevel.INFO;
  private _snakeLength:               number;
  public get snakeLength(): number { return Snake.STORES_SEGMENTS_ONLY ? this._snakeLength : this._snakeNodes.length; }

  // #region Initialization
  private constructor(private readonly config: ISnakeConfig, startingNodes: Point[], private readonly playfield: RectInt) {
    this._lastDirection = Direction.fromCardinalDisplacement(startingNodes[1]!, startingNodes[0]!)!;
    this._snakeLength = this.config.startingLength!;
    this._snakeNodes = startingNodes.slice();
  }

  public static fromPreferences(config: Readonly<ISnakeConfig>, playfield: RectInt, claimedNodes?: IPoint[]) {
    if (config.startingNodes) return new Snake(config, config.startingNodes, playfield);
    if (
      !config.startingLength
      || config.startingLength > NodeGeneration.MAX_GENERATED_LENGTH
      || config.startingLength < 2
    )
      throw new Error("Invalid Config");
    let rv: GenerationOutput = { success: false, nodes: [], validNodes: [] };
    for (let i = 0; !rv.success && i < 20; i++)
      rv = NodeGeneration.generateFromSnakeConfig(config, playfield, claimedNodes);
    if (!rv.success)
      throw new Error(`Only Generated ${rv.nodes.length} of ${config.startingLength!}`);
    return new Snake(config, Snake.STORES_SEGMENTS_ONLY ? NodeGeneration.removeSurplusNodes(rv.nodes) : rv.nodes, playfield);
  }
  // #endregion Initialization

  private _lastDirection: Direction;
  public get lastDirection(): Direction { return this._lastDirection; }

  private readonly _snakeNodes: Point[] = [];
  // #region Accessors
  /** 1st node */
  public get head() { return this._snakeNodes[0]!; }
  /** Last node */
  public get tail() { return this._snakeNodes.at(-1)!; }
  /**
   * @deprecated
   * A shallow copy of `_snakeNodes`.
   */
  public get snakeNodesDebug() { return this._snakeNodes.slice(); }

  public get filledNodes(): Point[] {
    if (!Snake.STORES_SEGMENTS_ONLY) return this._snakeNodes.slice();
    const rv = this.segmentPoints.reduce((acc, c) => {
      /** The previous point */
      const p = acc.at(-1)!;
      if (p.equals(c)) return acc;
      const deltaAxis = p.x === c.x ? (p.y === c.y ? undefined : Axis.y) : Axis.x;
      if (deltaAxis === undefined) return acc;
      const [pDeltaAxis, cDeltaAxis] = [p.getAxis(deltaAxis), c.getAxis(deltaAxis)];
      for (let i = pDeltaAxis; cDeltaAxis > pDeltaAxis ? ++i <= cDeltaAxis : --i >= cDeltaAxis;) {
        const newPoint = new Point(c.x, c.y);
        newPoint.setAxis(deltaAxis, i);
        if (!p.equals(newPoint))
          acc.push(newPoint);
      }
      return acc;
    }, [this._snakeNodes[0]] as Point[]);
    if (rv.length !== this.snakeLength) {
      Snake.DEBUG_LEVEL.group(INFO, "Snake.filledNodes: Failed to add all points");
      Snake.DEBUG_LEVEL.print(DEBUG, "\tSnake Nodes: %o\n\tGenerated Nodes: %o", this._snakeNodes, rv);
      Snake.DEBUG_LEVEL.groupEnd(INFO);
      Snake.DEBUG_LEVEL.debugger(DEBUG);
    }
    return rv;
  }

  // #region Segments
  public get segmentPoints(): Point[] {
    if (Snake.STORES_SEGMENTS_ONLY) return this._snakeNodes.slice();
    return this._snakeNodes.reduce((acc, e) => {
      if (acc.length > 1 && Point.allAxisAligned(...(acc.slice(-2)!), e)) {
        acc.pop();
      }
      acc.push(e);
      return acc;
    }, [] as Point[]);
  }

  public get segments(): Array<Point[]> {
    if (!Snake.STORES_SEGMENTS_ONLY) {
      return this._snakeNodes.reduce((acc, e) => {
        if (acc.length <= 0) {
          acc = [[e]];
        } else if (acc.at(-1)!.length < 2 || Point.allAxisAligned(...(acc.at(-1)!), e)) {
          acc.at(-1)![1] = e;
        } else {
          acc.push([acc.at(-1)!.at(-1)!, e]);
        }
        return acc;
      }, [] as Array<Point[]>);
    }
    const t = this._snakeNodes.reduce((acc, e) => {
      if (acc[0]) acc.at(-1)!.push(e);
      acc.push([e]);
      return acc;
    }, [] as Array<Point[]>);
    t.pop();
    return t;
  }

  /**
   * 0: Head Node
   * 1: 2nd Node
   */
  private get headSegment() {
    if (this.segmentPoints.length < 2) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get head segment; less than 2 nodes.");
      Snake.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this.segmentPoints);
      return undefined;
    }
    return this.segmentPoints.slice(0, 2);
  }

  /**
   * 0: Penultimate Node
   * 1: Tail Node
   */
  private get tailSegment() {
    if (this.segmentPoints.length < 2) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get tail segment; less than 2 nodes.");
      Snake.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this.segmentPoints);
      return undefined;
    }
    return this.segmentPoints.slice(-2);
  }
  // #endregion Segments

  // #region Directions
  public get facingDirections(): Direction[] {
    return this.segments.map((e, i) => Snake.directionFromPoints(e, `#${i}`, this.config, this.playfield));
  }

  private static isWrappedSegment(s: Point[] | undefined, config?: ISnakeConfig) {
    if (config?.wallBehavior === WallBehavior.wrap
      && !Snake.STORES_SEGMENTS_ONLY
      && (s?.at(0) && s?.at(1) && !s![0]!.hasMagnitudeOf(1, s![1]))) {
      return true;
    }
  }

  private static directionFromPoints(s: Point[] | undefined, label: string, config?: ISnakeConfig, playfield?: RectInt) {
    if (this.isWrappedSegment(s, config)) {
      Snake.DEBUG_LEVEL.print(DebugLevel.INFO, "%o is Wrapped Segment", s);
      if (!playfield) throw new Error("Can't resolve w/o playfield");
      s![1] = playfield.unwrapRelative(new Point(s![1]!.x, s![1]!.y), s![0]!);
      Snake.DEBUG_LEVEL.print(DebugLevel.LOG, "\tResolved to: %o", s![1]);
    }
    const d = s ? Direction.fromCardinalDisplacement(s[1]!, s[0]!) : undefined;
    if (!d) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get %s direction; can't get %s %s", label.toLowerCase(), label.toLowerCase(), s ? "direction" : "segment");
      Snake.DEBUG_LEVEL.print(DEBUG, "\t%s segment: %o", label, s);
      Snake.DEBUG_LEVEL.debugger(DEBUG);
    }
    return d!;
  }

  public get headDirection(): Direction {
    return Snake.directionFromPoints(this._snakeNodes.slice(0, 2), "Head", this.config, this.playfield);
  }

  public get tailDirection(): Direction {
    return Snake.directionFromPoints(this.tailSegment, "Tail", this.config, this.playfield);
  }
  // #endregion Directions

  // #endregion Accessors

  /**
   * If defined, just screen wrapped the head, so disregard inherent direction & use this instead.
   */
  private cachedDirection: Direction | undefined;
  /**
   *
   * @param d The direction the snake is moving in.
   * @param grow Show the snake be growing?
   * @param playfield The play area; screen collisions/wrapping will not be processed if this & `Snake.playfield` are both `undefined`.
   * @returns The line segment of collision if the snake collided with itself (or the wall if in that mode), `undefined` if it stayed alive.
   */
  public advance(d: Direction, grow = false, playfield: RectInt = this.playfield) {
    Snake.DEBUG_LEVEL.group(LOG, "Snake.advance(%o, %o, %o)", d, grow, playfield);
    Snake.DEBUG_LEVEL.print(LOG, "Initial nodes (%s): %o", this._snakeNodes.length, this._snakeNodes);
    const backedUpState = this._snakeNodes.slice();
    // If a pellet wasn't eaten...
    if (!grow) {
      Snake.DEBUG_LEVEL.print(DEBUG, "Not growing; handling tail advancement");
      // ...& the tail is 1 tile away from the next turn...
      // ...or we don't solely store segments...
      if (Point.subtract(this.tail, this._snakeNodes.at(-2)!).magnitude() === 1
        || !Snake.STORES_SEGMENTS_ONLY) {
        Snake.DEBUG_LEVEL.print(DEBUG, "needs to move tail");
        if (this.segmentPoints.length == 2) Snake.DEBUG_LEVEL.debugger(DEBUG);
        // ...remove the tail
        const oldTail = this._snakeNodes.pop()!;
        Snake.DEBUG_LEVEL.print(DEBUG, "Removed tail node\nOld: %o\nNew: %o", oldTail, this.tail);
      } else { // Otherwise, slide the tail 1 unit in the direction it's going.
        if (!this.tailDirection) Snake.DEBUG_LEVEL.debugger(DEBUG);
        Snake.DEBUG_LEVEL.print(DEBUG, "Sliding tail node (%o) towards %o", this.tail, this.tailDirection);
        this.tail.add(this.tailDirection);
        Snake.DEBUG_LEVEL.print(DEBUG, "New tail position: %o", this.tail);
      }
    } else {
      // ...otherwise, leave the tail where it is & increment the length count.
      this._snakeLength++;
    }
    let addedExtraTurn = false;
    // If not going straight...
    if (d !== this.lastDirection) {
      if (Snake.STORES_SEGMENTS_ONLY) {
        // ...add a new turn by duplicating the head so the prior head won't be updated & the new head will...
        this._snakeNodes.unshift(new Point(this.head.x, this.head.y));
        // ...ignoring the duplicated nodes when testing self collisions...
        addedExtraTurn = true;
      }
      // ...& updating the prior direction.
      this._lastDirection = d;
    }

    const rv = this.updateHead(d, playfield, addedExtraTurn);
    if (rv) {
      this._snakeNodes.splice(0, this._snakeNodes.length, ...backedUpState);
      if (grow) this._snakeLength--;
    }
    Snake.DEBUG_LEVEL.groupEnd(LOG);
    return rv;
  }

  static readonly STORES_SEGMENTS_ONLY = false;
  /**
   *
   * @param d
   * @param playfield The play area; screen collisions/wrapping will not be processed if this & `Snake.playfield` are both `undefined`.
   * @param [ignoreFirstSeg=false] Should the first segment be ignored for collision detection with self?
   * @returns A falsy value if the head was successfully updated, a truthy value if the snake died.
   */
  private updateHead(d: Direction, playfield?: RectInt, ignoreFirstSeg = false) {
    Snake.DEBUG_LEVEL.group(INFO, "Snake.updateHead(%o, %o, %o)", d, playfield, ignoreFirstSeg);
    const projectedPosition = Point.add(this.head, d);
    Snake.DEBUG_LEVEL.print(INFO, "Current Position: %o\nProjected Position: %o\nDirection: %o", this.head, projectedPosition, d);
    let intersection: Point[] | undefined | false = false;
    switch (this.config.wallBehavior) {
    case WallBehavior.wrap:
      Snake.DEBUG_LEVEL.print(INFO, "Do wrap");
      // Snake.DEBUG_LEVEL.groupEnd(INFO);
      // throw new Error("Wrapping not implemented");
      if ((playfield || this.playfield).findBorderIntersection(projectedPosition)) {
        const n = (playfield || this.playfield).wrap(projectedPosition);
        projectedPosition.x = n.x;
        projectedPosition.y = n.y;
      }
      break;
    case WallBehavior.endGame:
      intersection = (playfield || this.playfield).findBorderIntersection(projectedPosition);
      if (intersection) Snake.DEBUG_LEVEL.print(WARN, "Collided with wall");
      break;
    }
    // Check if the snake intersects with itself
    const checkSelfIntersection = Snake.STORES_SEGMENTS_ONLY
      ? () => {
        return (!ignoreFirstSeg
          ? this.segments
          : this.segments.slice(1))
          .find(e => projectedPosition.intersects(e[0]!, e[1]!));
      }
      : () => {
        const i = projectedPosition.indexIn(this.filledNodes);
        if (i >= 0) {
          return (!ignoreFirstSeg
            ? this.segments
            : this.segments.slice(1))
            .find(e => projectedPosition.intersects(e[0]!, e[1]!));
        }
      };
    const assignNewHead = Snake.STORES_SEGMENTS_ONLY
      ? () => {
        this.head.x = projectedPosition.x;
        this.head.y = projectedPosition.y;
      }
      : () => this._snakeNodes.unshift(projectedPosition);
    // TODO: Rule-out self-intersections on snakes with too few segments?
    intersection ||= /* (this.segments.length - (ignoreFirstSeg ? 1 : 0)) ? undefined : */ checkSelfIntersection();
    if (intersection) {
      Snake.DEBUG_LEVEL.print(WARN, "Collided on segment %o", intersection);
      Snake.DEBUG_LEVEL.groupEnd(INFO);
      return intersection;
    }
    // Update head
    assignNewHead();
    Snake.DEBUG_LEVEL.groupEnd(INFO);
  }

  // #region External Helpers
  // TODO: If direction matters
  // public findNodeDirection(node: Point) {
  //   const tNodes = this.filledNodes;
  //   if (tNodes.find(e => node.equals(e))) {

  //   }
  // }
  // #endregion External Helpers
}

export default Snake;
