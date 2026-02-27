import { Point, RectInt as Rect, Direction, Axis, type IPoint, Point2d } from "./Point2d";
import { SnakeEngine } from "./SnakeEngine";
import { randomIndex, WallBehavior, type ISnakeConfig } from "./Types";
import { DEBUG, DebugLevel, ERROR, INFO, LOG, WARN } from "./DebugLevel";

/**
 * Stores turns
 */
class SnakeDeprecated {
  public static readonly DEBUG_LEVEL: DebugLevel = DebugLevel.LOG;
  private _snakeLength:               number;
  public get snakeLength(): number { return this._snakeLength; }

  // #region Initialization
  private constructor(private readonly config: ISnakeConfig, startingNodes: Point[], private readonly playfield: Rect) {
    this._lastDirection = this.config.startingDirection || Direction.fromCardinalDisplacement(startingNodes[1]!, startingNodes[0]!)!;
    this._snakeLength = this.config.startingLength!;
    this._snakeNodes = startingNodes.slice();
  }

  // public static fromNodes(config: ISnakeConfig, startingNodes: Point[]) {
  //   return new SnakeDeprecated(engine, startingNodes);
  // }

  private static readonly ALLOW_STARTING_NODES_ON_PERIMETER = true;
  private static isOnPerimeter(e: IPoint, playfield: Rect) {
    return e.x > playfield.xMin && e.x < playfield.xMax - 1 && e.y > playfield.yMin && e.y < playfield.yMax - 1;
  }

  private static getInitialValidNodes(playfield: Rect, claimedNodes?: IPoint[]) {
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

  private static depthFirst_iterations = 0;
  private static depthFirst_maxLength = 0;
  private static depthFirst_longest:   Point[] = [];
  private static depthFirst_playfield: Rect | undefined;
  private static depthFirst_isBoxedIn: boolean = false;
  public static depthFirst(nodes: Point[], validNodes: IPoint[], desiredLength: number, onlySnake = true): { success: boolean; nodes: Point[] } {
    let b = false;
    this.DEBUG_LEVEL.do(
      LOG,
      (print) => {
        let css = "", s = "";
        if (nodes.length > this.depthFirst_maxLength) {
          this.depthFirst_maxLength = nodes.length;
          this.depthFirst_longest = nodes;
          // s = `\n\tNew longest: ${this.depthFirst_longest}`;
          css = "color: green; text-decoration: underline;";
          b = true;
          print("depthFirst(l = %s, l = %s, %s): iterations: %s,%c max: %s%c%s", nodes.length, validNodes.length, desiredLength, ++this.depthFirst_iterations, css, this.depthFirst_maxLength, "color: initial; text-decoration: initial;", s);
          if (s.length > 0 && this.depthFirst_playfield) DebugLevel.tableFromPointsAndPlayfield(nodes, this.depthFirst_playfield);
        }
      },
    );
    if (nodes.length === desiredLength) {
      this.DEBUG_LEVEL.do(LOG, (print) => {
        print("SUCCESS at %s iterations", this.depthFirst_iterations);
        this.depthFirst_iterations = this.depthFirst_maxLength = 0;
        this.depthFirst_longest = [];
      });
      return { success: true, nodes: nodes };
    }
    if (nodes.length < 1) {
      const nodeIndex = randomIndex(validNodes);
      // this.DEBUG_LEVEL.print(DEBUG, "Adding starting node at %s", validNodes[nodeIndex]);
      // TODO: Put in a loop.
      return this.depthFirst([Point.fromIPoint2d(validNodes[nodeIndex]!)], validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)), desiredLength);
    }
    const prior = nodes.at(-1)!,
          options = Direction.directions
            .reduce((p, c) => {
              // const t = validNodes.findIndex(e => Point.add(prior, c).equals(e));
              const d = Point.add(prior, c), t = validNodes.findIndex(e => d.equals(e));
              if (t !== -1) p.push(t);
              return p;
            }, [] as number[]);
    if (options.length < 1) {
      // this.DEBUG_LEVEL.print(DEBUG, "FAILED: No options");
      return { success: false, nodes: nodes };
    }
    if (onlySnake) {
      if (options.length === 1) {
        this.depthFirst_isBoxedIn = true;
      }
      if (this.depthFirst_isBoxedIn) {
        debugger;
      }
    }
    // this.DEBUG_LEVEL.print(DEBUG, "%s options", options.length);
    for (let i = 0; i < options.length; i++) {
      // this.DEBUG_LEVEL.print(DEBUG, "Option %s", i);
      const nodeIndex = options[i]!,
            node = validNodes[nodeIndex]!,
            vnCopy = validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)),
            result = this.depthFirst(nodes.concat([Point.fromIPoint2d(node)]), vnCopy, desiredLength);
      if (result.success) return result;
    }
    // this.DEBUG_LEVEL.print(DEBUG, "FAILED: All options failed");
    return { success: false, nodes: nodes };
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

  public static genNodesV2(config: Readonly<ISnakeConfig>, playfield: Rect, claimedNodes?: IPoint[]) {
    this.DEBUG_LEVEL.group(ERROR, "genNodesV2(%o, %o, %o)", config, playfield, claimedNodes);
    if ((config.startingLength || 0) < 2) {
      this.DEBUG_LEVEL.groupEnd(ERROR);
      throw new Error("Must have a length of 2 or more.");
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
    debugger;
    throw Error();

    this.hasInvalidState(nodes);
    this.DEBUG_LEVEL.print(INFO, "Start (%s): %o", nodes.length, nodes);
  }

  public static attemptToGenerateNodes(config: Readonly<ISnakeConfig>, playfield: Rect, claimedNodes?: IPoint[]) {
    this.DEBUG_LEVEL.group(ERROR, "attemptToGenerateNodes(%o, %o, %o)", config, playfield, claimedNodes);
    if ((config.startingLength || 0) < 2) {
      this.DEBUG_LEVEL.groupEnd(ERROR);
      throw new Error("Must have a length of 2 or more.");
    }
    // const validNodes = playfield
    //         .generatePointsWhere(claimedNodes
    //           ? e => this.isOnPerimeter(e, playfield) && !Point.included(e, claimedNodes)
    //           : e => this.isOnPerimeter(e, playfield)),
    const validNodes = this.getInitialValidNodes(playfield, claimedNodes),
          nodes: Point[] = [];
    function removeAndAdd(index: number) { nodes.push(Point.fromIPoint2d(validNodes.splice(index, 1)[0]!)); }
    removeAndAdd(randomIndex(validNodes));
    // // for (let i = 1, wasReversed = false, undoStack: Point[] = []; i < config.startingLength!; i++) {
    // for (let i = 1, wasReversed = false; i < config.startingLength!; i++) {
    //   const prior = nodes.at(-1)!,
    //         options = Direction.directions
    //           .map(e => Point.add(prior, e))
    //           .map(e => validNodes.findIndex(e1 => e.equals(e1)))
    //           .filter(e => e !== -1);
    //   // Check if there are any valid nodes left or if it's run into a corner.
    //   if (options.length < 1) {
    //     if (wasReversed) {
    //       this.DEBUG_LEVEL.print(ERROR, "No valid next option in either direction.\n\tGenerated %s of %s: %o", nodes.length, config.startingLength!, nodes);
    //       this.DEBUG_LEVEL.groupEnd(ERROR);
    //       this.DEBUG_LEVEL.debugger(DEBUG);
    //       return [undefined, nodes];
    //       // if (undoStack.length === 0) {
    //       //   this.DEBUG_LEVEL.print(WARN, "No valid next option in either direction.\n\tGenerated %s of %s: %o", nodes.length, config.startingLength!, nodes);
    //       //   nodes.reverse();
    //       // }
    //       // this.DEBUG_LEVEL.print(WARN, "Undoing addition of %o", nodes.at(-1));
    //       // undoStack.push(nodes.pop()!);
    //     }
    //     this.DEBUG_LEVEL.print(WARN, "No valid next option; reversing & trying again.");
    //     this.DEBUG_LEVEL.debugger(DEBUG);
    //     nodes.reverse();
    //     wasReversed = true;
    //     i--;
    //     continue;
    //   }
    //   wasReversed = false;
    //   // undoStack.splice(0);
    //   removeAndAdd(options[randomIndex(options)]!);
    //   // // If the final 3 nodes form a straight line, then ditch the middle one.
    //   // if (i + 1 >= 3 && nodes.at(-1)!.matchingAxes(nodes.at(-2)!)[0] == nodes.at(-2)!.matchingAxes(nodes.at(-3)!)[0]) {
    //   //   this.DEBUG_LEVEL.print(LOG, "Removing redundant segment");
    //   //   nodes.splice(nodes.length - 2, 1);
    //   // }
    // }
    // // If the prior, current, & next node form a straight line, then ditch the middle one.
    // for (let i = 1; i < nodes.length - 1; i++) {
    //   if (nodes[i + 1]!.matchingAxes(nodes[i]!)[0] == nodes[i]!.matchingAxes(nodes[i - 1]!)[0]) {
    //     this.DEBUG_LEVEL.print(LOG, "Removing redundant segment");
    //     nodes.splice(i, 1);
    //   }
    // }

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

  public static fromPreferences(config: Readonly<ISnakeConfig>, playfield: Rect, claimedNodes?: IPoint[]) {
    // return new SnakeDeprecated(config, this.attemptToGenerateNodes(config, playfield, claimedNodes), playfield);
    let rv: Point[] | Array<undefined | Point[]> = [];
    for (let i = 0; !rv[0] && i < 20; i++) {
      // rv = this.attemptToGenerateNodes(config, playfield, claimedNodes);
      rv = this.genNodesV2(config, playfield, claimedNodes);
    }
    if (!rv[0]) {
      throw new Error(`Only Generated ${(rv[1] as Point[]).length} of ${config.startingLength!}`);
    }
    return new SnakeDeprecated(config, rv as Point[], playfield);
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
      SnakeDeprecated.DEBUG_LEVEL.group(INFO, "SnakeDeprecated.filledNodes: Failed to add all points");
      SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "\tSnake Nodes: %o\n\tGenerated Nodes: %o", this._snakeNodes, rv);
      SnakeDeprecated.DEBUG_LEVEL.groupEnd(INFO);
      SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
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
      SnakeDeprecated.DEBUG_LEVEL.print(WARN, "Can't get head segment; less than 2 nodes.");
      SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this._snakeNodes);
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
      SnakeDeprecated.DEBUG_LEVEL.print(WARN, "Can't get tail segment; less than 2 nodes.");
      SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "\tNodes: %o", this._snakeNodes);
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
    return this.segments.map(e => Direction.fromCardinalDisplacement(e[0]!, e[1]!)!);
  }

  private static directionFromPoints(s: Point[] | undefined, label: string) {
    const d = s ? Direction.fromCardinalDisplacement(s[0]!, s[1]!) : undefined;
    if (!d) {
      SnakeDeprecated.DEBUG_LEVEL.print(WARN, "Can't get %s direction; can't get %s %s", label.toLowerCase(), label.toLowerCase(), s ? "direction" : "segment");
      SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "\t%s segment: %o", label, s);
      SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
    }
    return Direction.fromCardinalDisplacement(s![0]!, s![1]!)!;
  }

  public get headDirection(): Direction {
    return SnakeDeprecated.directionFromPoints(this.headSegment, "Head");
  }

  public get tailDirection(): Direction {
    return SnakeDeprecated.directionFromPoints(this.tailSegment, "Tail");
  }
  // #endregion Directions

  public get hasInvalidState(): boolean {
    // return this._snakeNodes.filter((e, i) => i + 1 === this._snakeNodes.length || e.matchingAxes(this._snakeNodes[i + 1]!).length > 0).length !== this._snakeNodes.length;
    return false;
  }

  public static hasInvalidState(nodes: Point[]) {
    /* if (nodes.filter((e, i) => i + 1 === nodes.length || e.matchingAxes(nodes[i + 1]!).length > 0).length !== nodes.length) {
      console.warn("Invalid State");
      SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
      return true;
    } */
    return false;
  }
  // #endregion Accessors

  /**
   *
   * @param d The direction the snake is moving in.
   * @param grow Show the snake be growing?
   * @param playfield The play area; screen collisions/wrapping will not be processed if this & `SnakeDeprecated.playfield` are both `undefined`.
   * @returns The line segment of collision if the snake collided with itself (or the wall if in that mode), `undefined` if it stayed alive.
   */
  public advance(d: Direction, grow = false, playfield: Rect = this.playfield) {
    SnakeDeprecated.DEBUG_LEVEL.group(LOG, "advance(%o, %o, %o)", d, grow, playfield);
    SnakeDeprecated.DEBUG_LEVEL.print(LOG, "Initial nodes (%s): %o", this._snakeNodes.length, this._snakeNodes);
    SnakeDeprecated.DEBUG_LEVEL.do(LOG, () => this._snakeNodes.forEach(e => console.log(e)));
    let addedExtraTurn = false;
    if (this.hasInvalidState) SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
    // If a pellet wasn't eaten...
    if (!grow) {
      SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "Not growing; handling tail advancement");
      // ...& the tail is 1 tile away from the next turn...
      if (Point.subtract(this.tail, this._snakeNodes.at(-2)!).magnitude() === 1) {
        SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "needs to move tail");
        if (this._snakeNodes.length == 2 || this.hasInvalidState) SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
        // ...remove the tail
        const oldTail = this._snakeNodes.pop()!;
        SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "Removed tail node\nOld: %o\nNew: %o", oldTail, this.tail);
      } else { // Otherwise, slide the tail 1 unit in the direction it's going.
        if (!this.tailDirection) SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
        SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "Sliding tail node (%o) towards %o", this.tail, this.tailDirection);
        this.tail.add(this.tailDirection);
        SnakeDeprecated.DEBUG_LEVEL.print(DEBUG, "New tail position: %o", this.tail);
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
    SnakeDeprecated.DEBUG_LEVEL.groupEnd(LOG);
    if (this.hasInvalidState) SnakeDeprecated.DEBUG_LEVEL.debugger(DEBUG);
    return rv;
  }

  /**
   *
   * @param d
   * @param playfield The play area; screen collisions/wrapping will not be processed if this & `SnakeDeprecated.playfield` are both `undefined`.
   * @param [ignoreFirstSeg=false] Should the first segment be ignored for collision detection with self?
   * @returns A falsy value if the head was successfully updated, a truthy value if the snake died.
   */
  private updateHead(d: Direction, playfield?: Rect, ignoreFirstSeg = false) {
    SnakeDeprecated.DEBUG_LEVEL.group(INFO, "SnakeDeprecated.updateHead");
    const projectedPosition = Point.add(this.head, d);
    SnakeDeprecated.DEBUG_LEVEL.print(INFO, "Current Position: %o\nProjected Position: %o\nDirection: %o", this.head, projectedPosition, d);
    let intersection: Point[] | undefined | false = false;
    switch (this.config.wallBehavior) {
    case WallBehavior.wrap:
      SnakeDeprecated.DEBUG_LEVEL.print(INFO, "Do wrap");
      SnakeDeprecated.DEBUG_LEVEL.groupEnd(INFO);
      throw new Error("Wrapping not implemented");
    case WallBehavior.endGame:
      intersection = this.playfield.findBorderIntersection(projectedPosition);
      if (intersection) SnakeDeprecated.DEBUG_LEVEL.print(WARN, "Collided with wall");
      break;
    }
    // Check if the snake intersects with itself
    intersection ||= (!ignoreFirstSeg
      ? this.segments
      : this.segments.slice(1))
      .find(e => projectedPosition.intersects(e[0]!, e[1]!));
    if (intersection) {
      SnakeDeprecated.DEBUG_LEVEL.print(WARN, "Collided on segment %o", intersection);
      SnakeDeprecated.DEBUG_LEVEL.groupEnd(INFO);
      return intersection;
    }
    this.head.x = projectedPosition.x;
    this.head.y = projectedPosition.y;
    SnakeDeprecated.DEBUG_LEVEL.groupEnd(INFO);
  }
}