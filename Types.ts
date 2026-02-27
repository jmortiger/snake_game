import { DEBUG, DebugLevel, INFO, LOG, WARN } from "./DebugLevel";
import { Direction, Point, RectInt, type IPoint } from "./Point2d";
import Snake from "./Snake";

/**
 * Defines how the snake reacts when moving into the bounds of the play area.
 */
enum WallBehavior {
  endGame,
  /**
   * TODO: Implement
   */
  wrap,
}
/**
 * Defines how the snake died.
 */
enum CauseOfDeath {
  selfCollision,
  wallCollision,
}
type RetDepthFirst = { success: boolean; nodes: Point[]; validNodes: IPoint[] };
class NodeGeneration {
  public static DEBUG_LEVEL = DebugLevel.INFO;
  private static findValidNeighborIndices(node: Readonly<IPoint>, validNodes: Readonly<IPoint[]>) {
    return Direction.directions
      .reduce((accumulator, direction) => {
        // const t = validNodes.findIndex(e => Point.add(node, c).equals(e));
        const neighbor = Point.add(node, direction), t = validNodes.findIndex(e => neighbor.equals(e));
        if (t !== -1) accumulator.push(t);
        return accumulator;
      }, [] as number[]);
  }

  public static generateFacingDirection(
    // nodes: Point[],
    validNodes: IPoint[],
    desiredLength: number,
    direction: Direction,
  ) {
    const newDesiredLength = desiredLength - 2;
    const starts = validNodes.reduce<{ nodes: Point[]; validNodes: IPoint[] }[]>((acc, potentialHead) => {
      const secondNodeIndex = validNodes.findIndex(e => Point.equals(Point.subtract(potentialHead, direction), e));
      if (secondNodeIndex >= 0) acc.push({
        nodes:      [Point.fromIPoint2d(potentialHead), Point.fromIPoint2d(validNodes[secondNodeIndex]!)],
        validNodes: validNodes.slice(0, secondNodeIndex).concat(validNodes.slice(secondNodeIndex + 1)),
      });
      return acc;
    }, []);
    let rv: RetDepthFirst, best: RetDepthFirst | undefined;
    do {
      const args = starts.splice(randomIndex(starts), 1)[0]!;
      rv = this.depthFirst(args.nodes, args.validNodes, newDesiredLength);
      if (!best || rv.success || rv.nodes.length > rv.nodes.length) best = rv;
    } while (!rv.success && starts.length > 0);
    return rv;
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
  ): RetDepthFirst {
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
}

interface INodeConfig {
  get direction(): Direction;
  get count(): number;
  get nodes(): Point[];
}
class PreMadeNodeConfig implements INodeConfig {
  constructor(public nodes: Point[]) {}
  get direction(): Direction { return Direction.fromCardinalDisplacement(this.nodes[1]!, this.nodes[0]!)!; }
  get count(): number { return this.nodes.length; }
}
class ParameterizedNodeConfig implements INodeConfig {
  public direction: Direction;
  public nodes:     Point[];
  constructor(public count: number, validNodes: IPoint[], _direction?: Direction) {
    if (_direction) {
      this.direction = _direction;
      this.nodes = NodeGeneration.generateFacingDirection(validNodes, count, this.direction).nodes;
    } else {
      this.nodes = NodeGeneration.depthFirst([], validNodes, count).nodes;
      this.direction = Direction.fromCardinalDisplacement(this.nodes[1]!, this.nodes[0]!)!;
    }
  }
}
interface ISnakeConfig {
  wallBehavior:       WallBehavior;
  startingLength:     number;
  startingDirection?: Direction;
  startingNodes?:     Point[];
};
interface IGridObjectConfig {
  startingObjs: number | IPoint[];
  maxObjs:      number;
}
interface IEngineConfig extends ISnakeConfig {
  gridWidth:             number;
  gridHeight:            number;
  pelletConfig:          IGridObjectConfig;
  obstacleConfig:        IGridObjectConfig;
  millisecondsPerUpdate: number;
};
class EngineConfig implements IEngineConfig {
  public constructor(
    public gridWidth: number,
    public gridHeight: number,
    public pelletConfig: IGridObjectConfig,
    public obstacleConfig: IGridObjectConfig,
    public millisecondsPerUpdate: number,
    public wallBehavior: WallBehavior,
    public startingLength: number,
    public startingDirection?: Direction,
    public startingNodes?: Point[],
  ) {}

  public static fromObj(i: IEngineConfig) {
    return new EngineConfig(
      i.gridWidth,
      i.gridHeight,
      i.pelletConfig,
      i.obstacleConfig,
      i.millisecondsPerUpdate,
      i.wallBehavior,
      i.startingLength,
      i.startingDirection,
      i.startingNodes,
    );
  }

  public static readonly defaultConfig: Readonly<IEngineConfig> = Object.freeze({
    gridWidth:             10,
    gridHeight:            10,
    startingDirection:     Direction.up,
    startingLength:        5,
    wallBehavior:          WallBehavior.endGame,
    pelletConfig:          { startingObjs: 1, maxObjs: 1 },
    obstacleConfig:        { startingObjs: 0, maxObjs: 0 },
    millisecondsPerUpdate: 1 / 60,
    startingNodes:         undefined,
  });

  public static isValidConfig(c: IEngineConfig): boolean {
    return this.hasValidDimensions(c)
      && (c.startingLength || 0) > 2
      && c.startingLength < Snake.MAX_GENERATED_LENGTH

      && this.hasValidObstacleConfig(c)

      && this.hasValidPelletConfig(c)

      && (c.startingLength + c.pelletConfig.maxObjs + c.obstacleConfig.maxObjs) <= (c.gridWidth * c.gridHeight)
      && c.millisecondsPerUpdate > 0
      && (!c.startingNodes || (
        c.startingNodes.length === c.startingLength
        && (!c.startingDirection || (c.startingDirection === Direction.fromCardinalDisplacement(c.startingNodes[1]!, c.startingNodes[0]!)))
      ));
  }

  public static hasValidDimensions(c: IEngineConfig) {
    return Number.isSafeInteger(c.gridWidth)
      && Number.isSafeInteger(c.gridHeight)
      && c.gridWidth > 2
      && c.gridHeight > 2;
  }

  private static hasValidIGridObjectConfig(c: IGridObjectConfig, minObjs: number, maxFreeSpaces?: number) {
    return c.maxObjs >= minObjs
      && c.maxObjs >= (c.startingObjs instanceof Array ? c.startingObjs.length : c.startingObjs)
      && (c.startingObjs instanceof Array ? c.startingObjs.length : c.startingObjs) >= 0
      && (!maxFreeSpaces || c.maxObjs < maxFreeSpaces);
  }

  /**
   * Assumes `hasValidDimensions`.
   * @param c
   * @returns
   * @see EngineConfig.hasValidDimensions
   */
  public static hasValidPelletConfig(c: IEngineConfig) {
    return this.hasValidIGridObjectConfig(c.pelletConfig, 1, c.gridWidth * c.gridHeight - c.startingLength);
  }

  /**
   * Assumes `hasValidDimensions`.
   * @param c
   * @returns
   * @see EngineConfig.hasValidDimensions
   */
  public static hasValidObstacleConfig(c: IEngineConfig) {
    return this.hasValidIGridObjectConfig(c.obstacleConfig, 0, c.gridWidth * c.gridHeight - c.startingLength);
  }

  /**
   * Calls
   * @param c
   * @returns
   */
  public static hasValidSnakeConfig(c: IEngineConfig) {
    return (c.startingLength || 0) > 2
      && c.startingLength < Snake.MAX_GENERATED_LENGTH;
  }
};

function randomIndex(a: Readonly<Array<unknown>>) {
  return Math.floor(a.length * Math.random());
}

export type { IEngineConfig, ISnakeConfig };
export {
  EngineConfig,
  WallBehavior,
  CauseOfDeath,
  /* DebugLevel,
  NONE,
  ERROR,
  WARN,
  INFO,
  LOG,
  DEBUG, */
  randomIndex,
};
