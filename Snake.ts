import { Point, RectInt, Direction, Axis, type IPoint } from "./Point2d";
import { randomIndex, WallBehavior, type ISnakeConfig } from "./Types";
import { DEBUG, DebugLevel, ERROR, INFO, LOG, WARN } from "./DebugLevel";

/**
 * Stores all nodes
 */
class Snake {
  public static readonly DEBUG_LEVEL: DebugLevel = DebugLevel.INFO;
  private _snakeLength:               number;
  public get snakeLength(): number { return this._snakeLength; }

  // #region Initialization
  private constructor(private readonly config: ISnakeConfig, startingNodes: Point[], private readonly playfield: RectInt) {
    this._lastDirection = Direction.fromCardinalDisplacement(startingNodes[1]!, startingNodes[0]!)!; // this._lastDirection = this.config.startingDirection;
    this._snakeLength = this.config.startingLength!;
    this._snakeNodes = startingNodes.slice();
  }

  // public static fromNodes(config: ISnakeConfig, startingNodes: Point[]) {
  //   return new Snake(engine, startingNodes);
  // }

  private static readonly ALLOW_STARTING_NODES_ON_PERIMETER = true;
  private static isOnPerimeter(e: IPoint, playfield: RectInt) {
    return e.x > playfield.xMin && e.x < playfield.xMax - 1 && e.y > playfield.yMin && e.y < playfield.yMax - 1;
  }

  private static getInitialValidNodes(playfield: RectInt, claimedNodes?: IPoint[]) {
    if (this.ALLOW_STARTING_NODES_ON_PERIMETER) {
      if (claimedNodes) {
        return playfield.generatePointsWhere(e => !Point.included(e, claimedNodes));
      } else {
        return playfield.points;
      }
    } else {
      return playfield
        .generatePointsWhere(claimedNodes
          ? e => this.isOnPerimeter(e, playfield) && !Point.included(e, claimedNodes)
          : e => this.isOnPerimeter(e, playfield));
    }
  }

  private static findValidNeighborIndices(node: Readonly<IPoint>, validNodes: Readonly<IPoint[]>) {
    return Direction.directions
      .reduce((accumulator, direction) => {
        // const t = validNodes.findIndex(e => Point.add(node, c).equals(e));
        const neighbor = Point.add(node, direction), t = validNodes.findIndex(e => neighbor.equals(e));
        if (t !== -1) accumulator.push(t);
        return accumulator;
      }, [] as number[]);
  }

  // private static depthFirstStats(nodes: Point[], validNodes: IPoint[], desiredLength: number, options: Point2d[], optionSelectedIndex: number) {
  // }

  // private static dfProfiles: {[k:string]:number|string}[] = [];

  /**
   * This uses a simple depth-first search for generation that gets problematic
   * past a point, so we're limiting it to this long.
   */
  public static readonly MAX_GENERATED_LENGTH = 75;
  private static depthFirst_iterations = 0;
  private static depthFirst_maxLength = 0;
  private static depthFirst_longest:  Readonly<Point[]> = [];
  public static depthFirst_playfield: RectInt | undefined;
  private static depthFirst_failedOptions = new Map<string, number>();
  private static depthFirst_iterationLimit = 100000;
  private static depthFirst_depth = 0;
  /**
   * TODO: Add `initialValidOptions` for heuristics?
   * TODO: Add conditions for head node (has space)?
   * TODO: Change `nodes` to `startNode`?
   * TODO: Change `desiredLength` to `numNodesToAdd`?
   * @param nodes
   * @param validNodes
   * @param desiredLength
   * @returns
   */
  public static depthFirst(
    nodes: Point[],
    validNodes: IPoint[],
    desiredLength: number,
  ): { success: boolean; nodes: Point[]; validNodes: IPoint[] } {
    this.depthFirst_depth++;
    this.depthFirst_iterations++;
    this.DEBUG_LEVEL.do(
      LOG,
      (print) => {
        let css = "";
        if (nodes.length > this.depthFirst_maxLength) {
          this.depthFirst_maxLength = nodes.length;
          this.depthFirst_longest = nodes;
          css = "color: green; text-decoration: underline;";
        }
        print("depthFirst(%s nodes, %s validNodes, desiredLength: %s)\n\titerations: %s\n%c\tmax: %s", nodes.length, validNodes.length, desiredLength, this.depthFirst_iterations, css, this.depthFirst_maxLength);
      },
    );
    if (nodes.length === desiredLength) {
      this.DEBUG_LEVEL.do(INFO, (print) => {
        print("SUCCESS at %s iterations", this.depthFirst_iterations);
        this.depthFirst_iterations = this.depthFirst_maxLength = 0;
        this.depthFirst_longest = [];
      });
      this.depthFirst_depth--;
      return { success: true, nodes: nodes, validNodes: validNodes };
    }
    if (this.depthFirst_iterations >= this.depthFirst_iterationLimit) {
      this.DEBUG_LEVEL.do(WARN, (print) => {
        print("FAILURE: Exceeded cap of %s iterations (%s)", this.depthFirst_iterationLimit, this.depthFirst_iterations);
        /* this.depthFirst_iterations =  */this.depthFirst_maxLength = 0;
        this.depthFirst_longest = [];
      });
      this.DEBUG_LEVEL.debugger(DEBUG);
      this.depthFirst_depth--;
      return { success: false, nodes: nodes, validNodes: validNodes };
    }
    /* if (nodes.length < 1) {
      const nodeIndex = randomIndex(validNodes);
      // this.DEBUG_LEVEL.print(DEBUG, "Adding starting node at %s", validNodes[nodeIndex]);
      // TODO: Put in a loop.
      this.depthFirst_depth--;
      return this.depthFirst([Point.fromIPoint2d(validNodes[nodeIndex]!)], validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)), desiredLength);
    } */
    const options = nodes.length < 1
      ? Array.from(validNodes.keys())
      : this.findValidNeighborIndices(nodes.at(-1)!, validNodes);
    if (options.length < 1) {
      this.DEBUG_LEVEL.do(INFO, (print) => {
        print("FAILED: No options");
        if (this.depthFirst_playfield) DebugLevel.tableFromPointsAndPlayfield(nodes, this.depthFirst_playfield);
      });
      this.depthFirst_depth--;
      return { success: false, nodes: nodes, validNodes: validNodes };
    }
    // this.DEBUG_LEVEL.print(DEBUG, "%s options", options.length);
    do {
      // this.DEBUG_LEVEL.print(DEBUG, "Option %s", i);
      // Randomize the selection to stop march towards upper-left & prevent always returning to a dead-end path
      const nodeIndex = options.splice(randomIndex(options), 1)[0]!,
            node = validNodes[nodeIndex]!,
            vnCopy = validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)),
            result = this.depthFirst(nodes.concat([Point.fromIPoint2d(node)]), vnCopy, desiredLength);
      if (result.success) { this.depthFirst_depth--; return result; }
      // TODO: Analyze failed path for heuristics?
    } while (options.length > 0 && this.depthFirst_iterations < this.depthFirst_iterationLimit);
    // this.DEBUG_LEVEL.print(DEBUG, "FAILED: All options failed");
    if (--this.depthFirst_depth === 0) this.depthFirst_iterations = 0;
    return { success: false, nodes: nodes, validNodes: validNodes };
  }

  private static removeSurplusNodes(nodes: Point[]) {
    for (let i = 1; i < nodes.length - 1; i++) {
      if (nodes[i + 1]!.matchingAxes(nodes[i]!)[0] == nodes[i]!.matchingAxes(nodes[i - 1]!)[0]) {
        this.DEBUG_LEVEL.print(LOG, "Removing redundant segment");
        nodes.splice(i, 1);
      }
    }
    return nodes;
  }

  public static genNodesV2(config: Readonly<ISnakeConfig>, playfield: RectInt, claimedNodes?: IPoint[]) {
    this.DEBUG_LEVEL.group(ERROR, "genNodesV2(%o, %o, %o)", config, playfield, claimedNodes);
    if ((config.startingLength || 0) < 2) {
      this.DEBUG_LEVEL.groupEnd(ERROR);
      throw new Error(`Must have a length of 2 or more; was ${config.startingLength}.`);
    }
    const validNodes = this.getInitialValidNodes(playfield, claimedNodes),
          nodes: Point[] = [];
    function removeAndAdd(index: number) { nodes.push(Point.fromIPoint2d(validNodes.splice(index, 1)[0]!)); }
    removeAndAdd(randomIndex(validNodes));

    const result = this.depthFirst(nodes, validNodes, config.startingLength!);
    if (result.success) {
      this.DEBUG_LEVEL.groupEnd(ERROR);
      return this.removeSurplusNodes(result.nodes);
    }
    this.DEBUG_LEVEL.print(ERROR, "Failed to get a length of %s from %s x %s grid (Area: %s)", config.startingLength!, playfield.width, playfield.height, playfield.width * playfield.height);
    this.DEBUG_LEVEL.groupEnd(ERROR);
    this.DEBUG_LEVEL.debugger(ERROR);
    throw Error();

    this.hasInvalidState(nodes);
    this.DEBUG_LEVEL.print(INFO, "Start (%s): %o", nodes.length, nodes);
  }

  public static attemptToGenerateNodes(config: Readonly<ISnakeConfig>, playfield: RectInt, claimedNodes?: IPoint[]) {
    this.DEBUG_LEVEL.group(ERROR, "attemptToGenerateNodes(%o, %o, %o)", config, playfield, claimedNodes);
    if ((config.startingLength || 0) < 2) {
      this.DEBUG_LEVEL.groupEnd(ERROR);
      throw new Error("Must have a length of 2 or more.");
    }
    const validNodes = this.getInitialValidNodes(playfield, claimedNodes),
          nodes: Point[] = [];
    // nodes.push(Point.fromIPoint2d(validNodes.splice(randomIndex(validNodes), 1)[0]!));
    const result = this.depthFirst(nodes, validNodes, config.startingLength!);
    if (result.success) {
      return this.removeSurplusNodes(result.nodes);
    } else {
      this.DEBUG_LEVEL.print(ERROR, "Failed to get a length of %s from %s x %s grid (Area: %s)", config.startingLength!, playfield.width, playfield.height, playfield.width * playfield.height);
      debugger;
      throw Error();
    }

    this.hasInvalidState(nodes);
    this.DEBUG_LEVEL.print(INFO, "Start (%s): %o", nodes.length, nodes);
    this.DEBUG_LEVEL.groupEnd(ERROR);
    return nodes;
  }

  public static fromPreferences(config: Readonly<ISnakeConfig>, playfield: RectInt, claimedNodes?: IPoint[]) {
    if (config.startingNodes) return new Snake(config, config.startingNodes, playfield);
    // return new Snake(config, this.attemptToGenerateNodes(config, playfield, claimedNodes), playfield);
    if (
      !config.startingLength
      || config.startingLength > this.MAX_GENERATED_LENGTH
      || config.startingLength < 2
    ) {
      throw new Error("Invalid Config");
    }
    let rv: Point[] | Array<undefined | Point[]> = [];
    for (let i = 0; !rv[0] && i < 20; i++) {
      // rv = this.attemptToGenerateNodes(config, playfield, claimedNodes);
      rv = this.genNodesV2(config, playfield, claimedNodes);
    }
    if (!rv[0]) {
      throw new Error(`Only Generated ${(rv[1] as Point[]).length} of ${config.startingLength!}`);
    }
    return new Snake(config, rv as Point[], playfield);
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
  /** Nodes other than the head & tail. */
  public get bodyTurns() { return this._snakeNodes.slice(1, this._snakeNodes.length - 2); }
  /** A shallow copy of `_snakeNodes`. */
  public get snakeNodesDebug() { return this._snakeNodes.slice(); }

  public get filledNodes(): Point[] {
    if (!Snake.STORES_SEGMENTS_ONLY) return this._snakeNodes.slice();
    // return this._snakeNodes.reduce((acc, c) => {
    const rv = this._snakeNodes.reduce((acc, c) => {
      /** The previous point */
      const p = acc.at(-1)!;
      if (p.equals(c)) return acc;
      const deltaAxis = p.x === c.x ? (p.y === c.y ? undefined : Axis.y) : Axis.x;
      if (deltaAxis === undefined) return acc;
      const [pDeltaAxis, cDeltaAxis] = [p.getAxis(deltaAxis), c.getAxis(deltaAxis)];
      // for (let i = pDeltaAxis; cDeltaAxis > pDeltaAxis ? i <= cDeltaAxis : i >= cDeltaAxis; cDeltaAxis > pDeltaAxis ? i++ : i--) {
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
  public get segments(): Array<Point[]> {
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
    if (this._snakeNodes.length < 2) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get head segment; less than 2 nodes.");
      Snake.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this._snakeNodes);
      return undefined;
    }
    return this._snakeNodes.slice(0, 2);
  }

  /**
   * 0: Penultimate Node
   * 1: Tail Node
   */
  private get tailSegment() {
    if (this._snakeNodes.length < 2) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get tail segment; less than 2 nodes.");
      Snake.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this._snakeNodes);
      return undefined;
    }
    return this._snakeNodes.slice(-2);
  }
  // #endregion Segments

  // #region Directions
  public get facingDirections(): Direction[] {
    /* return this._snakeNodes.map((e, i) => {
      if (i === 0) return this.lastDirection;
      return Direction.fromCardinalDisplacement(this._snakeNodes[i - 1]!, e)!;
    }); */
    return this.segments.map(e => Direction.fromCardinalDisplacement(e[1]!, e[0]!)!);
  }

  private static directionFromPoints(s: Point[] | undefined, label: string) {
    const d = s ? Direction.fromCardinalDisplacement(s[1]!, s[0]!) : undefined;
    if (!d) {
      Snake.DEBUG_LEVEL.print(WARN, "Can't get %s direction; can't get %s %s", label.toLowerCase(), label.toLowerCase(), s ? "direction" : "segment");
      Snake.DEBUG_LEVEL.print(DEBUG, "\t%s segment: %o", label, s);
      Snake.DEBUG_LEVEL.debugger(DEBUG);
    }
    return d!;
  }

  public get headDirection(): Direction {
    return Snake.directionFromPoints(this.headSegment, "Head");
  }

  public get tailDirection(): Direction {
    return Snake.directionFromPoints(this.tailSegment, "Tail");
  }
  // #endregion Directions

  public get hasInvalidState(): boolean {
    // return this._snakeNodes.filter((e, i) => i + 1 === this._snakeNodes.length || e.matchingAxes(this._snakeNodes[i + 1]!).length > 0).length !== this._snakeNodes.length;
    return false;
  }

  /** @deprecated */
  public static hasInvalidState(_nodes: Point[]) {
    /* if (nodes.filter((e, i) => i + 1 === nodes.length || e.matchingAxes(nodes[i + 1]!).length > 0).length !== nodes.length) {
      console.warn("Invalid State");
      Snake.DEBUG_LEVEL.debugger(DEBUG);
      return true;
    } */
    return false;
  }
  // #endregion Accessors

  /**
   *
   * @param d The direction the snake is moving in.
   * @param grow Show the snake be growing?
   * @param playfield The play area; screen collisions/wrapping will not be processed if this & `Snake.playfield` are both `undefined`.
   * @returns The line segment of collision if the snake collided with itself (or the wall if in that mode), `undefined` if it stayed alive.
   */
  public advance(d: Direction, grow = false, playfield: RectInt = this.playfield) {
    Snake.DEBUG_LEVEL.group(LOG, "advance(%o, %o, %o)", d, grow, playfield);
    Snake.DEBUG_LEVEL.print(LOG, "Initial nodes (%s): %o", this._snakeNodes.length, this._snakeNodes);
    Snake.DEBUG_LEVEL.do(LOG, () => this._snakeNodes.forEach(e => console.log(e)));
    let addedExtraTurn = false;
    if (this.hasInvalidState) Snake.DEBUG_LEVEL.debugger(DEBUG);
    // If a pellet wasn't eaten...
    if (!grow) {
      Snake.DEBUG_LEVEL.print(DEBUG, "Not growing; handling tail advancement");
      // ...& the tail is 1 tile away from the next turn...
      if (Point.subtract(this.tail, this._snakeNodes.at(-2)!).magnitude() === 1) {
        Snake.DEBUG_LEVEL.print(DEBUG, "needs to move tail");
        if (this._snakeNodes.length == 2 || this.hasInvalidState) Snake.DEBUG_LEVEL.debugger(DEBUG);
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
    const rv = this.updateHead(d, playfield, addedExtraTurn);
    Snake.DEBUG_LEVEL.groupEnd(LOG);
    if (this.hasInvalidState) Snake.DEBUG_LEVEL.debugger(DEBUG);
    return rv;
  }

  static readonly STORES_SEGMENTS_ONLY = true;
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
      Snake.DEBUG_LEVEL.groupEnd(INFO);
      throw new Error("Wrapping not implemented");
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
        return (!ignoreFirstSeg
          ? this.segments
          : this.segments.slice(1))
          .find(e => projectedPosition.intersects(e[0]!, e[1]!));
      };
    const assignNewHead = Snake.STORES_SEGMENTS_ONLY
      ? () => {
        this.head.x = projectedPosition.x;
        this.head.y = projectedPosition.y;
      }
      : () => this._snakeNodes.unshift(projectedPosition);
    intersection ||= (this.segments.length - (ignoreFirstSeg ? 1 : 0)) ? undefined : checkSelfIntersection();
    if (intersection) {
      Snake.DEBUG_LEVEL.print(WARN, "Collided on segment %o", intersection);
      Snake.DEBUG_LEVEL.groupEnd(INFO);
      return intersection;
    }
    // Update head
    assignNewHead();
    Snake.DEBUG_LEVEL.groupEnd(INFO);
  }
}

export default Snake;
